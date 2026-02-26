import { sendEmail } from './resend-email-service';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@clicksehub.com';

function formatarData(date: Date): string {
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function templateBase(conteudoHtml: string, timestamp: Date): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificação Administrativa</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <header style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 1.25rem; color: #1e40af;">Clicksehub - Notificação Administrativa</h1>
  </header>
  <main style="margin-bottom: 24px;">
    ${conteudoHtml}
  </main>
  <footer style="border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 0.875rem; color: #6b7280;">
    Enviado em: ${formatarData(timestamp)}
  </footer>
</body>
</html>
  `.trim();
}

/**
 * Notifica o admin quando um novo usuário se cadastra no sistema.
 */
export async function notificarNovoCadastro(dados: {
  nome: string;
  email: string;
  dataRegistro: Date;
}): Promise<{ success: boolean; error?: string }> {
  const conteudo = `
    <p><strong>Novo cadastro realizado</strong></p>
    <ul style="list-style: none; padding-left: 0;">
      <li><strong>Nome:</strong> ${dados.nome}</li>
      <li><strong>E-mail:</strong> ${dados.email}</li>
      <li><strong>Data do registro:</strong> ${formatarData(dados.dataRegistro)}</li>
    </ul>
  `;
  const html = templateBase(conteudo, new Date());
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: '[Clicksehub] Novo cadastro no sistema',
    html,
  });
}

/**
 * Notifica o admin quando um plano é adquirido (ex.: via Hotmart).
 */
export async function notificarNovaAquisicaoPlano(dados: {
  nomeUsuario: string;
  emailUsuario: string;
  nomePlano: string;
  dataAquisicao: Date;
}): Promise<{ success: boolean; error?: string }> {
  const conteudo = `
    <p><strong>Nova aquisição de plano</strong></p>
    <ul style="list-style: none; padding-left: 0;">
      <li><strong>Usuário:</strong> ${dados.nomeUsuario}</li>
      <li><strong>E-mail:</strong> ${dados.emailUsuario}</li>
      <li><strong>Plano:</strong> ${dados.nomePlano}</li>
      <li><strong>Data da aquisição:</strong> ${formatarData(dados.dataAquisicao)}</li>
    </ul>
  `;
  const html = templateBase(conteudo, new Date());
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: '[Clicksehub] Nova aquisição de plano',
    html,
  });
}

/**
 * Notifica o admin quando um plano é cancelado.
 */
export async function notificarCancelamentoPlano(dados: {
  nomeUsuario: string;
  emailUsuario: string;
  nomePlano: string;
  dataCancelamento: Date;
}): Promise<{ success: boolean; error?: string }> {
  const conteudo = `
    <p><strong>Cancelamento de plano</strong></p>
    <ul style="list-style: none; padding-left: 0;">
      <li><strong>Usuário:</strong> ${dados.nomeUsuario}</li>
      <li><strong>E-mail:</strong> ${dados.emailUsuario}</li>
      <li><strong>Plano:</strong> ${dados.nomePlano}</li>
      <li><strong>Data do cancelamento:</strong> ${formatarData(dados.dataCancelamento)}</li>
    </ul>
  `;
  const html = templateBase(conteudo, new Date());
  return sendEmail({
    to: ADMIN_EMAIL,
    subject: '[Clicksehub] Cancelamento de plano',
    html,
  });
}
