import { Resend } from 'resend';

/**
 * Serviço de envio de email usando Resend
 */
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
  // Verificar se Resend está configurado
  if (!resend) {
    return {
      success: false,
      error: 'RESEND_API_KEY não configurada'
    };
  }

  try {
    console.log('[resend-email-service] Tentando enviar email para:', to);
    console.log('[resend-email-service] Assunto:', subject);
    console.log('[resend-email-service] From:', from);
    
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[resend-email-service] Erro do Resend:', error);
      return {
        success: false,
        error: error.message || 'Erro ao enviar email'
      };
    }

    console.log('[resend-email-service] Email enviado com sucesso. ID:', data?.id);
    return {
      success: true
    };
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
  return !!process.env.RESEND_API_KEY && !!resend;
}

