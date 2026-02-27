export const EMPRESA_ID_DEFAULT = 'default';

/**
 * Identificador único da empresa no modo single-tenant.
 * Pode ser sobrescrito por variável de ambiente apenas para cenários controlados.
 */
export function getEmpresaIdPadrao(): string {
  const valorEnv = process.env.EMPRESA_ID?.trim();
  return valorEnv || EMPRESA_ID_DEFAULT;
}

