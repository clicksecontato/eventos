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
 * API route para criar tipos de custo
 * Usa o cliente admin do Supabase para contornar RLS
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    const { nome, descricao, ativo = true } = body;

    if (!nome || !nome.trim()) {
      return createErrorResponse('Nome é obrigatório', 400);
    }

    const tipoCustoRepo = repositoryFactory.getTipoCustoRepository();
    const tipoCriado = await tipoCustoRepo.createTipoCusto(
      {
        nome: nome.trim(),
        descricao: descricao?.trim() || '',
        ativo: ativo
      },
      user.id
    );

    return createApiResponse(tipoCriado, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

