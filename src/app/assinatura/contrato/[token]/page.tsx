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
  pdfUrl: string;
  nomeCliente?: string;
  emailCliente?: string;
  expiraEm: string;
};

export default function AssinaturaContratoPublicaPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAssinatura | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
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

  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/assinatura/contrato/${token}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErro(json.error || 'Não foi possível carregar o link.');
          return;
        }
        const data = json.data || json;
        setDados(data);
        setNome(data.nomeCliente || '');
        setEmail(data.emailCliente || '');
      } catch {
        setErro('Erro de rede ao carregar link de assinatura.');
      } finally {
        setLoading(false);
      }
    };
    if (token) carregar();
  }, [token]);

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
          nomeSignatario: nome,
          emailSignatario: email,
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

  if (loading) {
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

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Assinatura de contrato</CardTitle>
          <CardDescription>
            {dados?.numeroContrato ? `Contrato ${dados.numeroContrato}` : 'Contrato'} - Assine no quadro abaixo.
          </CardDescription>
        </CardHeader>
      </Card>

      {dados?.pdfUrl && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <iframe src={dados.pdfUrl} className="h-[500px] w-full rounded border" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Confirmação da assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="rounded border px-3 py-2"
              placeholder="Nome do signatário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              className="rounded border px-3 py-2"
              placeholder="E-mail do signatário (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

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

          {erro && <p className="text-sm text-red-600">{erro}</p>}

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
    </div>
  );
}

