'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface AssinaturaContratoDialogProps {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  contratoId: string;
  onAssinaturaConcluida?: () => void;
  onErro?: (mensagem: string) => void;
}

const LARGURA_CANVAS = 440;
const ALTURA_CANVAS = 160;

function obterCoordenadas(
  canvas: HTMLCanvasElement,
  evento: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const escalaX = canvas.width / rect.width;
  const escalaY = canvas.height / rect.height;

  if ('touches' in evento) {
    const t = evento.touches[0] || evento.changedTouches[0];
    return {
      x: (t.clientX - rect.left) * escalaX,
      y: (t.clientY - rect.top) * escalaY,
    };
  }
  return {
    x: (evento.nativeEvent.clientX - rect.left) * escalaX,
    y: (evento.nativeEvent.clientY - rect.top) * escalaY,
  };
}

export function AssinaturaContratoDialog({
  open,
  onOpenChange,
  contratoId,
  onAssinaturaConcluida,
  onErro,
}: AssinaturaContratoDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhandoRef = useRef(false);
  const [enviando, setEnviando] = useState(false);

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
    if (open) {
      prepararCanvas();
    }
  }, [open, prepararCanvas]);

  const iniciarTraco = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      desenhandoRef.current = true;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { x, y } = obterCoordenadas(canvas, e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    []
  );

  const continuarTraco = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!desenhandoRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { x, y } = obterCoordenadas(canvas, e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    []
  );

  const finalizarTraco = useCallback(() => {
    desenhandoRef.current = false;
  }, []);

  const limpar = useCallback(() => {
    prepararCanvas();
  }, [prepararCanvas]);

  const confirmar = async () => {
    const canvas = canvasRef.current;
    if (!canvas || enviando) return;

    const dataUrl = canvas.toDataURL('image/png');
    const tamanhoAproximado = Math.floor((dataUrl.length * 3) / 4);
    if (tamanhoAproximado < 500) {
      onErro?.('Desenhe sua assinatura no quadro antes de confirmar.');
      return;
    }

    try {
      setEnviando(true);
      const response = await fetch(`/api/contratos/${contratoId}/assinar-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64: dataUrl }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg =
          typeof payload.error === 'string'
            ? payload.error
            : 'Não foi possível assinar o PDF.';
        onErro?.(msg);
        return;
      }

      const data = payload.data ?? payload;
      const urlPdf =
        data && typeof data === 'object' && 'pdfUrl' in data
          ? String((data as { pdfUrl?: string }).pdfUrl || '')
          : '';
      if (urlPdf) {
        window.open(urlPdf, '_blank');
      }

      onOpenChange(false);
      onAssinaturaConcluida?.();
    } catch {
      onErro?.('Erro de rede ao assinar o PDF.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assinar contrato no PDF</DialogTitle>
          <DialogDescription>
            Desenhe sua assinatura no quadro abaixo. Ela será incorporada ao PDF junto com data e
            dados de auditoria (Lei 14.063/2020).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <canvas
              ref={canvasRef}
              width={LARGURA_CANVAS}
              height={ALTURA_CANVAS}
              className="w-full touch-none cursor-crosshair rounded bg-white"
              style={{ maxHeight: ALTURA_CANVAS }}
              onMouseDown={iniciarTraco}
              onMouseMove={continuarTraco}
              onMouseUp={finalizarTraco}
              onMouseLeave={finalizarTraco}
              onTouchStart={(e) => {
                e.preventDefault();
                iniciarTraco(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                continuarTraco(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                finalizarTraco();
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Use o dedo em dispositivos móveis ou o mouse no computador.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={limpar} disabled={enviando}>
            Limpar
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Assinando...' : 'Confirmar assinatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
