'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';

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
}

export function ContratoPartesPanel({ contratoId, somenteLeitura }: ContratoPartesPanelProps) {
  const { showToast } = useToast();
  const [partes, setPartes] = useState<ParteUi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoPapel, setNovoPapel] = useState('cliente');
  const [salvandoParte, setSalvandoParte] = useState(false);
  const [formSig, setFormSig] = useState<Record<string, { nome: string; email: string; documento: string }>>({});

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

  const excluirParte = async (parteId: string) => {
    if (somenteLeitura || !confirm('Excluir esta parte e todos os signatários vinculados?')) return;
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

  const excluirSignatario = async (signatarioId: string) => {
    if (somenteLeitura || !confirm('Remover este signatário?')) return;
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

  const rotuloPapel = (p: string) => PAPEIS_OPCOES.find((x) => x.value === p)?.label || p;

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  return (
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
                  <Button type="button" variant="outline" size="sm" onClick={() => excluirParte(parte.id)}>
                    Excluir parte
                  </Button>
                )}
              </div>

              <ul className="mb-3 space-y-2">
                {parte.signatarios.length === 0 && (
                  <li className="text-sm text-text-secondary">Nenhum signatário nesta parte.</li>
                )}
                {parte.signatarios.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-text-secondary"> — {s.email}</span>
                      {s.documento ? (
                        <span className="block text-xs text-text-secondary">Doc.: {s.documento}</span>
                      ) : null}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {ROTULO_STATUS[s.status] || s.status}
                      </span>
                    </div>
                    {!somenteLeitura && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => excluirSignatario(s.id)}>
                        Remover
                      </Button>
                    )}
                  </li>
                ))}
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
        </CardContent>
      </Card>
    </div>
  );
}
