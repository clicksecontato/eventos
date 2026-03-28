import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams,
} from '@/lib/api/route-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId } = await getRouteParams(params);

    const contratoRepo = repositoryFactory.getContratoRepository();
    const contrato = await contratoRepo.findById(contratoId, user.id);
    if (!contrato) {
      return createErrorResponse('Contrato não encontrado', 404);
    }

    const auditoriaRepo = repositoryFactory.getContratoEventoAuditoriaRepository();
    const eventos = await auditoriaRepo.listarPorContrato(contratoId, user.id);

    return createApiResponse({
      eventos: eventos.map((e) => ({
        id: e.id,
        contratoId: e.contratoId,
        actorUserId: e.actorUserId,
        tipoEvento: e.tipoEvento,
        payload: e.payload,
        criadoEm: e.criadoEm.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
