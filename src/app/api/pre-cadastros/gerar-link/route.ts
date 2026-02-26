import { NextRequest } from 'next/server';
import { PreCadastroEventoService } from '@/lib/services/pre-cadastro-evento-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
} from '@/lib/api/route-helpers';

/**
 * POST /api/pre-cadastros/gerar-link
 * Gera um link de pré-cadastro e cria registro pendente
 * Autenticado
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    const body = await request.json();
    const { nomeEvento } = body;
    
    if (!nomeEvento || typeof nomeEvento !== 'string' || nomeEvento.trim().length < 3) {
      return createErrorResponse('Nome do evento é obrigatório e deve ter pelo menos 3 caracteres', 400);
    }
    
    const { id, link } = await PreCadastroEventoService.gerarLinkPreCadastro(user.id, nomeEvento.trim());
    
    return createApiResponse({
      id,
      link
    });
  } catch (error) {
    return handleApiError(error);
  }
}
