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

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

function getErrorLimitPayload(error: unknown): { limite?: unknown; usado?: unknown; restante?: unknown } {
  if (error && typeof error === 'object') {
    const e = error as { limite?: unknown; usado?: unknown; restante?: unknown };
    return { limite: e.limite, usado: e.usado, restante: e.restante };
  }
  return {};
}

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
  } catch (error: unknown) {
    // Log detalhado do erro para debug
    console.error('[API /pre-cadastros/[id]/criar-evento] Erro:', error);
    console.error('[API /pre-cadastros/[id]/criar-evento] Stack:', error instanceof Error ? error.stack : undefined);
    console.error('[API /pre-cadastros/[id]/criar-evento] Error details:', {
      message: getErrorMessage(error),
      status: getErrorStatus(error),
      name: error instanceof Error ? error.name : undefined,
      code: error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined
    });
    
    // Verificar se é erro de validação
    const message = getErrorMessage(error);
    if (message.includes('não encontrado') || 
        message.includes('não pode ser convertido') ||
        message.includes('já foi convertido') ||
        message.includes('é obrigatório')) {
      return createErrorResponse(message, 400);
    }
    
    // Verificar se é erro de limite do plano (pode ser de cliente ou evento)
    if (getErrorStatus(error) === 403) {
      const limitPayload = getErrorLimitPayload(error);
      return createErrorResponse(message || 'Não é possível criar evento', 403, {
        limite: limitPayload.limite,
        usado: limitPayload.usado,
        restante: limitPayload.restante
      });
    }
    
    return handleApiError(error);
  }
}
