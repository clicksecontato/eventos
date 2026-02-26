import { NextRequest } from 'next/server';
import { PreCadastroEventoService } from '@/lib/services/pre-cadastro-evento-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams
} from '@/lib/api/route-helpers';

/**
 * PATCH /api/pre-cadastros/[id]/ignorar
 * Marca pré-cadastro como ignorado
 * Autenticado
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    await PreCadastroEventoService.marcarComoIgnorado(id, user.id);
    
    return createApiResponse({
      success: true,
      message: 'Pré-cadastro marcado como ignorado'
    });
  } catch (error: any) {
    if (error.message?.includes('não encontrado')) {
      return createErrorResponse(error.message, 404);
    }
    
    return handleApiError(error);
  }
}
