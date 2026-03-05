import 'server-only';

import { repositoryFactory } from '@/lib/repositories/repository-factory';
import type { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import type { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import type { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import type { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';

export interface ContextoAssinaturaServidor {
  assinaturaRepo: AdminAssinaturaRepository;
  planoRepo: AdminPlanoRepository;
  funcionalidadeRepo: AdminFuncionalidadeRepository;
  userRepo: AdminUserRepository;
  assinaturaService: AssinaturaService;
  funcionalidadeService: FuncionalidadeService;
}

/**
 * Composition root server-only para o domínio de assinatura/permissões.
 * Mantém desacoplamento dos serviços e evita resolução dinâmica frágil em runtime.
 */
export async function createContextoAssinaturaServidor(): Promise<ContextoAssinaturaServidor> {
  const [
    { AdminAssinaturaRepository },
    { AdminPlanoRepository },
    { AdminFuncionalidadeRepository },
    { AdminUserRepository }
  ] = await Promise.all([
    import('@/lib/repositories/admin-assinatura-repository'),
    import('@/lib/repositories/admin-plano-repository'),
    import('@/lib/repositories/admin-funcionalidade-repository'),
    import('@/lib/repositories/admin-user-repository')
  ]);

  const assinaturaRepo = new AdminAssinaturaRepository();
  const planoRepo = new AdminPlanoRepository();
  const funcionalidadeRepo = new AdminFuncionalidadeRepository();
  const userRepo = new AdminUserRepository();
  const eventoRepo = repositoryFactory.getEventoRepository();
  const clienteRepo = repositoryFactory.getClienteRepository();

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

  return {
    assinaturaRepo,
    planoRepo,
    funcionalidadeRepo,
    userRepo,
    assinaturaService,
    funcionalidadeService
  };
}
