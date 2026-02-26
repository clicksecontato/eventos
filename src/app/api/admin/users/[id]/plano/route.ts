import { NextRequest } from 'next/server';
import {
  requireAdmin,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { StatusAssinatura } from '@/types/funcionalidades';

interface DefinirPlanoBody {
  planoId?: string;
  codigoPlano?: string;
  codigoHotmart?: string;
  status?: StatusAssinatura;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: userId } = await getRouteParams(params);
    const body = await getRequestBody<DefinirPlanoBody>(request);

    const status = body.status || 'active';
    const codigo = body.codigoPlano || body.codigoHotmart;

    if (!body.planoId && !codigo) {
      return createErrorResponse('planoId ou codigoPlano é obrigatório', 400);
    }

    const planoRepo = repositoryFactory.getPlanoRepository();
    const plano = body.planoId
      ? await planoRepo.findById(body.planoId)
      : await planoRepo.findByCodigoHotmart(codigo!);

    if (!plano) {
      return createErrorResponse('Plano não encontrado', 404);
    }

    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const assinaturaService = serviceFactory.getAssinaturaService();

    const resultado = await assinaturaService.definirPlanoUsuario(
      userId,
      plano.id,
      status,
      { origem: 'admin_manual', adminId: admin.id }
    );

    return createApiResponse(
      {
        user: resultado.user,
        assinatura: resultado.assinatura,
        plano: {
          id: plano.id,
          nome: plano.nome,
          codigoHotmart: plano.codigoHotmart
        }
      },
      200,
      'Plano do usuário atualizado com sucesso'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

