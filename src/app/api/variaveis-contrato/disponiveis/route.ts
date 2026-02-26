import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { VariavelContratoService } from '@/lib/services/variavel-contrato-service';

/**
 * GET - Retorna todas as variáveis disponíveis para o usuário
 * 
 * Query params:
 * - eventoId?: string - Se fornecido, inclui variáveis do evento
 * 
 * Response:
 * {
 *   variaveis: Record<string, any>, // Todas as variáveis com valores
 *   metadados: {
 *     configuracoes: string[], // Chaves das variáveis de configuração
 *     customizadas: { chave: string, tipo: 'unica' | 'multipla' }[], // Variáveis customizadas com tipo
 *     evento: string[] // Chaves das variáveis do evento
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId') || undefined;

    // Obter todas as variáveis disponíveis (com valores)
    const variaveis = await VariavelContratoService.obterTodasVariaveisDisponiveis(
      user.id,
      eventoId
    );

    // Obter metadados (apenas chaves)
    const metadados = await VariavelContratoService.obterMetadadosVariaveis(user.id);

    return createApiResponse({
      variaveis,
      metadados
    });
  } catch (error) {
    return handleApiError(error);
  }
}
