'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import PlanOverlay from '@/components/PlanOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ApiClientError, getJson } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useAgendamentoProfissionais, useAllEventos, useAllServicos } from '@/hooks/useData';
import AlocacaoFormDialog, { AlocacaoFormValues } from '@/components/agendamento/AlocacaoFormDialog';
import { AgendamentoAlocacao, AgendamentoBloqueio, AgendamentoDisponibilidade } from '@/types';
import { Select } from '@/components/ui/select';

type AlocacaoEnriquecida = AgendamentoAlocacao & {
  eventoNome: string;
  clienteNome: string;
  servicoNome?: string;
};

interface AgendaProfissionalPayload {
  alocacoes: AgendamentoAlocacao[];
  bloqueios: AgendamentoBloqueio[];
  disponibilidades: AgendamentoDisponibilidade[];
  disponibilidadesDia: AgendamentoDisponibilidade[];
}

function normalizarAgendaPayload(payload: AgendaProfissionalPayload): AgendaProfissionalPayload {
  return {
    alocacoes: (payload.alocacoes || []).map((item) => ({
      ...item,
      inicioTs: item.inicioTs instanceof Date ? item.inicioTs : new Date(item.inicioTs),
      fimTs: item.fimTs instanceof Date ? item.fimTs : new Date(item.fimTs),
      dataCadastro: item.dataCadastro instanceof Date ? item.dataCadastro : new Date(item.dataCadastro),
      dataAtualizacao: item.dataAtualizacao instanceof Date ? item.dataAtualizacao : new Date(item.dataAtualizacao)
    })),
    bloqueios: (payload.bloqueios || []).map((item) => ({
      ...item,
      inicioTs: item.inicioTs instanceof Date ? item.inicioTs : new Date(item.inicioTs),
      fimTs: item.fimTs instanceof Date ? item.fimTs : new Date(item.fimTs),
      dataCadastro: item.dataCadastro instanceof Date ? item.dataCadastro : new Date(item.dataCadastro),
      dataAtualizacao: item.dataAtualizacao instanceof Date ? item.dataAtualizacao : new Date(item.dataAtualizacao)
    })),
    disponibilidades: payload.disponibilidades || [],
    disponibilidadesDia: payload.disponibilidadesDia || []
  };
}

