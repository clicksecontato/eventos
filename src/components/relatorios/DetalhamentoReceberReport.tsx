'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Evento, Pagamento } from '@/types';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { filtrarEventosValidosComValor } from '@/lib/utils/evento-filters';

interface DetalhamentoReceberReportProps {
  eventos: Evento[];
  pagamentos: Pagamento[];
  clientes?: Array<{ id: string; nome: string }>;
  dashboardTotals?: {
    pendente: number;
    atrasado: number;
  };
}

interface EventoResumo {
  eventoId: string;
  nomeEvento: string;
  dataEvento?: Date;
  dataFinalPagamento?: Date;
  valorPrevisto: number;
  valorPago: number;
  valorPendente: number;
  valorAtrasado: number;
}

interface ClienteResumo {
  clienteId: string;
  clienteNome: string;
  totalPendente: number;
  totalAtrasado: number;
  totalReceber: number;
  eventos: EventoResumo[];
}

const parseDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value as string);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatCurrency = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatarData = (data?: Date) => {
  if (!data) {
    return 'Sem data';
  }

  try {
    return format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch (error) {
    return 'Data inválida';
  }
};

export default function DetalhamentoReceberReport({
  eventos,
  pagamentos,
  clientes,
  dashboardTotals
}: DetalhamentoReceberReportProps) {
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);
  const [resumosEventos, setResumosEventos] = useState<Record<string, {
    totalPago: number;
    valorPendente: number;
    valorAtrasado: number;
    quantidadePagamentos: number;
    isAtrasado: boolean;
  }>>({});
  const [carregandoResumos, setCarregandoResumos] = useState(false);
  const { userId } = useCurrentUser();

  useEffect(() => {
    let ativo = true;

    const carregarResumos = async () => {
      if (!userId || !eventos?.length) {
        if (ativo) {
          setResumosEventos({});
        }
        return;
      }

      setCarregandoResumos(true);

      try {
        // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
        const eventosValidosComValor = filtrarEventosValidosComValor(eventos);
        
        // Usar pagamentos já carregados para calcular resumos (muito mais rápido)
        const resultados = eventosValidosComValor.map((evento) => {
          try {
            const resumo = dataService.calcularResumoFinanceiroPorEvento(
              evento.id,
              evento.valorTotal || 0,
              pagamentos || [],
              parseDate(evento.diaFinalPagamento)
            );

            return [evento.id, resumo] as const;
          } catch (error) {
            // Erro silencioso
            return [evento.id, null] as const;
          }
        });

        if (!ativo) {
          return;
        }

        const mapa: Record<string, {
          totalPago: number;
          valorPendente: number;
          valorAtrasado: number;
          quantidadePagamentos: number;
          isAtrasado: boolean;
        }> = {};

        resultados.forEach(([eventoId, resumo]) => {
          if (resumo) {
            mapa[eventoId] = resumo;
          }
        });

        setResumosEventos(mapa);
      } finally {
        if (ativo) {
          setCarregandoResumos(false);
        }
      }
    };

    carregarResumos();

    return () => {
      ativo = false;
    };
  }, [userId, eventos]);

  const resumo = useMemo(() => {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidosComValor = filtrarEventosValidosComValor(eventos || []);
    
    if (!eventosValidosComValor?.length) {
      return {
        totalPendente: 0,
        totalAtrasado: 0,
        totalReceber: 0,
        clientes: [] as ClienteResumo[]
      };
    }

    const pagamentosPorEvento = new Map<string, Pagamento[]>();

    pagamentos?.forEach((pagamento) => {
      if (!pagamentosPorEvento.has(pagamento.eventoId)) {
        pagamentosPorEvento.set(pagamento.eventoId, []);
      }

      pagamentosPorEvento.get(pagamento.eventoId)!.push(pagamento);
    });

    const hoje = new Date();
    const clientesMap = new Map<string, ClienteResumo>();

    let totalPendente = 0;
    let totalAtrasado = 0;

    eventosValidosComValor.forEach((evento) => {
      const valorPrevisto = evento.valorTotal ?? 0;

      if (valorPrevisto <= 0) {
        return;
      }

      const dataFinalPagamento = parseDate(evento.diaFinalPagamento);
      const dataEvento = parseDate(evento.dataEvento);

      const resumoOficial = resumosEventos[evento.id];

      let valorPago = resumoOficial?.totalPago ?? 0;
      let valorPendenteEvento = resumoOficial?.valorPendente ?? 0;
      let valorAtrasadoEvento = resumoOficial?.valorAtrasado ?? 0;

      if (!resumoOficial) {
        const pagamentosEvento = pagamentosPorEvento.get(evento.id) ?? [];
        valorPago = pagamentosEvento
          .filter((pagamento) => pagamento.status === 'Pago')
          .reduce((acc, pagamento) => acc + pagamento.valor, 0);

        const valorRestanteCalculado = Math.max(valorPrevisto - valorPago, 0);
        const vencido = dataFinalPagamento ? hoje > dataFinalPagamento : false;

        valorAtrasadoEvento = vencido ? valorRestanteCalculado : 0;
        valorPendenteEvento = vencido ? 0 : valorRestanteCalculado;
      }

      const valorRestante = valorPendenteEvento + valorAtrasadoEvento;

      if (valorRestante <= 0) {
        return;
      }

      totalPendente += valorPendenteEvento;
      totalAtrasado += valorAtrasadoEvento;

      const clienteId = evento.clienteId || evento.cliente?.id || evento.id;
      
      // Buscar nome do cliente: primeiro do relacionamento do evento, depois da lista de clientes
      let clienteNome: string = evento.cliente?.nome || '';
      
      if (!clienteNome && clientes && clienteId) {
        const clienteEncontrado = clientes.find(c => c.id === clienteId);
        clienteNome = clienteEncontrado?.nome || '';
      }
      
      // Fallback apenas se não encontrou em nenhum lugar
      if (!clienteNome) {
        clienteNome = 'Cliente sem nome';
      }

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          clienteId,
          clienteNome,
          totalPendente: 0,
          totalAtrasado: 0,
          totalReceber: 0,
          eventos: []
        });
      }

      const clienteResumo = clientesMap.get(clienteId)!;

      clienteResumo.totalPendente += valorPendenteEvento;
      clienteResumo.totalAtrasado += valorAtrasadoEvento;
      clienteResumo.totalReceber += valorRestante;
      clienteResumo.eventos.push({
        eventoId: evento.id,
        nomeEvento: evento.nomeEvento || evento.tipoEvento || 'Evento sem nome',
        dataEvento,
        dataFinalPagamento,
        valorPrevisto,
        valorPago,
        valorPendente: valorPendenteEvento,
        valorAtrasado: valorAtrasadoEvento
      });
    });

    const clientesResumo = Array.from(clientesMap.values())
      .map((cliente) => ({
        ...cliente,
        eventos: cliente.eventos.sort((a, b) => {
          const dataA = a.dataFinalPagamento?.getTime() ?? a.dataEvento?.getTime() ?? 0;
          const dataB = b.dataFinalPagamento?.getTime() ?? b.dataEvento?.getTime() ?? 0;
          return dataB - dataA;
        })
      }))
      .sort((a, b) => b.totalReceber - a.totalReceber);

    return {
      totalPendente,
      totalAtrasado,
      totalReceber: totalPendente + totalAtrasado,
      clientes: clientesResumo
    };
  }, [eventos, pagamentos, resumosEventos, clientes]);

  const dashboardPendente = dashboardTotals?.pendente ?? null;
  const dashboardAtrasado = dashboardTotals?.atrasado ?? null;
  const dashboardTotal =
    dashboardPendente !== null && dashboardAtrasado !== null
      ? dashboardPendente + dashboardAtrasado
      : null;

  const diffPendente =
    dashboardPendente !== null ? resumo.totalPendente - dashboardPendente : null;
  const diffAtrasado =
    dashboardAtrasado !== null ? resumo.totalAtrasado - dashboardAtrasado : null;
  const diffTotal = dashboardTotal !== null ? resumo.totalReceber - dashboardTotal : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">
          📌 Detalhamento do Valor a Receber
        </CardTitle>
        <CardDescription>
          Distribuição por cliente e evento do montante ainda não liquidado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {carregandoResumos && (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-text-secondary">
            Atualizando valores com base nos pagamentos mais recentes...
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-text-secondary">Total a Receber</p>
              <InfoTooltip
                title="Total a Receber"
                description="Soma de todos os valores ainda não liquidados (pendentes + em atraso) de todos os eventos no período. Representa o montante total que a empresa ainda deve receber dos clientes."
                calculation="Total a Receber = Valor Pendente + Valor em Atraso. Considera apenas eventos com valor previsto maior que zero e que ainda possuem valores não pagos."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              {formatCurrency(resumo.totalReceber)}
            </p>
            {diffTotal !== null && Math.abs(diffTotal) > 1 && (
              <p className="mt-1 text-xs text-warning">
                Difere do dashboard em {formatCurrency(Math.abs(diffTotal))}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-text-secondary">Valor Pendente</p>
              <InfoTooltip
                title="Valor Pendente"
                description="Valores que ainda não foram pagos mas que ainda não estão em atraso. São valores dentro do prazo de vencimento ou sem data de vencimento definida."
                calculation="Valor Pendente = Valor Previsto - Valor Pago, considerando apenas eventos cuja data de vencimento ainda não passou (ou não possui data de vencimento)."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <p className="mt-1 text-xl font-semibold text-text-primary">
              {formatCurrency(resumo.totalPendente)}
            </p>
            {dashboardPendente !== null && (
              <p className="mt-1 text-xs text-text-secondary">
                Dashboard: {formatCurrency(dashboardPendente)}
                {diffPendente !== null && Math.abs(diffPendente) > 1 && (
                  <span className="ml-2 text-warning">
                    Δ {formatCurrency(diffPendente)}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-text-secondary">Valor em Atraso</p>
              <InfoTooltip
                title="Valor em Atraso"
                description="Valores que não foram pagos e cuja data de vencimento já passou. Representa valores vencidos que precisam de atenção para cobrança."
                calculation="Valor em Atraso = Valor Previsto - Valor Pago, considerando apenas eventos cuja data de vencimento (diaFinalPagamento) já passou e ainda possuem valores não pagos."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <p className="mt-1 text-xl font-semibold text-text-primary">
              {formatCurrency(resumo.totalAtrasado)}
            </p>
            {dashboardAtrasado !== null && (
              <p className="mt-1 text-xs text-text-secondary">
                Dashboard: {formatCurrency(dashboardAtrasado)}
                {diffAtrasado !== null && Math.abs(diffAtrasado) > 1 && (
                  <span className="ml-2 text-warning">
                    Δ {formatCurrency(diffAtrasado)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {!resumo.clientes.length ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-text-secondary">
            Nenhum cliente com valores a receber no momento.
          </div>
        ) : (
          <div className="space-y-4">
            {resumo.clientes.map((cliente) => {
              const expandido = clienteExpandido === cliente.clienteId;

              return (
                <div
                  key={cliente.clienteId}
                  className="rounded-lg border border-border bg-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setClienteExpandido((atual) =>
                        atual === cliente.clienteId ? null : cliente.clienteId
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-t-lg bg-surface-hover/40 p-4 text-left"
                  >
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-text-primary">
                        {cliente.clienteNome}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {cliente.eventos.length} evento(s) em aberto
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium">
                      {cliente.totalPendente > 0 && (
                        <div className="text-warning">
                          Pendente: {formatCurrency(cliente.totalPendente)}
                        </div>
                      )}
                      {cliente.totalAtrasado > 0 && (
                        <div className="text-error">
                          Atraso: {formatCurrency(cliente.totalAtrasado)}
                        </div>
                      )}
                      <div className="text-text-primary">
                        Total: {formatCurrency(cliente.totalReceber)}
                      </div>
                      {expandido ? (
                        <ChevronUpIcon className="h-5 w-5 text-text-secondary" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-text-secondary" />
                      )}
                    </div>
                  </button>

                  {expandido && (
                    <div className="space-y-3 border-t border-border p-4">
                      {cliente.eventos.map((evento) => (
                        <div
                          key={evento.eventoId}
                          className="flex flex-col gap-3 rounded-md border border-border/60 bg-background/60 p-4 md:flex-row md:items-start md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {evento.nomeEvento}
                            </p>
                            <p className="text-xs text-text-secondary">
                              Evento: {formatarData(evento.dataEvento)}
                            </p>
                            <p className="text-xs text-text-secondary">
                              Vencimento: {formatarData(evento.dataFinalPagamento)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                              <div>
                                <p className="text-xs text-text-secondary">Previsto</p>
                                <p className="font-medium text-text-primary">
                                  {formatCurrency(evento.valorPrevisto)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-text-secondary">Recebido</p>
                                <p className="font-medium text-success">
                                  {formatCurrency(evento.valorPago)}
                                </p>
                              </div>
                              {evento.valorPendente > 0 && (
                                <div>
                                  <p className="text-xs text-text-secondary">Pendente</p>
                                  <p className="font-medium text-warning">
                                    {formatCurrency(evento.valorPendente)}
                                  </p>
                                </div>
                              )}
                              {evento.valorAtrasado > 0 && (
                                <div>
                                  <p className="text-xs text-text-secondary">Atrasado</p>
                                  <p className="font-medium text-error">
                                    {formatCurrency(evento.valorAtrasado)}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end">
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/eventos/${evento.eventoId}`} prefetch={false}>
                                  Ir para o evento
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


