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
    const temPermissao = await funcionalidadeService.verificarPermissao(user.id, 'ANEXOS_CUSTO');
    if (!temPermissao) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas no plano Premium.',
        403
      );
    }

    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');
    const custoId = queryParams.get('custoId');

    if (!eventoId || !custoId) {
      return createErrorResponse('eventoId e custoId são obrigatórios', 400);
    }

    const anexoCustoRepo = repositoryFactory.getAnexoCustoRepository();
    const anexos = await anexoCustoRepo.findByCustoId(user.id, eventoId, custoId);

    const anexosComUrls = await Promise.all(
      anexos.map(async (anexo) => {
        try {
          const signedUrl = await s3Service.getSignedUrl(anexo.s3Key, 3600 * 24 * 7);
          return {
            ...anexo,
            url: signedUrl,
            dataUpload: anexo.dataUpload instanceof Date ? anexo.dataUpload.toISOString() : anexo.dataUpload,
            dataCadastro: anexo.dataCadastro instanceof Date ? anexo.dataCadastro.toISOString() : anexo.dataCadastro,
          };
        } catch {
          return {
            ...anexo,
            dataUpload: anexo.dataUpload instanceof Date ? anexo.dataUpload.toISOString() : anexo.dataUpload,
            dataCadastro: anexo.dataCadastro instanceof Date ? anexo.dataCadastro.toISOString() : anexo.dataCadastro,
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
    const temPermissao = await funcionalidadeService.verificarPermissao(user.id, 'ANEXOS_CUSTO');
    if (!temPermissao) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas no plano Premium.',
        403
      );
    }

    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');
    const custoId = queryParams.get('custoId');
    const anexoId = queryParams.get('anexoId');

    if (!eventoId || !custoId || !anexoId) {
      return createErrorResponse('eventoId, custoId e anexoId são obrigatórios', 400);
    }

    const anexoCustoRepo = repositoryFactory.getAnexoCustoRepository();
    const anexo = await anexoCustoRepo.getAnexoById(user.id, eventoId, custoId, anexoId);

    if (!anexo) {
      return createErrorResponse('Anexo não encontrado', 404);
    }

    await s3Service.deleteFile(anexo.s3Key);
    await anexoCustoRepo.deleteAnexo(user.id, eventoId, custoId, anexoId);

    return createApiResponse({
      success: true,
      message: 'Anexo deletado com sucesso',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
