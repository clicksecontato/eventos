import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

/**
 * API route para criar custos
 * Usa o cliente admin do Supabase para contornar RLS
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    const { eventoId, tipoCustoId, valor, quantidade, observacoes } = body;

    if (!eventoId || !tipoCustoId || valor === undefined) {
      return createErrorResponse('eventoId, tipoCustoId e valor são obrigatórios', 400);
    }

    const custoRepo = repositoryFactory.getCustoEventoRepository();
    const custoCriado = await custoRepo.createCustoEvento(
      user.id,
      eventoId,
      {
        tipoCustoId,
        valor: parseFloat(valor) || 0,
        quantidade: quantidade || 1,
        observacoes: observacoes || '',
        removido: false,
        eventoId,
        evento: {} as any,
        tipoCusto: {} as any,
        dataCadastro: new Date()
      }
    );

    return createApiResponse(custoCriado, 201);
  } catch (error) {
    return handleApiError(error);
  }
}


