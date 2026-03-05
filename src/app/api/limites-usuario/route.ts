import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse
} from '@/lib/api/route-helpers';
import { createContextoAssinaturaServidor } from '@/lib/composition/server-assinatura-context';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    const { funcionalidadeService } = await createContextoAssinaturaServidor();
    const limites = await funcionalidadeService.obterLimitesUsuario(user.id);
    
    return createApiResponse({ limites });
  } catch (error) {
    return handleApiError(error);
  }
}
