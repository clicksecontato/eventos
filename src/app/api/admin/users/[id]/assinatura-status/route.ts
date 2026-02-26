import { NextRequest } from 'next/server';
import {
  requireAdmin,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';
import { StatusAssinatura } from '@/types/funcionalidades';

interface AtualizarStatusBody {
  status: StatusAssinatura;
  motivo?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: userId } = await getRouteParams(params);
    const body = await getRequestBody<AtualizarStatusBody>(request);

    if (!body.status) {
      return createErrorResponse('status é obrigatório', 400);
    }

    const statusPermitidos: StatusAssinatura[] = ['trial', 'active', 'cancelled', 'expired', 'suspended'];
    if (!statusPermitidos.includes(body.status)) {
      return createErrorResponse('status inválido', 400);
    }

    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const assinaturaService = serviceFactory.getAssinaturaService();

    const resultado = await assinaturaService.atualizarStatusAssinaturaUsuario(
      userId,
      body.status,
      {
        origem: 'admin_manual',
        adminId: admin.id,
        motivo: body.motivo || null
      }
    );

    return createApiResponse(
      {
        user: resultado.user,
        assinatura: resultado.assinatura
      },
      200,
      'Status da assinatura atualizado com sucesso'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