function toDatetimeLocal(date: Date): string {
  const data = new Date(date);
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function parseHoraToMinutes(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatDateToInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDiaLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatHoraLabel(hora: number, minuto: number): string {
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function AgendamentoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const segundaAtual = getMonday(new Date());
  const [profissionalId, setProfissionalId] = useState('');
  const [semanaInicio, setSemanaInicio] = useState(formatDateToInput(segundaAtual));

  const [formOpen, setFormOpen] = useState(false);
  const [alocacaoSelecionada, setAlocacaoSelecionada] = useState<AlocacaoEnriquecida | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [agendaProfissional, setAgendaProfissional] = useState<AgendaProfissionalPayload>({
    alocacoes: [],
    bloqueios: [],
    disponibilidades: [],
    disponibilidadesDia: []
  });
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [rascunhoCriacao, setRascunhoCriacao] = useState<Pick<AlocacaoFormValues, 'inicio' | 'fim'>>({
    inicio: '',
    fim: ''
  });

  const { data: eventos, loading: loadingEventos, refetch: refetchEventos } = useAllEventos();
  const { data: profissionais, loading: loadingProfissionais, refetch: refetchProfissionais } = useAgendamentoProfissionais();
  const { data: servicos, loading: loadingServicos, refetch: refetchServicos } = useAllServicos();

  const atualizarQuery = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    router.replace(query ? `/agendamento?${query}` : '/agendamento');
  }, [router, searchParams]);

  useEffect(() => {
    const profissionalParam = searchParams.get('profissionalId') || '';
    const inicioParam = searchParams.get('inicio');
    const inicioDefault = formatDateToInput(getMonday(new Date()));
    setProfissionalId((atual) => (atual === profissionalParam ? atual : profissionalParam));
    setSemanaInicio((atual) => (atual === (inicioParam || inicioDefault) ? atual : (inicioParam || inicioDefault)));
  }, [searchParams]);

  useEffect(() => {
    if (!profissionalId && profissionais && profissionais.length > 0) {
      setProfissionalId(profissionais[0].id);
    }
  }, [profissionais, profissionalId]);

  const profissionaisOpcoes = useMemo(() => {
    return (profissionais || []).map((item) => ({ value: item.id, label: item.nome }));
  }, [profissionais]);

  const eventosOpcoes = useMemo(() => {
    return (eventos || []).map((evento) => ({
      value: evento.id,
      label: `${evento.nomeEvento || evento.cliente?.nome || 'Evento'} - ${evento.cliente?.nome || 'Cliente'}`
    }));
  }, [eventos]);

  const servicosPorEventoMap = useMemo(() => {
    const map = new Map<string, Array<{ value: string; label: string }>>();
    (servicos || []).forEach((item) => {
      const label = item.tipoServico?.nome || 'Serviço';
      const list = map.get(item.eventoId) || [];
      list.push({ value: item.id, label });
      map.set(item.eventoId, list);
    });
    return map;
  }, [servicos]);

  const alocacoesEnriquecidas = useMemo<AlocacaoEnriquecida[]>(() => {
    const eventoMap = new Map((eventos || []).map((e) => [e.id, e]));
    const servicoMap = new Map((servicos || []).map((s) => [s.id, s]));
    return agendaProfissional.alocacoes.map((alocacao) => {
      const evento = eventoMap.get(alocacao.eventoId);
      const servico = alocacao.servicoEventoId ? servicoMap.get(alocacao.servicoEventoId) : null;
      return {
        ...alocacao,
        eventoNome: evento?.nomeEvento || evento?.cliente?.nome || 'Evento',
        clienteNome: evento?.cliente?.nome || 'Cliente',
        servicoNome: servico?.tipoServico?.nome
      };
    });
  }, [agendaProfissional.alocacoes, eventos, servicos]);

  const resumo = useMemo(() => {
    return {
      total: alocacoesEnriquecidas.length,
      agendados: alocacoesEnriquecidas.filter((i) => i.status === 'agendado').length,
      confirmados: alocacoesEnriquecidas.filter((i) => i.status === 'confirmado').length,
      cancelados: alocacoesEnriquecidas.filter((i) => i.status === 'cancelado').length
    };
  }, [alocacoesEnriquecidas]);

  const loading = loadingEventos || loadingProfissionais || loadingServicos || loadingAgenda;

  const semanaInicioDate = useMemo(() => {
    return getMonday(new Date(`${semanaInicio}T00:00:00`));
  }, [semanaInicio]);

  const semanaFimDate = useMemo(() => addDays(semanaInicioDate, 6), [semanaInicioDate]);

  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDays(semanaInicioDate, idx));
  }, [semanaInicioDate]);

  const horarios = useMemo(() => {
    const slots: Array<{ hora: number; minuto: number; label: string }> = [];
    for (let h = 7; h <= 22; h += 1) {
      slots.push({ hora: h, minuto: 0, label: formatHoraLabel(h, 0) });
      if (h !== 22) {
        slots.push({ hora: h, minuto: 30, label: formatHoraLabel(h, 30) });
      }
    }
    return slots;
  }, []);

  const carregarAgenda = useCallback(async () => {
    if (!profissionalId) {
      setAgendaProfissional({
        alocacoes: [],
        bloqueios: [],
        disponibilidades: [],
        disponibilidadesDia: []
      });
      return;
    }
    try {
      setLoadingAgenda(true);
      const inicioIso = semanaInicioDate.toISOString();
      const fimIso = addDays(semanaFimDate, 1).toISOString();
      const data = await getJson<AgendaProfissionalPayload>(
        `/api/agendamento/disponibilidade?profissionalId=${profissionalId}&inicio=${encodeURIComponent(inicioIso)}&fim=${encodeURIComponent(fimIso)}`
      );
      setAgendaProfissional(normalizarAgendaPayload(data));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao carregar agenda do profissional', 'error');
    } finally {
      setLoadingAgenda(false);
    }
  }, [profissionalId, semanaInicioDate, semanaFimDate, showToast]);

  useEffect(() => {
    carregarAgenda();
  }, [carregarAgenda]);

  const refetchTudo = async () => {
    await Promise.all([
      refetchEventos(),
      refetchProfissionais(),
      refetchServicos()
    ]);
    await carregarAgenda();
  };

  const abrirCriacao = (inicio?: Date, fim?: Date) => {
    setModoEdicao(false);
    setAlocacaoSelecionada(null);
    setRascunhoCriacao({
      inicio: inicio ? toDatetimeLocal(inicio) : '',
      fim: fim ? toDatetimeLocal(fim) : ''
    });
    setFormOpen(true);
  };

  const abrirEdicao = (item: AlocacaoEnriquecida) => {
    setModoEdicao(true);
    setAlocacaoSelecionada(item);
    setFormOpen(true);
  };

  const valoresIniciaisForm: AlocacaoFormValues = useMemo(() => {
    if (!alocacaoSelecionada || !modoEdicao) {
      return {
        eventoId: searchParams.get('eventoId') || eventos?.[0]?.id || '',
        profissionalId: profissionalId || searchParams.get('profissionalId') || profissionais?.[0]?.id || '',
        servicoEventoId: undefined,
        status: 'agendado',
        inicio: rascunhoCriacao.inicio,
        fim: rascunhoCriacao.fim,
        observacoes: ''
      };
    }

    return {
      id: alocacaoSelecionada.id,
      eventoId: alocacaoSelecionada.eventoId,
      profissionalId: alocacaoSelecionada.profissionalId,
      servicoEventoId: alocacaoSelecionada.servicoEventoId,
      status: alocacaoSelecionada.status,
      inicio: toDatetimeLocal(alocacaoSelecionada.inicioTs),
      fim: toDatetimeLocal(alocacaoSelecionada.fimTs),
      observacoes: alocacaoSelecionada.observacoes || ''
    };
  }, [alocacaoSelecionada, modoEdicao, eventos, profissionais, searchParams, profissionalId, rascunhoCriacao]);

  const handleSalvarAlocacao = async (values: AlocacaoFormValues) => {
    if (new Date(values.inicio) >= new Date(values.fim)) {
      showToast('O horário de fim deve ser maior que o horário de início', 'error');
      return;
    }

    try {
      if (modoEdicao && values.id) {
        await getJson('/api/agendamento/alocacoes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: values.id,
            profissionalId: values.profissionalId,
            servicoEventoId: values.servicoEventoId,
            status: values.status,
            inicioTs: new Date(values.inicio).toISOString(),
            fimTs: new Date(values.fim).toISOString(),
            observacoes: values.observacoes || undefined
          })
        });
        showToast('Alocação atualizada com sucesso', 'success');
      } else {
        await getJson('/api/agendamento/alocacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventoId: values.eventoId,
            profissionalId: values.profissionalId,
            servicoEventoId: values.servicoEventoId,
            status: values.status,
            inicioTs: new Date(values.inicio).toISOString(),
            fimTs: new Date(values.fim).toISOString(),
            observacoes: values.observacoes || undefined
          })
        });
        showToast('Alocação criada com sucesso', 'success');
      }
      await refetchTudo();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        showToast(error.message || 'Conflito de horário para o profissional', 'error');
        return;
      }
      showToast(error instanceof Error ? error.message : 'Erro ao salvar alocação', 'error');
    }
  };

  const isSlotDentroDisponibilidade = useCallback((slotStart: Date, slotEnd: Date) => {
    const diaSemana = slotStart.getDay();
    const inicioSlotMin = slotStart.getHours() * 60 + slotStart.getMinutes();
    const fimSlotMin = slotEnd.getHours() * 60 + slotEnd.getMinutes();
    return agendaProfissional.disponibilidades.some((disp) => {
      if (!disp.ativo || disp.diaSemana !== diaSemana) return false;
      const inicioDisp = parseHoraToMinutes(disp.horaInicio);
      const fimDisp = parseHoraToMinutes(disp.horaFim);
      return inicioSlotMin >= inicioDisp && fimSlotMin <= fimDisp;
    });
  }, [agendaProfissional.disponibilidades]);

  const getAlocacaoSlot = useCallback((slotStart: Date, slotEnd: Date) => {
    return alocacoesEnriquecidas.find((item) =>
      item.status !== 'cancelado'
      && item.inicioTs < slotEnd
      && item.fimTs > slotStart
    );
  }, [alocacoesEnriquecidas]);

  const hasBloqueioSlot = useCallback((slotStart: Date, slotEnd: Date) => {
    return agendaProfissional.bloqueios.some((bloq) =>
      bloq.inicioTs < slotEnd && bloq.fimTs > slotStart
    );
  }, [agendaProfissional.bloqueios]);

  return (
    <Layout>
      <PlanOverlay>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Agendamento</h1>
              <p className="text-text-secondary">Visualização semanal por profissional (estilo board de agenda).</p>
            </div>
            <Button onClick={() => abrirCriacao()} className="btn-add" size="icon">
              <PlusIcon className="h-5 w-5" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select
                  label="Profissional"
                  value={profissionalId}
                  onValueChange={(value) => {
                    setProfissionalId(value);
                    atualizarQuery({ profissionalId: value || undefined });
                  }}
                  options={profissionaisOpcoes}
                />
                <div className="md:col-span-2 flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const anterior = addDays(semanaInicioDate, -7);
                      const valor = formatDateToInput(anterior);
                      setSemanaInicio(valor);
                      atualizarQuery({ inicio: valor });
                    }}
                  >
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    Semana anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const atual = formatDateToInput(getMonday(new Date()));
                      setSemanaInicio(atual);
                      atualizarQuery({ inicio: atual });
                    }}
                  >
                    Semana atual
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const proxima = addDays(semanaInicioDate, 7);
                      const valor = formatDateToInput(proxima);
                      setSemanaInicio(valor);
                      atualizarQuery({ inicio: valor });
                    }}
                  >
                    Próxima semana
                    <ChevronRightIcon className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-sm text-text-secondary">
                Semana de {semanaInicioDate.toLocaleDateString('pt-BR')} até {semanaFimDate.toLocaleDateString('pt-BR')} | Total: {resumo.total} (Agendados: {resumo.agendados}, Confirmados: {resumo.confirmados}, Cancelados: {resumo.cancelados})
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-1 text-success-text">Livre (clicável)</span>
                <span className="inline-flex items-center rounded-full bg-info-bg px-2 py-1 text-info-text">Alocado (clicar para editar)</span>
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-red-800 dark:bg-red-900/40 dark:text-red-200">Bloqueado</span>
                <span className="inline-flex items-center rounded-full bg-surface px-2 py-1 text-text-secondary border border-border">Indisponível</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agenda semanal</CardTitle>
            </CardHeader>
            <CardContent>
              {!profissionalId && (
                <p className="text-text-secondary">Selecione um profissional para visualizar a agenda.</p>
              )}
              {loading && <p className="text-text-secondary">Carregando agenda...</p>}
              {!loading && profissionalId && (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-surface border border-border px-2 py-2 text-left text-xs font-semibold text-text-secondary">Horário</th>
                        {diasSemana.map((dia) => (
                          <th key={dia.toISOString()} className="border border-border px-2 py-2 text-left text-xs font-semibold text-text-secondary">
                            {formatDiaLabel(dia)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {horarios.map((slot) => (
                        <tr key={slot.label}>
                          <td className="sticky left-0 z-10 bg-surface border border-border px-2 py-2 text-xs text-text-secondary">{slot.label}</td>
                          {diasSemana.map((dia) => {
                            const slotStart = new Date(dia);
                            slotStart.setHours(slot.hora, slot.minuto, 0, 0);
                            const slotEnd = new Date(slotStart);
                            slotEnd.setMinutes(slotEnd.getMinutes() + 30);

                            const alocacao = getAlocacaoSlot(slotStart, slotEnd);
                            const bloqueado = hasBloqueioSlot(slotStart, slotEnd);
                            const disponivel = isSlotDentroDisponibilidade(slotStart, slotEnd);
                            const livre = !alocacao && !bloqueado && disponivel;

                            if (alocacao) {
                              return (
                                <td
                                  key={`${dia.toISOString()}-${slot.label}`}
                                  className="border border-border px-1 py-1 bg-info-bg cursor-pointer align-top"
                                  onClick={() => abrirEdicao(alocacao)}
                                >
                                  <div className="text-[11px] font-medium text-info-text truncate">{alocacao.eventoNome}</div>
                                  <div className="text-[10px] text-info-text truncate">
                                    {alocacao.inicioTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {' - '}
                                    {alocacao.fimTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                              );
                            }

                            if (bloqueado) {
                              return <td key={`${dia.toISOString()}-${slot.label}`} className="border border-border px-1 py-1 bg-red-100 dark:bg-red-900/30" />;
                            }

                            if (livre) {
                              return (
                                <td
                                  key={`${dia.toISOString()}-${slot.label}`}
                                  className="border border-border px-1 py-1 bg-success-bg cursor-pointer hover:opacity-80"
                                  onClick={() => abrirCriacao(slotStart, new Date(slotStart.getTime() + 60 * 60 * 1000))}
                                  title="Clique para alocar neste horário livre"
                                />
                              );
                            }

                            return <td key={`${dia.toISOString()}-${slot.label}`} className="border border-border px-1 py-1 bg-surface" />;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {/*
            Lista auxiliar rápida para auditoria visual das alocações da semana
          */}
          <Card>
            <CardHeader>
              <CardTitle>Alocações da semana</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alocacoesEnriquecidas.length === 0 ? (
                <p className="text-text-secondary">Nenhuma alocação neste período.</p>
              ) : (
                [...alocacoesEnriquecidas]
                  .sort((a, b) => a.inicioTs.getTime() - b.inicioTs.getTime())
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded border border-border px-3 py-2 text-sm text-text-secondary cursor-pointer hover:bg-surface/60"
                      onClick={() => abrirEdicao(item)}
                    >
                      <span className="font-medium text-text-primary">{item.eventoNome}</span>
                      {' - '}
                      {item.inicioTs.toLocaleDateString('pt-BR')}
                      {' '}
                      {item.inicioTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' às '}
                      {item.fimTs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' '}
                      ({item.status})
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        <AlocacaoFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          title={modoEdicao ? 'Editar alocação' : 'Nova alocação'}
          descricao="Defina evento, profissional, horário e status."
          eventos={eventosOpcoes}
          profissionais={profissionaisOpcoes}
          servicosEvento={servicosPorEventoMap.get(valoresIniciaisForm.eventoId) || []}
          valoresIniciais={valoresIniciaisForm}
          onSubmit={handleSalvarAlocacao}
        />
      </PlanOverlay>
    </Layout>
  );
}

export default function AgendamentoPage() {
  return (
    <Suspense fallback={null}>
      <AgendamentoPageContent />
    </Suspense>
  );
}
