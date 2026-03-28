import type { AuthenticatedUser } from '@/lib/api/types';
import { SENHA_CREDENCIALS_BYPASS_DESENVOLVIMENTO } from '@/lib/constants/dev-bypass-credenciais';

/**
 * Bypass opcional em desenvolvimento: sessão e APIs sem login real.
 * Produção: nunca ativo (exige NODE_ENV === 'development').
 *
 * No browser, o Next.js só expõe variáveis `NEXT_PUBLIC_*`. O `DataService`
 * roda `verificarPodeCriar` no cliente ao criar evento; sem isso o bypass
 * parecia “não funcionar” apesar das APIs estarem corretas.
 */
export function isDevAuthBypassAtivo(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
  }
  return process.env.DEV_AUTH_BYPASS === 'true';
}

export function senhaBypassCredentialsEfetiva(): string {
  return (
    process.env.DEV_AUTH_BYPASS_PASSWORD?.trim() ||
    SENHA_CREDENCIALS_BYPASS_DESENVOLVIMENTO
  );
}

export function obterUsuarioBypassDesenvolvimento(): AuthenticatedUser {
  const id =
    process.env.DEV_AUTH_BYPASS_USER_ID?.trim() ||
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_USER_ID?.trim() ||
    'l8eCqIl67TbT4yjPMGKDG7Dcvpw2';
  const email =
    process.env.DEV_AUTH_BYPASS_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_EMAIL?.trim() ||
    'kontempler@gmail.com';
  const name =
    process.env.DEV_AUTH_BYPASS_NAME?.trim() || 'Dev (bypass local)';
  const roleRaw = process.env.DEV_AUTH_BYPASS_ROLE?.trim().toLowerCase();
  const role = roleRaw === 'admin' ? 'admin' : 'user';

  return { id, email, name, role };
}

export function usuarioEhBypassDesenvolvimento(userId: string): boolean {
  if (!isDevAuthBypassAtivo() || !userId) return false;

  if (typeof window !== 'undefined') {
    const uidPublico = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS_USER_ID?.trim();
    if (uidPublico) {
      return uidPublico === userId;
    }
    return true;
  }

  return obterUsuarioBypassDesenvolvimento().id === userId;
}

/** Rotas requireAdmin liberadas no bypass (padrão: sim, “acesso total” local). */
export function devBypassLiberaRotasAdmin(): boolean {
  return isDevAuthBypassAtivo() && process.env.DEV_AUTH_BYPASS_ACESSO_ADMIN !== 'false';
}
