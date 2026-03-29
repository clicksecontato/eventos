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
  /** Ao abrir a partir da lista de signatários, pré-seleciona no select. */
  signatarioIdInicial?: string | null;
  /** Fluxo "Copiar link": novo link invalida o convite anterior. */
  avisoRenovarConviteAnterior?: boolean;
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
  signatarioIdInicial = null,
  avisoRenovarConviteAnterior = false,
  onSucesso,
  onErro,
}: GerarLinkAssinaturaClienteDialogProps) {
  const [emailCliente, setEmailCliente] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [gerando, setGerando] = useState(false);
  /** Signatários que ainda podem assinar (exclui já assinados). */
  const [signatariosElegiveis, setSignatariosElegiveis] = useState<OpcaoSignatario[]>([]);
  /** Há pelo menos um signatário cadastrado no contrato (inclui já assinados). */
  const [exigeSignatarioCadastrado, setExigeSignatarioCadastrado] = useState(false);
  const [signatarioId, setSignatarioId] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmailCliente('');
    setNomeCliente('');
    setSignatarioId('');
    setExigeSignatarioCadastrado(false);
    setSignatariosElegiveis([]);

    fetch(`/api/contratos/${contratoId}/partes`)
      .then((r) => r.json())
      .then((j) => {
        const data = j.data || j;
        const partes = Array.isArray(data.partes) ? data.partes : [];
        let totalCadastrados = 0;
        const elegiveis: OpcaoSignatario[] = [];
        for (const p of partes) {
          const papel = ROTULO_PAPEL[String(p.papel)] || String(p.papel);
          const sigs = Array.isArray(p.signatarios) ? p.signatarios : [];
          for (const s of sigs) {
            totalCadastrados += 1;
            if (String(s.status) !== 'assinado') {
              elegiveis.push({
                id: String(s.id),
                label: `${s.nome} (${papel}) · ${s.email}`,
              });
            }
          }
        }
        setExigeSignatarioCadastrado(totalCadastrados > 0);
        setSignatariosElegiveis(elegiveis);
      })
      .catch(() => {
        setExigeSignatarioCadastrado(false);
        setSignatariosElegiveis([]);
      });
  }, [open, contratoId]);

  useEffect(() => {
    if (!open || !signatarioIdInicial) return;
    const existe = signatariosElegiveis.some((o) => o.id === signatarioIdInicial);
    if (existe) {
      setSignatarioId(signatarioIdInicial);
    }
  }, [open, signatarioIdInicial, signatariosElegiveis]);

  const handleGerar = async () => {
    if (gerando) return;

    let body: Record<string, string>;

    if (exigeSignatarioCadastrado) {
      if (signatariosElegiveis.length === 0) {
        onErro?.('Todos os signatários cadastrados já assinaram. Inclua outro signatário nas partes para gerar um novo link.');
        return;
      }
      if (!signatarioId) {
        onErro?.('Selecione o signatário que receberá o link.');
        return;
      }
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

  const podeGerar =
    !gerando &&
    (exigeSignatarioCadastrado
      ? signatariosElegiveis.length > 0 && Boolean(signatarioId)
      : true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar link para assinar</DialogTitle>
          <DialogDescription>
            {exigeSignatarioCadastrado
              ? 'Este contrato tem signatários nas partes: o link deve ser gerado para uma pessoa cadastrada, com vínculo ao PDF e à ordem de assinatura corretas.'
              : 'Gere um link público para visualizar e assinar o contrato. Será obrigatório confirmar o e-mail com um código antes de exibir o PDF.'}
          </DialogDescription>
          {avisoRenovarConviteAnterior && exigeSignatarioCadastrado && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-text-primary">
              Ao gerar um novo link para este signatário, o convite anterior deixa de valer.
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {exigeSignatarioCadastrado && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-text-primary">Signatário</p>
              {signatariosElegiveis.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Todos os signatários cadastrados já concluíram a assinatura. Adicione um novo signatário em Partes se
                  precisar de outra assinatura.
                </p>
              ) : (
                <select
                  value={signatarioId}
                  onChange={(e) => setSignatarioId(e.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                >
                  <option value="">Selecione quem vai assinar…</option>
                  {signatariosElegiveis.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!exigeSignatarioCadastrado && (
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
          <Button type="button" onClick={handleGerar} disabled={!podeGerar}>
            {gerando ? 'Gerando...' : 'Gerar link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
