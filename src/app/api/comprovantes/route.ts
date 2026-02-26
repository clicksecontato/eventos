import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { s3Service } from '@/lib/s3-service';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getQueryParams
} from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
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

    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');
    const pagamentoId = queryParams.get('pagamentoId');

    if (!eventoId || !pagamentoId) {
      return createErrorResponse('eventoId e pagamentoId são obrigatórios', 400);
    }

    // Buscar anexos do pagamento no Supabase
    const anexoPagamentoRepo = repositoryFactory.getAnexoPagamentoRepository();
    const anexos = await anexoPagamentoRepo.findByPagamentoId(
      user.id,
      eventoId,
      pagamentoId
    );

    // Gerar URLs assinadas para cada anexo (URLs expiram após 7 dias)
    const anexosComUrls = await Promise.all(
      anexos.map(async (anexo) => {
        try {
          const signedUrl = await s3Service.getSignedUrl(anexo.s3Key, 3600 * 24 * 7); // 7 dias
          return {
            ...anexo,
            url: signedUrl,
            dataUpload: anexo.dataUpload instanceof Date 
              ? anexo.dataUpload.toISOString() 
              : anexo.dataUpload,
            dataCadastro: anexo.dataCadastro instanceof Date 
              ? anexo.dataCadastro.toISOString() 
              : anexo.dataCadastro,
          };
        } catch (error) {
          console.error(`Erro ao gerar URL para anexo ${anexo.id}:`, error);
          // Se falhar, usar URL existente (pode estar expirada, mas é melhor que nada)
          return {
            ...anexo,
            dataUpload: anexo.dataUpload instanceof Date 
              ? anexo.dataUpload.toISOString() 
              : anexo.dataUpload,
            dataCadastro: anexo.dataCadastro instanceof Date 
              ? anexo.dataCadastro.toISOString() 
              : anexo.dataCadastro,
          };
        }
      })
    );

    return createApiResponse({
      success: true,
      anexos: anexosComUrls,
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
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

    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');
    const pagamentoId = queryParams.get('pagamentoId');
    const anexoId = queryParams.get('anexoId');

    if (!eventoId || !pagamentoId || !anexoId) {
      return createErrorResponse('eventoId, pagamentoId e anexoId são obrigatórios', 400);
    }

    // Buscar anexo para obter s3Key no Supabase
    const anexoPagamentoRepo = repositoryFactory.getAnexoPagamentoRepository();
    const anexo = await anexoPagamentoRepo.getAnexoById(
      user.id,
      eventoId,
      pagamentoId,
      anexoId
    );

    if (!anexo) {
      return createErrorResponse('Anexo não encontrado', 404);
    }

    // Deletar do S3
    const deletedFromS3 = await s3Service.deleteFile(anexo.s3Key);
    
    if (!deletedFromS3) {
      console.warn(`Falha ao deletar arquivo do S3: ${anexo.s3Key}`);
    }

    // Deletar do Supabase
    await anexoPagamentoRepo.deleteAnexo(
      user.id,
      eventoId,
      pagamentoId,
      anexoId
    );

    return createApiResponse({
      success: true,
      message: 'Anexo deletado com sucesso',
    });

  } catch (error) {
    return handleApiError(error);
  }
}
