import { NextRequest } from 'next/server';
import { PreCadastroEventoService } from '@/lib/services/pre-cadastro-evento-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams
} from '@/lib/api/route-helpers';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

/**
 * PATCH /api/pre-cadastros/[id]/renovar
 * Renova expiração do pré-cadastro (adiciona mais 7 dias)
 * Autenticado
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    const preCadastro = await PreCadastroEventoService.renovarExpiracao(id, user.id);
    
    return createApiResponse({
      success: true,
      message: 'Prazo de expiração renovado com sucesso',
      preCadastro,
      novaDataExpiracao: preCadastro.dataExpiracao
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes('não encontrado')) {
      return createErrorResponse(message, 404);
    }
    
    return handleApiError(error);
  }
}
