import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  podeGerarLinkAssinaturaContrato,
  solicitarLinkAssinaturaSignatario,
} from './contrato-link-signatario-client';

describe('podeGerarLinkAssinaturaContrato', () => {
  it('retorna false para status que não é gerado nem assinado', () => {
    expect(podeGerarLinkAssinaturaContrato('rascunho', '/a.pdf')).toBe(false);
    expect(podeGerarLinkAssinaturaContrato('colhendo', '/a.pdf')).toBe(false);
  });

  it('retorna false quando não há pdfPath válido', () => {
    expect(podeGerarLinkAssinaturaContrato('gerado', '')).toBe(false);
    expect(podeGerarLinkAssinaturaContrato('gerado', null)).toBe(false);
    expect(podeGerarLinkAssinaturaContrato('gerado', undefined)).toBe(false);
    expect(podeGerarLinkAssinaturaContrato('gerado', '   ')).toBe(false);
  });

  it('retorna true para gerado ou assinado com pdfPath não vazio', () => {
    expect(podeGerarLinkAssinaturaContrato('gerado', '/contratos/x.pdf')).toBe(true);
    expect(podeGerarLinkAssinaturaContrato('assinado', 's3://bucket/k.pdf')).toBe(true);
  });
});

describe('solicitarLinkAssinaturaSignatario', () => {
  const showToast = vi.fn();
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let clipboardWriteText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showToast.mockClear();
    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
      writable: true,
    });
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function respostaOk(corpo: Record<string, unknown>) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(corpo),
    } as Response);
  }

  function respostaErro(mensagem?: string) {
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: mensagem || 'falha-api' }),
    } as Response);
  }

  it('chama fetch com contratoId e signatarioId no corpo', async () => {
    fetchSpy.mockImplementation(() =>
      respostaOk({ data: { link: 'https://app/assinatura/t', emailEnviado: true } })
    );
    await solicitarLinkAssinaturaSignatario({
      contratoId: 'c-uuid',
      signatarioId: 's-uuid',
      modo: 'gerar',
      showToast,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/contratos/c-uuid/gerar-link-assinatura',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatarioId: 's-uuid' }),
      })
    );
  });

  it('em erro HTTP: toast de erro e retorna false; não chama aoConcluirComSucesso', async () => {
    const cb = vi.fn();
    fetchSpy.mockImplementation(() => respostaErro());
    const ok = await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'gerar',
      showToast,
      aoConcluirComSucesso: cb,
    });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith('falha-api', 'error');
    expect(cb).not.toHaveBeenCalled();
  });

  it('modo copiar com sucesso: copia link e toast de sucesso', async () => {
    fetchSpy.mockImplementation(() =>
      respostaOk({ data: { link: 'https://exemplo/assinar/abc' } })
    );
    const ok = await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'copiar',
      showToast,
    });
    expect(ok).toBe(true);
    expect(clipboardWriteText).toHaveBeenCalledWith('https://exemplo/assinar/abc');
    expect(showToast).toHaveBeenCalledWith(
      'Link copiado. O convite anterior deixou de valer.',
      'success'
    );
  });

  it('modo copiar sem clipboard e fallback execCommand falha: exibe link no toast info', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
      writable: true,
    });
    fetchSpy.mockImplementation(() => respostaOk({ link: 'https://sem-clipboard' }));
    const ok = await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'copiar',
      showToast,
    });
    expect(ok).toBe(true);
    expect(showToast).toHaveBeenCalledWith('https://sem-clipboard', 'info');
  });

  it('modo copiar sem clipboard mas execCommand copia: toast de sucesso', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    });
    fetchSpy.mockImplementation(() => respostaOk({ link: 'https://fallback-copy' }));
    const ok = await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'copiar',
      showToast,
    });
    expect(ok).toBe(true);
    expect(showToast).toHaveBeenCalledWith(
      'Link copiado. O convite anterior deixou de valer.',
      'success'
    );
  });

  it('modo gerar com e-mail enviado: toast de sucesso e chama callback', async () => {
    const cb = vi.fn();
    fetchSpy.mockImplementation(() =>
      respostaOk({ data: { link: 'https://x', emailEnviado: true } })
    );
    const ok = await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'gerar',
      showToast,
      aoConcluirComSucesso: cb,
    });
    expect(ok).toBe(true);
    expect(showToast).toHaveBeenCalledWith('Link gerado e e-mail enviado ao signatário.', 'success');
    expect(clipboardWriteText).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('modo gerar sem e-mail: toast de erro com mensagem e copia link', async () => {
    fetchSpy.mockImplementation(() =>
      respostaOk({
        data: {
          link: 'https://fallback',
          emailEnviado: false,
          erroEmail: 'SMTP indisponível',
        },
      })
    );
    await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'gerar',
      showToast,
    });
    expect(showToast).toHaveBeenCalledWith(
      'Link gerado, mas o e-mail não foi enviado: SMTP indisponível',
      'error'
    );
    expect(clipboardWriteText).toHaveBeenCalledWith('https://fallback');
    expect(showToast).toHaveBeenCalledWith('Link copiado para a área de transferência.', 'success');
  });

  it('resendMock: toast info adicional', async () => {
    fetchSpy.mockImplementation(() =>
      respostaOk({
        data: { link: 'https://x', emailEnviado: true, resendMock: true },
      })
    );
    await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'gerar',
      showToast,
    });
    expect(showToast).toHaveBeenCalledWith(
      'RESEND_MOCK ativo: nenhum e-mail enviado. Use o link copiado ou o log do servidor.',
      'info'
    );
  });

  it('fetch rejeita: toast de rede e false', async () => {
    fetchSpy.mockRejectedValue(new Error('network'));
    const ok = await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'gerar',
      showToast,
    });
    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith('Erro de rede ao gerar link.', 'error');
  });

  it('payload direto sem wrapper data: aceita json raiz', async () => {
    fetchSpy.mockImplementation(() =>
      respostaOk({ link: 'https://raiz', emailEnviado: true })
    );
    await solicitarLinkAssinaturaSignatario({
      contratoId: 'c1',
      signatarioId: 's1',
      modo: 'copiar',
      showToast,
    });
    expect(clipboardWriteText).toHaveBeenCalledWith('https://raiz');
  });
});
