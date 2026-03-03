import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { 
  getAuthenticatedUser,
  requireAdmin,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: userId } = await getRouteParams(params);

    // Verificar se usuário pode acessar (próprio usuário ou admin)
    if (user.id !== userId && user.role !== 'admin') {
      return createErrorResponse('Não autorizado', 403);
    }

    const assinaturaService = new AssinaturaService(
      repositoryFactory.getAdminAssinaturaRepository(),
      repositoryFactory.getAdminPlanoRepository(),
      repositoryFactory.getAdminUserRepository()
    );
    const statusPlano = await assinaturaService.obterStatusPlanoUsuario(userId);

    return createApiResponse({
      success: true,
      statusPlano
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await getRouteParams(params);
    const { assinaturaId } = await getRequestBody<{ assinaturaId: string }>(request);

    if (!assinaturaId) {
      return createErrorResponse('assinaturaId é obrigatório', 400);
    }

    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const assinaturaService = serviceFactory.getAssinaturaService();
    const user = await assinaturaService.atualizarAssinaturaUsuario(userId, assinaturaId);

    return createApiResponse({
      success: true,
      message: 'Assinatura atualizada com sucesso',
      user
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await getRouteParams(params);
    const { sincronizar } = await getRequestBody<{ sincronizar?: boolean }>(request);

    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const assinaturaService = serviceFactory.getAssinaturaService();
    
    if (sincronizar) {
      // Forçar sincronização
      const user = await assinaturaService.sincronizarPlanoUsuario(userId);
      const statusPlano = await assinaturaService.obterStatusPlanoUsuario(userId);

      return createApiResponse({
        success: true,
        message: 'Plano sincronizado com sucesso',
        user,
        statusPlano
      });
    }

    // Obter status atual
    const statusPlano = await assinaturaService.obterStatusPlanoUsuario(userId);

    return createApiResponse({
      success: true,
      statusPlano
    });
  } catch (error) {
    return handleApiError(error);
  }
}

