import 'server-only';

import { createHash, randomBytes } from 'crypto';

export type StatusConviteAssinatura = 'pendente' | 'acessado' | 'assinado' | 'expirado' | 'cancelado';

export function gerarTokenAssinaturaCliente(): string {
  return randomBytes(32).toString('hex');
}

export function hashTokenAssinaturaCliente(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function obterBaseUrlAssinatura(requestUrl?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl?.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (requestUrl) {
    try {
      const u = new URL(requestUrl);
      return `${u.protocol}//${u.host}`;
    } catch {
      // fallback abaixo
    }
  }
  return 'http://localhost:3000';
}

export function montarLinkAssinaturaCliente(token: string, requestUrl?: string): string {
  return `${obterBaseUrlAssinatura(requestUrl)}/assinatura/contrato/${token}`;
}

export function calcularExpiracaoHoras(horas: number = 72): Date {
  const limite = Number.isFinite(horas) ? Math.max(1, Math.min(240, Math.floor(horas))) : 72;
  return new Date(Date.now() + limite * 60 * 60 * 1000);
}

export function templateEmailAssinaturaCliente(params: {
  nomeCliente?: string;
  numeroContrato?: string;
  link: string;
  expiraEm: Date;
}): string {
  const nome = params.nomeCliente?.trim() || 'cliente';
  const tituloContrato = params.numeroContrato?.trim() || 'contrato';
  const validade = params.expiraEm.toLocaleString('pt-BR');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background:#f5f5f5; padding:24px;">
  <div style="max-width:640px; margin:0 auto; background:#fff; border-radius:8px; padding:24px;">
    <h2 style="margin:0 0 12px 0;">Assinatura de contrato</h2>
    <p>Olá, ${nome}.</p>
    <p>Você recebeu um convite para visualizar e assinar o ${tituloContrato}.</p>
    <p>
      <a href="${params.link}" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 18px; border-radius:6px;">
        Visualizar e assinar contrato
      </a>
    </p>
    <p>Se preferir, copie e cole este link no navegador:</p>
    <p style="word-break:break-all; background:#f9fafb; padding:10px; border-radius:6px;">${params.link}</p>
    <p style="color:#6b7280; font-size:12px;">Este link expira em: ${validade}</p>
  </div>
</body>
</html>`.trim();
}

