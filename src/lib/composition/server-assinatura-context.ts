import 'server-only';

import { repositoryFactory } from '@/lib/repositories/repository-factory';
import type { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import type { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import type { AdminFuncionalidadeRepository } from '@/lib/repositories/admin-funcionalidade-repository';
import type { AdminUserRepository } from '@/lib/repositories/admin-user-repository';
import { AssinaturaService } from '@/lib/services/assinatura-service';
import { FuncionalidadeService } from '@/lib/services/funcionalidade-service';
import type { AdminPasswordResetTokenRepository } from '@/lib/repositories/admin-password-reset-token-repository';

export interface ContextoAssinaturaServidor {
  assinaturaRepo: AdminAssinaturaRepository;
  planoRepo: AdminPlanoRepository;
  funcionalidadeRepo: AdminFuncionalidadeRepository;
  userRepo: AdminUserRepository;
  assinaturaService: AssinaturaService;
  funcionalidadeService: FuncionalidadeService;
}

export interface RepositoriosAdminBasicos {
  assinaturaRepo: AdminAssinaturaRepository;
  planoRepo: AdminPlanoRepository;
  funcionalidadeRepo: AdminFuncionalidadeRepository;
  userRepo: AdminUserRepository;
}

export interface RepositoriosAdminComToken extends RepositoriosAdminBasicos {
  passwordResetTokenRepo: AdminPasswordResetTokenRepository;
}

export async function createRepositoriosAdminBasicos(): Promise<RepositoriosAdminBasicos> {
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

  return {
    assinaturaRepo: new AdminAssinaturaRepository(),
    planoRepo: new AdminPlanoRepository(),
    funcionalidadeRepo: new AdminFuncionalidadeRepository(),
    userRepo: new AdminUserRepository()
  };
}

export async function createRepositoriosAdminComToken(): Promise<RepositoriosAdminComToken> {
  const [
    basicos,
    { AdminPasswordResetTokenRepository }
  ] = await Promise.all([
    createRepositoriosAdminBasicos(),
    import('@/lib/repositories/admin-password-reset-token-repository')
  ]);

  return {
    ...basicos,
    passwordResetTokenRepo: new AdminPasswordResetTokenRepository()
  };
}

/**
 * Composition root server-only para o domínio de assinatura/permissões.
 * Mantém desacoplamento dos serviços e evita resolução dinâmica frágil em runtime.
 */
export async function createContextoAssinaturaServidor(): Promise<ContextoAssinaturaServidor> {
  const { assinaturaRepo, planoRepo, funcionalidadeRepo, userRepo } = await createRepositoriosAdminBasicos();
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
