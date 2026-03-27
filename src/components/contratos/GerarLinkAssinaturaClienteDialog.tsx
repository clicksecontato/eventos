'use client';

import React, { useState } from 'react';
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

  const handleGerar = async () => {
    if (gerando) return;
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

    try {
      setGerando(true);
      const response = await fetch(`/api/contratos/${contratoId}/gerar-link-assinatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailCliente: email,
          nomeCliente: nome,
        }),
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={gerando}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleGerar} disabled={gerando}>
            {gerando ? 'Gerando...' : 'Gerar link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
