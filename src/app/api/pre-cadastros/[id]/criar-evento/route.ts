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
 * POST /api/pre-cadastros/[id]/criar-evento
 * Converte pré-cadastro em evento
 * Autenticado
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    const resultado = await PreCadastroEventoService.converterEmEvento(id, user.id);
    
    return createApiResponse({
      evento: resultado.evento,
      cliente: resultado.cliente,
      clienteNovo: resultado.clienteNovo,
      message: resultado.clienteNovo 
        ? 'Evento criado com sucesso! Cliente foi cadastrado no sistema.'
        : 'Evento criado com sucesso! Cliente existente foi utilizado.'
    });
  } catch (error: any) {
    // Log detalhado do erro para debug
    console.error('[API /pre-cadastros/[id]/criar-evento] Erro:', error);
    console.error('[API /pre-cadastros/[id]/criar-evento] Stack:', error.stack);
    console.error('[API /pre-cadastros/[id]/criar-evento] Error details:', {
      message: error.message,
      status: error.status,
      name: error.name,
      code: error.code
    });
    
    // Verificar se é erro de validação
    if (error.message?.includes('não encontrado') || 
        error.message?.includes('não pode ser convertido') ||
        error.message?.includes('já foi convertido') ||
        error.message?.includes('é obrigatório')) {
      return createErrorResponse(error.message, 400);
    }
    
    // Verificar se é erro de limite do plano (pode ser de cliente ou evento)
    if (error.status === 403) {
      return createErrorResponse(error.message || 'Não é possível criar evento', 403, {
        limite: error.limite,
        usado: error.usado,
        restante: error.restante
      });
    }
    
    return handleApiError(error);
  }
}
