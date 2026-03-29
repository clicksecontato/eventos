'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/toast';
import { ClipboardDocumentIcon, LinkIcon } from '@heroicons/react/24/outline';
import {
  podeGerarLinkAssinaturaContrato,
  solicitarLinkAssinaturaSignatario,
} from '@/lib/utils/contrato-link-signatario-client';

type SignatarioUi = {
  id: string;
  parteId: string;
  nome: string;
  email: string;
  documento?: string | null;
  status: string;
};

type ParteUi = {
  id: string;
  papel: string;
  obrigatoria: boolean;
  ordemAssinatura?: number | null;
  signatarios: SignatarioUi[];
};

const PAPEIS_OPCOES: { value: string; label: string }[] = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'contratante', label: 'Contratante' },
  { value: 'contratada', label: 'Contratada' },
  { value: 'testemunha', label: 'Testemunha' },
  { value: 'representante', label: 'Representante' },
  { value: 'outro', label: 'Outro' },
];

const ROTULO_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  convite_enviado: 'Convite enviado',
  assinado: 'Assinado',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

export interface ContratoPartesPanelProps {
  contratoId: string;
  somenteLeitura?: boolean;
  /** Para habilitar Gerar/Copiar link (mesmas regras da lista /contratos). */
  contratoStatus: string;
  contratoPdfPath?: string | null;
  /**
   * Abre o modal de gerar link na página pai (fluxo unificado).
   * Se não for passado, mantém o POST direto na linha do signatário.
   */
  onPedidoAbrirGerarLink?: (opcoes: { signatarioId?: string; modo: 'gerar' | 'copiar' }) => void;
  /** Enquanto o modal de link está aberto (mesmo contrato), desabilita botões duplicados. */
  bloquearBotoesLink?: boolean;
}

