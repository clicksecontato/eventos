import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse
} from '@/lib/api/route-helpers';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { AssinaturaService } from '@/lib/services/assinatura-service';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    
    // Usar repositórios Admin para bypassar regras do Firestore
    const assinaturaRepo = repositoryFactory.getAdminAssinaturaRepository();
    const planoRepo = repositoryFactory.getAdminPlanoRepository();
    const funcionalidadeRepo = repositoryFactory.getAdminFuncionalidadeRepository();
    const userRepo = repositoryFactory.getAdminUserRepository();
    const eventoRepo = repositoryFactory.getEventoRepository();
    const clienteRepo = repositoryFactory.getClienteRepository();
    
    // Criar serviços com repositórios Admin
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const funcionalidadeService = new FuncionalidadeService(
      funcionalidadeRepo,
      assinaturaRepo,
      userRepo,
      eventoRepo,
      clienteRepo,
      planoRepo,
      assinaturaService
    );
    
    const limites = await funcionalidadeService.obterLimitesUsuario(user.id);
    
    return createApiResponse({ limites });
  } catch (error) {
    return handleApiError(error);
  }
}
