'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function obterCoordenadas(
  canvas: HTMLCanvasElement,
  evento: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const escalaX = canvas.width / rect.width;
  const escalaY = canvas.height / rect.height;
  if ('touches' in evento) {
    const t = evento.touches[0] || evento.changedTouches[0];
    return { x: (t.clientX - rect.left) * escalaX, y: (t.clientY - rect.top) * escalaY };
  }
  return {
    x: (evento.nativeEvent.clientX - rect.left) * escalaX,
    y: (evento.nativeEvent.clientY - rect.top) * escalaY,
  };
}

type DadosAssinatura = {
  contratoId: string;
  numeroContrato?: string;
  statusContrato?: string;
  pdfUrl?: string;
  nomeCliente?: string;
  emailCliente?: string;
  emailClienteOculto?: string;
  expiraEm: string;
  requiresOtp?: boolean;
};

export default function AssinaturaContratoPublicaPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAssinatura | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [codigoOtp, setCodigoOtp] = useState('');
  /** Preenchido pela API quando RESEND_MOCK está ativo (somente desenvolvimento). */
  const [codigoOtpDesenvolvimento, setCodigoOtpDesenvolvimento] = useState<string | null>(null);
  const [enviandoOtp, setEnviandoOtp] = useState(false);
  const [verificandoOtp, setVerificandoOtp] = useState(false);
  const [ciencia, setCiencia] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [pdfFinalUrl, setPdfFinalUrl] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhandoRef = useRef(false);

  const prepararCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    prepararCanvas();
  }, [prepararCanvas]);

  const carregarDados = useCallback(async () => {
    const res = await fetch(`/api/assinatura/contrato/${token}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(json.error || 'Não foi possível carregar o link.');
      return null;
    }
    const data = json.data || json;
    setDados(data);
    setNome(data.nomeCliente || '');
    setEmail(data.emailCliente || '');
    setEmailOtp(data.emailCliente || '');
    setErro(null);
    return data as DadosAssinatura;
  }, [token]);

  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);
        await carregarDados();
      } catch {
        setErro('Erro de rede ao carregar link de assinatura.');
      } finally {
        setLoading(false);
      }
    };
    if (token) carregar();
  }, [token, carregarDados]);

  const enviarCodigoOtp = async () => {
    const e = emailOtp.trim();
    if (!e) {
      setErro('Informe o e-mail cadastrado no convite.');
      return;
    }
    try {
      setEnviandoOtp(true);
      setErro(null);
      const res = await fetch(`/api/assinatura/contrato/${token}/enviar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error || 'Não foi possível enviar o código.');
        return;
      }
      const data = json.data || json;
      const codigoDev = typeof data.codigoOtpDesenvolvimento === 'string' ? data.codigoOtpDesenvolvimento : null;
      if (codigoDev) {
        setCodigoOtpDesenvolvimento(codigoDev);
        setCodigoOtp(codigoDev);
      } else {
        setCodigoOtpDesenvolvimento(null);
      }
      setErro(null);
    } catch {
      setErro('Erro de rede ao enviar código.');
    } finally {
      setEnviandoOtp(false);
    }
  };

  const verificarCodigoOtp = async () => {
    const e = emailOtp.trim();
    const c = codigoOtp.replace(/\D/g, '').slice(0, 6);
    if (!e || c.length !== 6) {
      setErro('Informe o e-mail e o código de 6 dígitos.');
      return;
    }
    try {
      setVerificandoOtp(true);
      setErro(null);
      const res = await fetch(`/api/assinatura/contrato/${token}/verificar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, codigo: c }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error || 'Código inválido.');
        return;
      }
      await carregarDados();
    } catch {
      setErro('Erro de rede ao verificar código.');
    } finally {
      setVerificandoOtp(false);
    }
  };

  const iniciar = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    desenhandoRef.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = obterCoordenadas(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const mover = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!desenhandoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = obterCoordenadas(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const limpar = () => prepararCanvas();

  const confirmarAssinatura = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !dados || enviando) return;
    if (!ciencia) {
      setErro('Marque a caixa declarando ciência do documento e concordância com a assinatura.');
      return;
    }
    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    if (nomeTrim.length < 2) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setErro('Informe um e-mail válido.');
      return;
    }

    const imagemBase64 = canvas.toDataURL('image/png');
    if (Math.floor((imagemBase64.length * 3) / 4) < 500) {
      setErro('Desenhe sua assinatura antes de confirmar.');
      return;
    }

    try {
      setEnviando(true);
      setErro(null);
      const res = await fetch(`/api/assinatura/contrato/${token}/assinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagemBase64,
          nomeSignatario: nomeTrim,
          emailSignatario: emailTrim,
          cienciaDeclarada: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error || 'Não foi possível concluir a assinatura.');
        return;
      }
      const payload = json.data || json;
      setPdfFinalUrl(payload.pdfUrl || '');
      setSucesso(true);
    } catch {
      setErro('Erro de rede ao assinar contrato.');
    } finally {
      setEnviando(false);
    }
  };

  if (loading && !dados) {
    return <div className="p-8 text-center">Carregando contrato...</div>;
  }

  if (erro && !dados) {
    return <div className="p-8 text-center text-red-600">{erro}</div>;
  }

  if (sucesso) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Contrato assinado com sucesso</CardTitle>
            <CardDescription>Obrigado! A assinatura foi registrada.</CardDescription>
          </CardHeader>
          <CardContent>
            {pdfFinalUrl && (
              <Button onClick={() => window.open(pdfFinalUrl, '_blank')}>Abrir PDF assinado</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const precisaOtp = Boolean(dados?.requiresOtp);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <Card className="mb-4 border-muted">
        <CardHeader>
          <CardTitle className="text-lg">Transparência</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Esta página oferece <strong>assinatura eletrônica</strong> conforme a Lei nº 14.063/2020, com registro de
            dados de confirmação e integridade do PDF. <strong>Não</strong> se trata de assinatura qualificada com
            certificado ICP-Brasil nem de assinatura digital nos termos da MP 2.200-2/2001.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Assinatura de contrato</CardTitle>
          <CardDescription>
            {dados?.numeroContrato ? `Contrato ${dados.numeroContrato}` : 'Contrato'} — siga as etapas abaixo.
          </CardDescription>
        </CardHeader>
      </Card>

      {precisaOtp && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Confirmar e-mail</CardTitle>
            <CardDescription>
              Enviamos o convite para <strong>{dados?.emailClienteOculto || 'seu e-mail'}</strong>. Informe o mesmo
              e-mail e o código de 6 dígitos recebido para desbloquear a visualização do PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="email"
              className="w-full rounded border px-3 py-2"
              placeholder="Seu e-mail (mesmo do convite)"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value)}
              autoComplete="email"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={enviarCodigoOtp} disabled={enviandoOtp}>
                {enviandoOtp ? 'Enviando...' : 'Enviar código'}
              </Button>
            </div>
            {codigoOtpDesenvolvimento && (
              <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                <strong>Modo desenvolvimento:</strong> e-mail não enviado. Use o código{' '}
                <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-base dark:bg-amber-900/50">
                  {codigoOtpDesenvolvimento}
                </code>{' '}
                (também no terminal do servidor). Não use <code>RESEND_MOCK</code> em produção.
              </div>
            )}
            <input
              className="w-full max-w-xs rounded border px-3 py-2 tracking-widest"
              placeholder="Código de 6 dígitos"
              inputMode="numeric"
              maxLength={8}
              value={codigoOtp}
              onChange={(e) => setCodigoOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <div>
              <Button type="button" onClick={verificarCodigoOtp} disabled={verificandoOtp}>
                {verificandoOtp ? 'Verificando...' : 'Confirmar código'}
              </Button>
            </div>
            {erro && precisaOtp && <p className="text-sm text-red-600">{erro}</p>}
          </CardContent>
        </Card>
      )}

      {!precisaOtp && dados?.pdfUrl && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <iframe src={dados.pdfUrl} className="h-[500px] w-full rounded border" title="Pré-visualização do contrato" />
          </CardContent>
        </Card>
      )}

      {!precisaOtp && dados?.pdfUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmação da assinatura</CardTitle>
            <CardDescription>
              Os dados devem coincidir com o convite. Ao assinar, você declara ciência do conteúdo do documento
              exibido acima.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome completo</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Nome do signatário"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">E-mail</label>
                <input
                  type="email"
                  className="w-full rounded border px-3 py-2"
                  placeholder="E-mail do signatário"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border"
                checked={ciencia}
                onChange={(e) => setCiencia(e.target.checked)}
              />
              <span>
                Li o documento exibido, compreendi seu conteúdo e concordo em assinar eletronicamente, na forma da Lei
                14.063/2020, ciente de que esta assinatura não utiliza certificado ICP-Brasil.
              </span>
            </label>

            <div className="rounded border bg-muted/30 p-2">
              <canvas
                ref={canvasRef}
                width={440}
                height={160}
                className="w-full touch-none rounded bg-white"
                onMouseDown={iniciar}
                onMouseMove={mover}
                onMouseUp={() => {
                  desenhandoRef.current = false;
                }}
                onMouseLeave={() => {
                  desenhandoRef.current = false;
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  iniciar(e);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  mover(e);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  desenhandoRef.current = false;
                }}
              />
            </div>

            {erro && !precisaOtp && <p className="text-sm text-red-600">{erro}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={limpar} disabled={enviando}>
                Limpar
              </Button>
              <Button onClick={confirmarAssinatura} disabled={enviando}>
                {enviando ? 'Enviando assinatura...' : 'Confirmar assinatura'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
