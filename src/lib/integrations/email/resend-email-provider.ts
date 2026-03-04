import { Resend } from 'resend';
import { EmailProviderPort, EmailSendInput, EmailSendResult } from './email-provider-port';

export class ResendEmailProvider implements EmailProviderPort {
  private readonly resend: Resend | null;

  constructor(apiKey: string | undefined = process.env.RESEND_API_KEY) {
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  isConfigured(): boolean {
    return !!this.resend;
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (!this.resend) {
      return { success: false, error: 'RESEND_API_KEY não configurada' };
    }

    const { data, error } = await this.resend.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Erro ao enviar email'
      };
    }

    console.log('[resend-email-provider] Email enviado com sucesso. ID:', data?.id);
    return { success: true };
  }
}
