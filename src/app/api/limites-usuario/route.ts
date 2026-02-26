import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse
} from '@/lib/api/route-helpers';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { EventoSupabaseRepository } from '@/lib/repositories/supabase/evento-supabase-repository';
import { ClienteSupabaseRepository } from '@/lib/repositories/supabase/cliente-supabase-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Usar repositórios Admin para bypassar regras do Firestore
    const assinaturaRepo = new AdminAssinaturaRepository();
    const planoRepo = new AdminPlanoRepository();
    const funcionalidadeRepo = new AdminFuncionalidadeRepository();
    const userRepo = new AdminUserRepository();
    const eventoRepo = new EventoSupabaseRepository();
    const clienteRepo = new ClienteSupabaseRepository();
    
    // Criar serviços com repositórios Admin
    const assinaturaService = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const funcionalidadeService = new FuncionalidadeService(
      funcionalidadeRepo,
      assinaturaRepo,
      userRepo,
      eventoRepo,
      clienteRepo,
      assinaturaService
    );
    
    const limites = await funcionalidadeService.obterLimitesUsuario(user.id);
    
    return createApiResponse({ limites });
  } catch (error) {
    return handleApiError(error);
  }
}
