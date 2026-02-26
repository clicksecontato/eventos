import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'controle-eventos';

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface FileMetadata {
  id: string;
  userId: string;
  eventoId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  s3Key: string;
  url: string;
  dataUpload: Date;
}

export class S3Service {
  private sanitizePathSegment(segment: string): string {
    if (!segment || typeof segment !== 'string') {
      throw new Error('Segmento de caminho inválido');
    }
    // Remove caracteres inválidos e espaços, mantém apenas alfanuméricos, hífen e underscore
    return segment.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/\s+/g, '_');
  }

  private generateS3Key(userId: string, eventoId: string, fileName: string): string {
    if (!userId || !eventoId || !fileName) {
      throw new Error('userId, eventoId e fileName são obrigatórios');
    }

    const timestamp = Date.now();
    const sanitizedUserId = this.sanitizePathSegment(userId);
    const sanitizedEventoId = this.sanitizePathSegment(eventoId);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (!sanitizedFileName || sanitizedFileName.trim() === '') {
      throw new Error('Nome do arquivo inválido após sanitização');
    }

    return `users/${sanitizedUserId}/eventos/${sanitizedEventoId}/${timestamp}_${sanitizedFileName}`;
  }

  private generateS3KeyPagamento(
    userId: string, 
    eventoId: string, 
    pagamentoId: string, 
    fileName: string
  ): string {
    if (!userId || !eventoId || !pagamentoId || !fileName) {
      throw new Error('userId, eventoId, pagamentoId e fileName são obrigatórios');
    }

    const timestamp = Date.now();
    const sanitizedUserId = this.sanitizePathSegment(userId);
    const sanitizedEventoId = this.sanitizePathSegment(eventoId);
    const sanitizedPagamentoId = this.sanitizePathSegment(pagamentoId);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (!sanitizedFileName || sanitizedFileName.trim() === '') {
      throw new Error('Nome do arquivo inválido após sanitização');
    }

    return `users/${sanitizedUserId}/eventos/${sanitizedEventoId}/pagamentos/${sanitizedPagamentoId}/comprovantes/${timestamp}_${sanitizedFileName}`;
  }

  private generateS3KeyCusto(
    userId: string,
    eventoId: string,
    custoId: string,
    fileName: string
  ): string {
    if (!userId || !eventoId || !custoId || !fileName) {
      throw new Error('userId, eventoId, custoId e fileName são obrigatórios');
    }

    const timestamp = Date.now();
    const sanitizedUserId = this.sanitizePathSegment(userId);
    const sanitizedEventoId = this.sanitizePathSegment(eventoId);
    const sanitizedCustoId = this.sanitizePathSegment(custoId);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    if (!sanitizedFileName || sanitizedFileName.trim() === '') {
      throw new Error('Nome do arquivo inválido após sanitização');
    }

    return `users/${sanitizedUserId}/eventos/${sanitizedEventoId}/custos/${sanitizedCustoId}/anexos/${timestamp}_${sanitizedFileName}`;
  }

  async uploadFile(
    file: File,
    userId: string,
    eventoId: string
  ): Promise<UploadResult> {
    try {
      // Validar configuração do S3
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('[S3Service] Credenciais AWS não configuradas');
        return {
          success: false,
          error: 'Configuração do S3 não encontrada. Verifique as variáveis de ambiente AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY',
        };
      }

      if (!BUCKET_NAME || BUCKET_NAME === 'controle-eventos') {
        console.warn('[S3Service] Usando bucket padrão. Verifique se AWS_S3_BUCKET_NAME está configurado.');
      }

      const s3Key = this.generateS3Key(userId, eventoId, file.name);
      console.log('[S3Service] Fazendo upload:', { s3Key, fileName: file.name, fileSize: file.size, fileType: file.type });
      
      // Converter File para ArrayBuffer e depois para Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          userId,
          eventoId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);
      console.log('[S3Service] Upload concluído com sucesso:', s3Key);

      // Gerar URL assinada para acesso ao arquivo
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 * 24 * 7 }); // 7 dias

      return {
        success: true,
        url,
        key: s3Key,
      };
    } catch (error) {
      console.error('[S3Service] Erro ao fazer upload para S3:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro desconhecido ao fazer upload';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mensagens específicas para erros comuns do AWS
        if (error.message.includes('InvalidAccessKeyId')) {
          errorMessage = 'Credenciais AWS inválidas. Verifique AWS_ACCESS_KEY_ID';
        } else if (error.message.includes('SignatureDoesNotMatch')) {
          errorMessage = 'Credenciais AWS inválidas. Verifique AWS_SECRET_ACCESS_KEY';
        } else if (error.message.includes('NoSuchBucket')) {
          errorMessage = `Bucket S3 não encontrado: ${BUCKET_NAME}. Verifique AWS_S3_BUCKET_NAME`;
        } else if (error.message.includes('AccessDenied')) {
          errorMessage = 'Acesso negado ao bucket S3. Verifique as permissões';
        } else if (error.message.includes('illegal path') || error.message.includes('Invalid key')) {
          errorMessage = `Caminho do arquivo inválido. Verifique userId e eventoId`;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Erro ao gerar URL assinada:', error);
      throw error;
    }
  }

  async deleteFile(s3Key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Erro ao deletar arquivo do S3:', error);
      return false;
    }
  }

  async uploadFilePagamento(
    file: File,
    userId: string,
    eventoId: string,
    pagamentoId: string
  ): Promise<UploadResult> {
    try {
      const s3Key = this.generateS3KeyPagamento(userId, eventoId, pagamentoId, file.name);
      
      // Converter File para ArrayBuffer e depois para Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          userId,
          eventoId,
          pagamentoId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Gerar URL assinada para acesso ao arquivo
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 * 24 * 7 }); // 7 dias

      return {
        success: true,
        url,
        key: s3Key,
      };
    } catch (error) {
      console.error('Erro ao fazer upload de comprovante para S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async uploadFileCusto(
    file: File,
    userId: string,
    eventoId: string,
    custoId: string
  ): Promise<UploadResult> {
    try {
      const s3Key = this.generateS3KeyCusto(userId, eventoId, custoId, file.name);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          userId,
          eventoId,
          custoId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 * 24 * 7 });

      return {
        success: true,
        url,
        key: s3Key,
      };
    } catch (error) {
      console.error('Erro ao fazer upload de anexo de custo para S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async uploadMultipleFiles(
    files: File[],
    userId: string,
    eventoId: string
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, userId, eventoId)
    );

    return Promise.all(uploadPromises);
  }

  async uploadMultipleFilesPagamento(
    files: File[],
    userId: string,
    eventoId: string,
    pagamentoId: string
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => 
      this.uploadFilePagamento(file, userId, eventoId, pagamentoId)
    );

    return Promise.all(uploadPromises);
  }

  async uploadBuffer(
    buffer: Buffer,
    s3Key: string,
    contentType: string = 'application/octet-stream'
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      });

      await s3Client.send(command);

      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      // URLs pré-assinadas do S3 têm limite máximo de 7 dias (604800 segundos)
      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 * 24 * 7 }); // 7 dias

      return {
        success: true,
        url,
        key: s3Key,
      };
    } catch (error) {
      console.error('Erro ao fazer upload de buffer para S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}

export const s3Service = new S3Service();
