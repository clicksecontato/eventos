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
    const { AdminAssinaturaRepository } = await import('@/lib/repositories/admin-assinatura-repository');
    const { AdminPlanoRepository } = await import('@/lib/repositories/admin-plano-repository');
    const { AdminFuncionalidadeRepository } = await import('@/lib/repositories/admin-funcionalidade-repository');
    const { AdminUserRepository } = await import('@/lib/repositories/admin-user-repository');
    const assinaturaRepo = new AdminAssinaturaRepository();
    const planoRepo = new AdminPlanoRepository();
    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    const userRepo = new AdminUserRepository();
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
