import crypto from 'crypto';

/**
 * Serviço de email personalizado
 * Gera tokens curtos e envia emails em português
 */

/**
 * Gerar token curto e seguro
 */
export function generateShortToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Gerar template de email de reset de senha em português
 */
export function generatePasswordResetEmailTemplate(
  nome: string,
  resetUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - Clicksehub</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #e5e5e5;">
              <h1 style="margin: 0; color: #2563eb; font-size: 32px; font-weight: bold;">
                <span style="color: #2563eb;">Clickse</span><span style="color: #FF4001;">hub</span>
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Olá${nome ? `, ${nome}` : ''}!
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Clicksehub</strong>.
              </p>
              
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ou copie e cole este link no seu navegador:
              </p>
              
              <p style="margin: 0 0 30px; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; color: #4b5563; font-size: 14px; line-height: 1.6;">
                ${resetUrl}
              </p>
              
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Importante:</strong>
              </p>
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Este link é válido por <strong>1 hora</strong></li>
                <li>Se você não solicitou esta redefinição, ignore este email</li>
                <li>Sua senha não será alterada até que você clique no link acima</li>
              </ul>
              
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                Por segurança, este link expirará automaticamente após 1 hora.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Este é um email automático, por favor não responda.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} Clicksehub. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Template de email para primeiro acesso (pós-compra Hotmart): boas-vindas + link para definir senha
 */
export function generateFirstAccessEmailTemplate(nome: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Clicksehub - Defina sua senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #e5e5e5;">
              <h1 style="margin: 0; color: #2563eb; font-size: 32px; font-weight: bold;">
                <span style="color: #2563eb;">Clickse</span><span style="color: #FF4001;">hub</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Olá${nome ? `, ${nome}` : ''}!
              </h2>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Sua compra foi confirmada e sua conta no <strong>Clicksehub</strong> está pronta.
              </p>
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Para acessar o sistema: <a href="${APP_URL}/painel" style="color: #2563eb;">${APP_URL}/painel</a>
              </p>
              <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Como é seu primeiro acesso, você precisa definir uma senha. Clique no botão abaixo:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Definir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ou copie e cole no navegador: <span style="word-break: break-all; color: #4b5563;">${resetUrl}</span>
              </p>
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Importante:</strong> este link é válido por <strong>24 horas</strong>. Se expirar, acesse o sistema e use <strong>Esqueci minha senha</strong> com o mesmo e-mail da compra para receber um novo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Este é um email automático, por favor não responda.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                © ${new Date().getFullYear()} Clicksehub. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

