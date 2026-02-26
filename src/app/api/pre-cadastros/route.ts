import { NextRequest } from 'next/server';
import { PreCadastroEventoService } from '@/lib/services/pre-cadastro-evento-service';
import { StatusPreCadastro } from '@/types';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';

/**
 * GET /api/pre-cadastros
 * Lista pré-cadastros do usuário autenticado
 * Autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const queryParams = getQueryParams(request);
    
    // Filtro opcional por status
    const statusFilter = queryParams.get('status') as StatusPreCadastro | null;
    
    const filtros = statusFilter ? { status: statusFilter } : undefined;
    
    // Buscar pré-cadastros
    const preCadastros = await PreCadastroEventoService.listar(user.id, filtros);
    
    // Contar por status
    const contadores = await PreCadastroEventoService.contarPorStatus(user.id);
    
    return createApiResponse({
      preCadastros,
      total: preCadastros.length,
      contadores
    });
  } catch (error) {
    return handleApiError(error);
  }
}
