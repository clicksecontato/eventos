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
 * GET /api/pre-cadastros/[id]/link
 * Retorna link completo do pré-cadastro para cópia
 * Autenticado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    // Verificar se pré-cadastro pertence ao usuário
    const preCadastros = await PreCadastroEventoService.listar(user.id);
    const preCadastro = preCadastros.find(p => p.id === id);
    
    if (!preCadastro) {
      return createErrorResponse('Pré-cadastro não encontrado', 404);
    }
    
    const link = PreCadastroEventoService.gerarLinkCompleto(id);
    
    return createApiResponse({
      link
    });
  } catch (error) {
    return handleApiError(error);
  }
}
