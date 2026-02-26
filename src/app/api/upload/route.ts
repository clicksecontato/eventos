import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/lib/s3-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getQueryParams
} from '@/lib/api/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventoId = formData.get('eventoId') as string;

    if (!file) {
      return createErrorResponse('Arquivo é obrigatório', 400);
    }

    if (!eventoId || typeof eventoId !== 'string' || eventoId.trim() === '') {
      return createErrorResponse('eventoId é obrigatório e deve ser uma string válida', 400);
    }

    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      return createErrorResponse('ID do usuário inválido', 400);
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Tipo de arquivo não permitido. Tipos aceitos: JPG, PNG, GIF, PDF, DOC, DOCX, TXT', 400);
    }

    // Validar tamanho do arquivo (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return createErrorResponse('Arquivo muito grande. Tamanho máximo: 10MB', 400);
    }

    // Fazer upload para S3
    console.log('[API Upload] Iniciando upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      userId: user.id,
      eventoId 
    });

    const uploadResult = await s3Service.uploadFile(file, user.id, eventoId);

    if (!uploadResult.success) {
      console.error('[API Upload] Erro no upload:', uploadResult.error);
      return createErrorResponse(uploadResult.error || 'Erro no upload', 500);
    }

    console.log('[API Upload] Upload concluído:', { s3Key: uploadResult.key });

    // Salvar metadados no Firestore
    try {
      const arquivoData = {
        userId: user.id,
        eventoId,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        s3Key: uploadResult.key!,
        url: uploadResult.url!,
        dataUpload: new Date(),
      };

      console.log('[API Upload] Salvando metadados no Supabase:', arquivoData);

      // Usar repositório Supabase para anexos de eventos
      const anexoEventoRepo = repositoryFactory.getAnexoEventoRepository();
      
      // Determinar tipo do arquivo baseado no MIME type
      const determinarTipoAnexo = (mimeType: string): 'PDF' | 'Imagem' | 'Documento' | 'Outro' => {
        if (mimeType === 'application/pdf') return 'PDF';
        if (mimeType.startsWith('image/')) return 'Imagem';
        if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return 'Documento';
        return 'Outro';
      };

      const anexoData = {
        eventoId: eventoId,
        nome: file.name,
        tipo: determinarTipoAnexo(file.type),
        url: uploadResult.url!,
        tamanho: file.size,
        dataUpload: new Date(),
        s3Key: uploadResult.key!, // Adicionar s3Key para poder deletar depois
      };

      const arquivo = await anexoEventoRepo.createAnexo(anexoData as any);

      console.log('[API Upload] Metadados salvos com sucesso:', arquivo.id);

      // Converter Date para ISO string para serialização JSON
      // Retornar no formato esperado pelo componente (com success e arquivo)
      return NextResponse.json({
        success: true,
        arquivo: {
          id: arquivo.id,
          nome: arquivo.nome,
          tipo: arquivo.tipo,
          tamanho: arquivo.tamanho,
          url: arquivo.url,
          dataUpload: arquivo.dataUpload instanceof Date 
            ? arquivo.dataUpload.toISOString() 
            : arquivo.dataUpload,
        }
      }, { status: 200 });
    } catch (firestoreError) {
      console.error('[API Upload] Erro ao salvar metadados no Firestore:', firestoreError);
      // Mesmo que falhe ao salvar no Firestore, o arquivo já está no S3
      // Retornar sucesso parcial para não perder o upload
      return NextResponse.json({
        success: true,
        arquivo: {
          id: 'temp-' + Date.now(),
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          url: uploadResult.url!,
          dataUpload: new Date().toISOString(),
        },
        warning: 'Arquivo enviado com sucesso, mas houve um problema ao salvar os metadados. O arquivo pode não aparecer na lista.'
      }, { status: 200 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const queryParams = getQueryParams(request);
    const arquivoId = queryParams.get('arquivoId');
    const eventoId = queryParams.get('eventoId');

    if (!arquivoId || !eventoId) {
      return createErrorResponse('arquivoId e eventoId são obrigatórios', 400);
    }

    // Buscar arquivo no Supabase
    const anexoEventoRepo = repositoryFactory.getAnexoEventoRepository();
    const arquivo = await anexoEventoRepo.getAnexoById(arquivoId);

    if (!arquivo || arquivo.eventoId !== eventoId) {
      return createErrorResponse('Arquivo não encontrado', 404);
    }

    // Deletar do S3 se tiver s3Key
    const s3Key = await anexoEventoRepo.getS3Key(arquivoId);
    if (s3Key) {
      await s3Service.deleteFile(s3Key);
    }

    // Deletar do Supabase
    await anexoEventoRepo.deleteAnexo(arquivoId);

    return createApiResponse({ 
      success: true,
      message: 'Arquivo deletado com sucesso'
    });

  } catch (error) {
    return handleApiError(error);
  }
}
