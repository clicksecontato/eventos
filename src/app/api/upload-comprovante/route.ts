import { NextRequest, NextResponse } from 'next/server';
import { s3Service } from '@/lib/s3-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { 
  getAuthenticatedUser,
  handleApiError,
  createErrorResponse
} from '@/lib/api/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    const assinaturaRepo = new AdminAssinaturaRepository();
    const userRepo = new AdminUserRepository();
    const funcionalidadeService = new FuncionalidadeService(funcionalidadeRepo, assinaturaRepo, userRepo);
    const temPermissao = await funcionalidadeService.verificarPermissao(user.id, 'PAGAMENTOS_COMPROVANTES');
    if (!temPermissao) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas no plano Premium.',
        403
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventoId = formData.get('eventoId') as string;
    const pagamentoId = formData.get('pagamentoId') as string;

    if (!file || !eventoId || !pagamentoId) {
      return createErrorResponse('Arquivo, eventoId e pagamentoId são obrigatórios', 400);
    }

    // Validar tipo de arquivo para comprovantes
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Tipo de arquivo não permitido. Tipos aceitos: JPG, PNG, PDF, DOC, DOCX, TXT', 400);
    }

    // Validar tamanho do arquivo (5MB máximo para comprovantes)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return createErrorResponse('Arquivo muito grande. Tamanho máximo: 5MB', 400);
    }

    // Fazer upload para S3
    const uploadResult = await s3Service.uploadFilePagamento(
      file, 
      user.id, 
      eventoId, 
      pagamentoId
    );

    if (!uploadResult.success) {
      return createErrorResponse(uploadResult.error || 'Erro no upload', 500);
    }

    // Salvar metadados no Supabase
    console.log('[API Upload Comprovante] Salvando metadados no Supabase:', {
      userId: user.id,
      eventoId,
      pagamentoId,
      fileName: file.name,
      s3Key: uploadResult.key
    });

    try {
      const anexoPagamentoRepo = repositoryFactory.getAnexoPagamentoRepository();
      
      const anexoData = {
        userId: user.id,
        eventoId,
        pagamentoId,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        s3Key: uploadResult.key!,
        url: uploadResult.url!,
        dataUpload: new Date(),
      };

      console.log('[API Upload Comprovante] Dados do anexo:', anexoData);

      const anexo = await anexoPagamentoRepo.createAnexo(
        user.id,
        eventoId,
        pagamentoId,
        anexoData
      );

      console.log('[API Upload Comprovante] Metadados salvos com sucesso:', anexo.id);

      // Converter Date para ISO string para serialização JSON
      return NextResponse.json({
        success: true,
        anexo: {
          ...anexo,
          dataUpload: anexo.dataUpload instanceof Date 
            ? anexo.dataUpload.toISOString() 
            : anexo.dataUpload,
          dataCadastro: anexo.dataCadastro instanceof Date 
            ? anexo.dataCadastro.toISOString() 
            : anexo.dataCadastro,
        }
      }, { status: 200 });
    } catch (supabaseError: any) {
      console.error('[API Upload Comprovante] Erro ao salvar no Supabase:', supabaseError);
      // Mesmo que falhe ao salvar no Supabase, o arquivo já está no S3
      // Retornar sucesso parcial para não perder o upload
      return NextResponse.json({
        success: true,
        anexo: {
          id: 'temp-' + Date.now(),
          userId: user.id,
          eventoId,
          pagamentoId,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          s3Key: uploadResult.key!,
          url: uploadResult.url!,
          dataUpload: new Date().toISOString(),
          dataCadastro: new Date().toISOString(),
        },
        warning: 'Arquivo enviado com sucesso, mas houve um problema ao salvar os metadados. O arquivo pode não aparecer na lista.'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('[API Upload Comprovante] Erro geral:', error);
    return handleApiError(error);
  }
}
