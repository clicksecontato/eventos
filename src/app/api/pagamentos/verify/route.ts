import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

/**
 * API route para verificar se pagamentos estão sendo salvos no Supabase
 * Útil para debug
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');

    const pagamentoRepo = repositoryFactory.getPagamentoRepository();
    const pagamentos = eventoId
      ? await pagamentoRepo.findByEventoId(user.id, eventoId)
      : (await pagamentoRepo.findAll(user.id));

    return createApiResponse({
      totalEncontrado: pagamentos.length,
      pagamentos: pagamentos.slice(0, 10),
      eventoId: eventoId || 'todos'
    });
  } catch (error) {
    return handleApiError(error);
  }
}



