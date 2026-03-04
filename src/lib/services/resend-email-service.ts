import { EmailProviderPort } from '@/lib/integrations/email/email-provider-port';
import { ResendEmailProvider } from '@/lib/integrations/email/resend-email-provider';

/**
 * Serviço de envio de email usando Resend
 */
let emailProvider: EmailProviderPort = new ResendEmailProvider();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Enviar email usando Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = 'Clicksehub <noreply@clicksehub.com>'
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  // Verificar se provedor está configurado
  if (!emailProvider.isConfigured()) {
    return {
      success: false,
      error: 'RESEND_API_KEY não configurada'
    };
  }

  try {
    console.log('[resend-email-service] Tentando enviar email para:', to);
    console.log('[resend-email-service] Assunto:', subject);
    console.log('[resend-email-service] From:', from);
    
    return await emailProvider.send({
      from,
      to,
      subject,
      html
    });
  } catch (error: unknown) {
    console.error('[resend-email-service] Exceção ao enviar email:', error);
    console.error('[resend-email-service] Stack:', getErrorStack(error));
    return {
      success: false,
      error: getErrorMessage(error) || 'Erro inesperado ao enviar email'
    };
  }
}

/**
 * Verificar se o serviço de email está configurado
 */
export function isEmailServiceConfigured(): boolean {
  return emailProvider.isConfigured();
}

export function setEmailProvider(provider: EmailProviderPort): void {
  emailProvider = provider;
}

