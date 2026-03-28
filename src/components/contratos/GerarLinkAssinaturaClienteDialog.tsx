'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface GerarLinkAssinaturaClienteDialogProps {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  contratoId: string;
  onSucesso?: (link: string, emailEnviado: boolean, erroEmail?: string, resendMock?: boolean) => void;
  onErro?: (mensagem: string) => void;
}

type OpcaoSignatario = { id: string; label: string };

const ROTULO_PAPEL: Record<string, string> = {
  cliente: 'Cliente',
  contratante: 'Contratante',
  contratada: 'Contratada',
  testemunha: 'Testemunha',
  representante: 'Representante',
  outro: 'Outro',
};

export function GerarLinkAssinaturaClienteDialog({
  open,
  onOpenChange,
  contratoId,
  onSucesso,
  onErro,
}: GerarLinkAssinaturaClienteDialogProps) {
  const [emailCliente, setEmailCliente] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [gerando, setGerando] = useState(false);
  const [signatariosCadastrados, setSignatariosCadastrados] = useState<OpcaoSignatario[]>([]);
  const [signatarioId, setSignatarioId] = useState('');
  const [modo, setModo] = useState<'manual' | 'cadastrado'>('manual');

  useEffect(() => {
    if (!open) return;
    setEmailCliente('');
    setNomeCliente('');
    setSignatarioId('');
    setModo('manual');
    fetch(`/api/contratos/${contratoId}/partes`)
      .then((r) => r.json())
      .then((j) => {
        const data = j.data || j;
        const partes = Array.isArray(data.partes) ? data.partes : [];
        const flat: OpcaoSignatario[] = [];
        for (const p of partes) {
          const papel = ROTULO_PAPEL[String(p.papel)] || String(p.papel);
          const sigs = Array.isArray(p.signatarios) ? p.signatarios : [];
          for (const s of sigs) {
            flat.push({
              id: String(s.id),
              label: `${s.nome} (${papel}) · ${s.email}`,
            });
          }
        }
        setSignatariosCadastrados(flat);
      })
      .catch(() => setSignatariosCadastrados([]));
  }, [open, contratoId]);

  const handleGerar = async () => {
    if (gerando) return;

    let body: Record<string, string>;

    if (modo === 'cadastrado' && signatarioId) {
      body = { signatarioId };
    } else {
      const email = emailCliente.trim();
      const nome = nomeCliente.trim();
      if (nome.length < 2) {
        onErro?.('Informe o nome do cliente (mínimo 2 caracteres).');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        onErro?.('Informe um e-mail válido. O cliente receberá o link e o código de confirmação.');
        return;
      }
      body = { emailCliente: email, nomeCliente: nome };
    }

    try {
      setGerando(true);
      const response = await fetch(`/api/contratos/${contratoId}/gerar-link-assinatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        onErro?.(result.error || 'Erro ao gerar link de assinatura');
        return;
      }

      const data = result.data || result;
      const link = String(data.link || '');
      const emailEnviado = Boolean(data.emailEnviado);
      const erroEmail = data.erroEmail ? String(data.erroEmail) : undefined;
      const resendMock = Boolean(data.resendMock);

      onSucesso?.(link, emailEnviado, erroEmail, resendMock);
      onOpenChange(false);
      setEmailCliente('');
      setNomeCliente('');
      setSignatarioId('');
    } catch {
      onErro?.('Erro de rede ao gerar link de assinatura');
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar link para cliente assinar</DialogTitle>
          <DialogDescription>
            Gere um link público para o cliente visualizar e assinar o contrato. Será obrigatório confirmar o e-mail com
            um código antes de exibir o PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {signatariosCadastrados.length > 0 && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-text-primary">Signatário</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="modoLink"
                  checked={modo === 'cadastrado'}
                  onChange={() => setModo('cadastrado')}
                />
                Usar cadastro de partes
              </label>
              {modo === 'cadastrado' && (
                <select
                  value={signatarioId}
                  onChange={(e) => setSignatarioId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {signatariosCadastrados.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="modoLink"
                  checked={modo === 'manual'}
                  onChange={() => setModo('manual')}
                />
                Informar nome e e-mail manualmente
              </label>
            </div>
          )}

          {modo === 'manual' && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-primary">Nome do cliente</label>
                <input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-primary">E-mail do cliente</label>
                <input
                  type="email"
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  placeholder="cliente@email.com"
                />
                <p className="text-xs text-muted-foreground">
                  Enviaremos o link e, na página de assinatura, um código de verificação para este e-mail.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={gerando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGerar}
            disabled={gerando || (modo === 'cadastrado' && !signatarioId)}
          >
            {gerando ? 'Gerando...' : 'Gerar link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
