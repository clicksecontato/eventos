export interface EmailSendInput {
  to: string;
  subject: string;
  html: string;
  from: string;
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
}

export interface EmailProviderPort {
  isConfigured(): boolean;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
