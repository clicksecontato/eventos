'use client';

/**
 * Tenta copiar via Clipboard API; se indisponível ou falhar, usa textarea + execCommand (HTTP / alguns browsers).
 */
export async function tentarCopiarParaAreaTransferencia(texto: string): Promise<boolean> {
  const t = texto.trim();
  if (!t) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch {
      /* fallback abaixo */
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '2em';
    ta.style.height = '2em';
    ta.style.opacity = '0';
    ta.style.padding = '0';
    ta.style.border = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

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
      if (link) {
        const copiou = await tentarCopiarParaAreaTransferencia(link);
        if (copiou) {
          showToast('Link copiado. O convite anterior deixou de valer.', 'success');
        } else {
          showToast(link, 'info');
        }
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
      if (!emailEnviado && link) {
        const copiou = await tentarCopiarParaAreaTransferencia(link);
        if (copiou) {
          showToast('Link copiado para a área de transferência.', 'success');
        }
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
