import { adminAuth } from '@/lib/firebase-admin';
import { generateShortToken } from '@/lib/services/email-service';
import { AdminPasswordResetTokenRepository } from '@/lib/repositories/admin-password-reset-token-repository';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export interface CreatePasswordResetLinkOptions {
  /** Validade do link em horas (default: 1) */
  expiryHours?: number;
}

/**
 * Gera um link de redefinição/definição de senha (reutilizado por "Esqueci minha senha" e "Primeiro acesso").
 * Requer que o usuário exista no Firebase Auth.
 * @throws Se Firebase Admin Auth não estiver disponível ou usuário não existir
 */
export async function createPasswordResetLink(
  email: string,
  options: CreatePasswordResetLinkOptions = {}
): Promise<{ resetUrl: string }> {
  const { expiryHours = 1 } = options;
  const normalizedEmail = email.toLowerCase().trim();

  if (!adminAuth) {
    throw new Error('Firebase Admin Auth não está disponível');
  }

  const resetLink = await adminAuth.generatePasswordResetLink(normalizedEmail, {
    url: `${APP_URL}/redefinir-senha`,
    handleCodeInApp: false,
  });

  const urlObj = new URL(resetLink);
  const oobCode = urlObj.searchParams.get('oobCode');

  if (!oobCode) {
    throw new Error('Código de reset não gerado pelo Firebase');
  }

  const shortToken = generateShortToken();
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + expiryHours * 60 * 60 * 1000);

  const tokenRepo = new AdminPasswordResetTokenRepository();
  await tokenRepo.createToken({
    token: shortToken,
    email: normalizedEmail,
    firebaseCode: oobCode,
    expiresAt,
  });

  const resetUrl = `${APP_URL}/redefinir-senha?token=${shortToken}`;
  return { resetUrl };
}