export function ContratoPartesPanel({
  contratoId,
  somenteLeitura,
  contratoStatus,
  contratoPdfPath,
  onPedidoAbrirGerarLink,
  bloquearBotoesLink = false,
}: ContratoPartesPanelProps) {
  const { showToast } = useToast();
  const [partes, setPartes] = useState<ParteUi[]>([]);
  const [carregando, setCarregando] = useState(true);
  /** POST direto (quando não há `onPedidoAbrirGerarLink`). */
  const [linkAssinaturaOperacaoEmAndamento, setLinkAssinaturaOperacaoEmAndamento] = useState(false);
  const [novoPapel, setNovoPapel] = useState('cliente');
  const [salvandoParte, setSalvandoParte] = useState(false);
  const [formSig, setFormSig] = useState<Record<string, { nome: string; email: string; documento: string }>>({});
  const [excluirPendente, setExcluirPendente] = useState<
    null | { tipo: 'parte'; id: string } | { tipo: 'signatario'; id: string }
  >(null);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      const res = await fetch(`/api/contratos/${contratoId}/partes`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || 'Erro ao carregar partes', 'error');
        return;
      }
      const data = json.data || json;
      setPartes(Array.isArray(data.partes) ? data.partes : []);
    } catch {
      showToast('Erro de rede ao carregar partes', 'error');
    } finally {
      setCarregando(false);
    }
  }, [contratoId, showToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const obterFormSig = (parteId: string) =>
    formSig[parteId] || { nome: '', email: '', documento: '' };

  const setFormSigParte = (parteId: string, patch: Partial<{ nome: string; email: string; documento: string }>) => {
    setFormSig((prev) => ({
      ...prev,
      [parteId]: { ...obterFormSig(parteId), ...patch },
    }));
  };

  const adicionarParte = async () => {
    if (somenteLeitura || salvandoParte) return;
    try {
      setSalvandoParte(true);
      const res = await fetch(`/api/contratos/${contratoId}/partes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel: novoPapel, obrigatoria: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || 'Erro ao criar parte', 'error');
        return;
      }
      showToast('Parte adicionada', 'success');
      await carregar();
    } catch {
      showToast('Erro de rede', 'error');
    } finally {
      setSalvandoParte(false);
    }
  };

  const executarExcluirParte = async (parteId: string) => {
    try {
      const res = await fetch(`/api/contratos/${contratoId}/partes/${parteId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || 'Erro ao excluir', 'error');
        return;
      }
      showToast('Parte removida', 'success');
      await carregar();
    } catch {
      showToast('Erro de rede', 'error');
    }
  };

  const solicitarExcluirParte = (parteId: string) => {
    if (somenteLeitura) return;
    setExcluirPendente({ tipo: 'parte', id: parteId });
  };

  const adicionarSignatario = async (parteId: string) => {
    if (somenteLeitura) return;
    const f = obterFormSig(parteId);
    if (f.nome.trim().length < 2) {
      showToast('Nome do signatário inválido', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      showToast('E-mail inválido', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/contratos/${contratoId}/partes/${parteId}/signatarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: f.nome.trim(),
          email: f.email.trim(),
          documento: f.documento.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || 'Erro ao adicionar signatário', 'error');
        return;
      }
      showToast('Signatário adicionado', 'success');
      setFormSigParte(parteId, { nome: '', email: '', documento: '' });
      await carregar();
    } catch {
      showToast('Erro de rede', 'error');
    }
  };

  const executarExcluirSignatario = async (signatarioId: string) => {
    try {
      const res = await fetch(`/api/contratos/${contratoId}/signatarios/${signatarioId}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json.error || 'Erro ao remover', 'error');
        return;
      }
      showToast('Signatário removido', 'success');
      await carregar();
    } catch {
      showToast('Erro de rede', 'error');
    }
  };

  const solicitarExcluirSignatario = (signatarioId: string) => {
    if (somenteLeitura) return;
    setExcluirPendente({ tipo: 'signatario', id: signatarioId });
  };

  const acionarLinkSignatario = (signatarioId: string, modo: 'gerar' | 'copiar') => {
    if (!podeGerarLinkAssinaturaContrato(contratoStatus, contratoPdfPath)) {
      showToast('Gere o PDF do contrato antes de criar o link de assinatura.', 'error');
      return;
    }
    if (onPedidoAbrirGerarLink) {
      onPedidoAbrirGerarLink({ signatarioId, modo });
      return;
    }
    void (async () => {
      setLinkAssinaturaOperacaoEmAndamento(true);
      try {
        await solicitarLinkAssinaturaSignatario({
          contratoId,
          signatarioId,
          modo,
          showToast,
          aoConcluirComSucesso: carregar,
        });
      } finally {
        setLinkAssinaturaOperacaoEmAndamento(false);
      }
    })();
  };

  const rotuloPapel = (p: string) => PAPEIS_OPCOES.find((x) => x.value === p)?.label || p;
  const podeLinkAssinatura = podeGerarLinkAssinaturaContrato(contratoStatus, contratoPdfPath);
  const totalSignatarios = partes.reduce((n, p) => n + p.signatarios.length, 0);
  const carregandoLink = bloquearBotoesLink || linkAssinaturaOperacaoEmAndamento;

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Partes do contrato</CardTitle>
          <CardDescription>
            Defina papéis (ex.: cliente, contratante) e quem deve assinar. Na Fase 2 o fluxo é <strong>paralelo</strong>{' '}
            (ordem reservada para evolução). Ao gerar link, você pode escolher um signatário cadastrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!somenteLeitura && (
            <div className="flex flex-wrap items-end gap-2 border-b border-border pb-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Nova parte</label>
                <select
                  value={novoPapel}
                  onChange={(e) => setNovoPapel(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PAPEIS_OPCOES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" onClick={adicionarParte} disabled={salvandoParte}>
                {salvandoParte ? 'Salvando...' : 'Adicionar parte'}
              </Button>
            </div>
          )}

          {partes.length === 0 && (
            <p className="text-sm text-text-secondary">
              Nenhuma parte cadastrada. Contratos sem partes continuam podendo usar o link com nome e e-mail digitados
              manualmente.
            </p>
          )}

          {partes.map((parte) => (
            <div key={parte.id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-text-primary">{rotuloPapel(parte.papel)}</span>
                  {!parte.obrigatoria && (
                    <span className="ml-2 text-xs text-muted-foreground">(opcional)</span>
                  )}
                </div>
                {!somenteLeitura && (
                  <Button type="button" variant="outline" size="sm" onClick={() => solicitarExcluirParte(parte.id)}>
                    Excluir parte
                  </Button>
                )}
              </div>

              <ul className="mb-3 space-y-2">
                {parte.signatarios.length === 0 && (
                  <li className="text-sm text-text-secondary">Nenhum signatário nesta parte.</li>
                )}
                {parte.signatarios.map((s) => {
                  const mostrarGerar =
                    podeLinkAssinatura &&
                    (s.status === 'pendente' || s.status === 'expirado' || s.status === 'recusado');
                  const mostrarCopiar = podeLinkAssinatura && s.status === 'convite_enviado';
                  return (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{s.nome}</span>
                        <span className="text-text-secondary"> — {s.email}</span>
                        {s.documento ? (
                          <span className="block text-xs text-text-secondary">Doc.: {s.documento}</span>
                        ) : null}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ROTULO_STATUS[s.status] || s.status}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {mostrarGerar && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={carregandoLink}
                                onClick={() => acionarLinkSignatario(s.id, 'gerar')}
                              >
                                <LinkIcon className="mr-1 h-3.5 w-3.5" />
                                {carregandoLink ? '...' : 'Gerar link'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Criar link de assinatura e enviar por e-mail</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {mostrarCopiar && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                disabled={carregandoLink}
                                onClick={() => acionarLinkSignatario(s.id, 'copiar')}
                              >
                                <ClipboardDocumentIcon className="mr-1 h-3.5 w-3.5" />
                                {carregandoLink ? '...' : 'Copiar link'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gera um novo link, copia e invalida o convite anterior</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!somenteLeitura && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => solicitarExcluirSignatario(s.id)}>
                            Remover
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {!somenteLeitura && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-text-secondary">Adicionar signatário</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      placeholder="Nome completo"
                      value={obterFormSig(parte.id).nome}
                      onChange={(e) => setFormSigParte(parte.id, { nome: e.target.value })}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="E-mail"
                      value={obterFormSig(parte.id).email}
                      onChange={(e) => setFormSigParte(parte.id, { email: e.target.value })}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Documento (opcional)"
                      value={obterFormSig(parte.id).documento}
                      onChange={(e) => setFormSigParte(parte.id, { documento: e.target.value })}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => adicionarSignatario(parte.id)}>
                    Incluir signatário
                  </Button>
                </div>
              )}
            </div>
          ))}
          {podeLinkAssinatura && !somenteLeitura && onPedidoAbrirGerarLink && totalSignatarios > 0 && (
            <div className="mt-6 rounded-lg border border-dashed border-primary/35 bg-primary/5 px-4 py-4">
              <p className="text-sm font-medium text-text-primary">Pronto para enviar ao signatário?</p>
              <p className="mt-1 text-xs text-text-secondary">
                Abre o mesmo fluxo do botão superior: escolha quem assina e gere o link com confirmação por e-mail.
              </p>
              <Button
                type="button"
                className="mt-3"
                size="sm"
                disabled={carregandoLink}
                onClick={() => onPedidoAbrirGerarLink({ modo: 'gerar' })}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Gerar link de assinatura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={excluirPendente !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setExcluirPendente(null);
        }}
        title={excluirPendente?.tipo === 'parte' ? 'Excluir parte?' : 'Remover signatário?'}
        description={
          excluirPendente?.tipo === 'parte'
            ? 'Esta parte e todos os signatários vinculados serão removidos. Esta ação não pode ser desfeita.'
            : 'O signatário será removido desta parte.'
        }
        variant="destructive"
        confirmText={excluirPendente?.tipo === 'parte' ? 'Excluir parte' : 'Remover'}
        cancelText="Cancelar"
        onConfirm={() => {
          if (!excluirPendente) return;
          if (excluirPendente.tipo === 'parte') {
            void executarExcluirParte(excluirPendente.id);
          } else {
            void executarExcluirSignatario(excluirPendente.id);
          }
        }}
      />
    </div>
    </TooltipProvider>
  );
}
