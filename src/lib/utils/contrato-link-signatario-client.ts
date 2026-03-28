'use client';

export function podeGerarLinkAssinaturaContrato(status: string, pdfPath?: string | null): boolean {
  if (status !== 'gerado' && status !== 'assinado') return false;
  return Boolean(pdfPath?.trim());
}

export type ToastTipoAssinatura = 'success' | 'error' | 'info';

/**
 * Chama `POST .../gerar-link-assinatura` com `signatarioId` e trata toasts / clipboard
 * (mesmo fluxo da lista /contratos e do painel de partes).
 */
export async function solicitarLinkAssinaturaSignatario(options: {
  contratoId: string;
  signatarioId: string;
  modo: 'gerar' | 'copiar';
  showToast: (mensagem: string, tipo?: ToastTipoAssinatura) => void;
  aoConcluirComSucesso?: () => void | Promise<void>;
}): Promise<boolean> {
  const { contratoId, signatarioId, modo, showToast, aoConcluirComSucesso } = options;
  try {
    const res = await fetch(`/api/contratos/${contratoId}/gerar-link-assinatura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signatarioId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(json.error || 'Erro ao gerar link de assinatura', 'error');
      return false;
    }
    const data = json.data || json;
    const link = String(data.link || '');
    const emailEnviado = Boolean(data.emailEnviado);
    const erroEmail = data.erroEmail ? String(data.erroEmail) : '';
    const resendMock = Boolean(data.resendMock);

    if (modo === 'copiar') {
      if (link && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        showToast('Link copiado. O convite anterior deixou de valer.', 'success');
      } else if (link) {
        showToast(link, 'info');
      }
    } else {
      if (emailEnviado) {
        showToast('Link gerado e e-mail enviado ao signatário.', 'success');
      } else {
        showToast(
          erroEmail ? `Link gerado, mas o e-mail não foi enviado: ${erroEmail}` : 'Link gerado.',
          erroEmail ? 'error' : 'info'
        );
      }
      if (!emailEnviado && link && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        showToast('Link copiado para a área de transferência.', 'success');
      }
    }

    if (resendMock) {
      showToast('RESEND_MOCK ativo: nenhum e-mail enviado. Use o link copiado ou o log do servidor.', 'info');
    }

    await aoConcluirComSucesso?.();
    return true;
  } catch {
    showToast('Erro de rede ao gerar link.', 'error');
    return false;
  }
}
