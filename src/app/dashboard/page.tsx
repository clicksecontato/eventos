'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  ArrowPathIcon,
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BanknotesIcon,
  LockClosedIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useDashboardData } from '@/hooks/useData';
import { usePlano } from '@/lib/hooks/usePlano';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InfoTooltip } from '@/components/ui/info-tooltip';

const FEATURE_CARDS = [
  {
    title: 'Eventos',
    description: 'Gerencie todos os seus eventos em um só lugar',
    icon: CalendarIcon
  },
  {
    title: 'Clientes',
    description: 'Cadastre e organize seus clientes',
    icon: UserIcon
  },
  {
    title: 'Contratos',
    description: 'Crie contratos profissionais automaticamente',
    icon: DocumentTextIcon
  },
  {
    title: 'Relatórios',
    description: 'Acompanhe suas finanças com relatórios detalhados',
    icon: ChartBarIcon
  },
  {
    title: 'Pagamentos',
    description: 'Controle pagamentos e valores a receber',
    icon: BanknotesIcon
  }
];

function OnboardingScreen({ bemVindo }: { bemVindo: boolean }) {
  const router = useRouter();
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-2">
          <SparklesIcon className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
          Bem-vindo ao Clicksehub!
        </h1>
        <p className="text-text-secondary text-lg">
          Tudo que você precisa para gerenciar eventos, clientes e finanças em um só lugar.
        </p>
        {bemVindo && (
          <div className="rounded-lg bg-success-bg border border-success/20 px-4 py-3 text-success-text text-sm font-medium inline-block">
            Conta criada com sucesso! Agora escolha seu plano para começar a usar o sistema.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="opacity-90 transition-all hover:opacity-100 hover:shadow-md border-border bg-surface/80 cursor-default"
            >
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <LockClosedIcon className="h-5 w-5 text-text-muted flex-shrink-0" aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">{feature.title}</h3>
                  <p className="text-sm text-text-secondary mt-0.5">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Button
          size="lg"
          className="text-base px-8 py-6 font-semibold shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => router.push('/planos')}
        >
          Escolha seu plano para começar
        </Button>
      </div>
    </div>
  );
}

function DashboardContentInner() {
  const searchParams = useSearchParams();
  const { statusPlano, loading: loadingPlano } = usePlano();
  const bemVindo = searchParams.get('bemVindo') === 'true';

  if (loadingPlano) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (!statusPlano?.ativo) {
    return (
      <Layout>
        <OnboardingScreen bemVindo={bemVindo} />
      </Layout>
    );
  }

  return <DashboardWithData />;
}

function DashboardWithData() {
  const router = useRouter();
  const { data: dashboardData, loading, error, refetch } = useDashboardData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando dados do dashboard...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-error">Erro ao carregar dados: {error}</div>
        </div>
      </Layout>
    );
  }

  if (!dashboardData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Nenhum dado disponível</div>
        </div>
      </Layout>
    );
  }

  const totalReceber = dashboardData.resumoFinanceiro.valorPendente + dashboardData.resumoFinanceiro.valorAtrasado;

  // Função para formatar valores
  const formatarValor = (valor: number) => {
    const valorFormatado = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    return `R$ ${valorFormatado}`;
  };

  const receitaTotalFormatado = formatarValor(dashboardData.resumoFinanceiro.receitaTotal);
  const totalReceberFormatado = formatarValor(totalReceber);

  const stats = [
    {
      name: 'Receita Total Deste Ano',
      value: receitaTotalFormatado,
      icon: CurrencyDollarIcon,
      color: 'text-success',
      bgColor: 'bg-success-bg',
      onClick: () => {
        router.push('/relatorios');
        setTimeout(() => {
          const element = document.getElementById('fluxo-caixa');
          if (element) {
            const offset = 120;
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({ top: elementPosition, behavior: 'smooth' });
          }
        }, 100);
      }
    },
    {
      name: 'Total a Receber',
      value: totalReceberFormatado,
      icon: ClockIcon,
      color: 'text-warning',
      bgColor: 'bg-warning-bg',
      onClick: () => router.push('/relatorios')
    },
    {
      name: 'Total de Eventos',
      value: dashboardData.resumoFinanceiro.totalEventos.toString(),
      icon: CalendarIcon,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      onClick: () => router.push('/eventos')
    },
    {
      name: 'Eventos Concluídos',
      value: dashboardData.resumoFinanceiro.eventosConcluidos.toString(),
      icon: CalendarIcon,
      color: 'text-success',
      bgColor: 'bg-success-bg',
      onClick: () => router.push('/eventos')
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-text-secondary">
              Visão geral do sistema Clicksehub
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {dashboardData.lastUpdatedAt && (
              <span className="text-sm text-text-secondary">
                Atualizado em{' '}
                {format(dashboardData.lastUpdatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Atualizar relatórios
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card 
              key={stat.name}
              onClick={stat.onClick}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Ícone */}
                  <div className={`flex-shrink-0 rounded-full p-4 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <p className="text-xs font-medium text-text-secondary leading-tight">
                        {stat.name}
                      </p>
                      {stat.name === 'Receita Total Deste Ano' && (
                        <InfoTooltip
                          title="Receita Total Deste Ano"
                          description="Soma de todos os pagamentos recebidos (com status 'Pago') no ano atual. Representa a receita acumulada do ano corrente."
                          calculation="Receita Total Deste Ano = Soma de todos os pagamentos com status 'Pago' e dataPagamento dentro do ano atual (de janeiro até dezembro)."
                          className="flex-shrink-0"
                          iconClassName="h-5 w-5"
                        />
                      )}
                      {stat.name === 'Total a Receber' && (
                        <InfoTooltip
                          title="Total a Receber"
                          description="Soma de todos os valores ainda não liquidados (pendentes + em atraso) de todos os eventos. Representa o montante total que a empresa ainda deve receber."
                          calculation="Total a Receber = Valor Pendente + Valor em Atraso. Considera apenas eventos com valor previsto maior que zero e que ainda possuem valores não pagos."
                          className="flex-shrink-0"
                          iconClassName="h-5 w-5"
                        />
                      )}
                      {stat.name === 'Total de Eventos' && (
                        <InfoTooltip
                          title="Total de Eventos"
                          description="Quantidade total de eventos cadastrados no sistema, independentemente do status ou data."
                          calculation="Total de Eventos = Contagem de todos os eventos cadastrados no sistema, incluindo concluídos, cancelados, pendentes, etc."
                          className="flex-shrink-0"
                          iconClassName="h-5 w-5"
                        />
                      )}
                      {stat.name === 'Eventos Concluídos' && (
                        <InfoTooltip
                          title="Eventos Concluídos"
                          description="Quantidade de eventos com status 'Concluído' no sistema. Representa eventos finalizados com sucesso."
                          calculation="Eventos Concluídos = Contagem de eventos com status = 'Concluído' no sistema."
                          className="flex-shrink-0"
                          iconClassName="h-5 w-5"
                        />
                      )}
                    </div>
                    <p 
                      className="font-bold text-text-primary leading-none whitespace-nowrap"
                      style={{ 
                        fontSize: 'clamp(0.875rem, 2.5vw, 1.5rem)'
                      }}
                    >
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Eventos Hoje */}
          <Card 
            onClick={() => router.push('/eventos')}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 mr-2 text-info" />
                  Eventos de Hoje
                  <InfoTooltip
                    title="Eventos de Hoje"
                    description="Lista de eventos agendados para o dia atual. Mostra todos os eventos cuja dataEvento corresponde à data de hoje."
                    calculation="Eventos de Hoje = Eventos cuja dataEvento é igual à data atual (dia/mês/ano). Considera apenas a data, não a hora."
                    className="flex-shrink-0"
                    iconClassName="h-5 w-5"
                  />
                </div>
                <span className="text-2xl font-bold text-primary">
                  {dashboardData.eventosHoje}
                </span>
              </CardTitle>
              <CardDescription>
                {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.eventosHoje === 0 ? (
                <p className="text-text-muted text-center py-4">Nenhum evento agendado para hoje</p>
              ) : (
                <div className="space-y-3">
                  {dashboardData.eventosHojeLista?.map((evento) => (
                    <div key={evento.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{evento.clienteNome}</p>
                        <p className="text-sm text-text-secondary">{evento.local}</p>
                        <p className="text-sm text-text-muted">{evento.chegadaNoLocal}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {evento.tipoEvento}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/eventos/${evento.id}`);
                          }}
                          title="Visualizar"
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Valores Atrasados */}
          <Card 
            onClick={() => router.push('/valores-atrasados')}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-error" />
                  Valores Atrasados
                </CardTitle>
                <InfoTooltip
                  title="Valores Atrasados"
                  description="Quantidade de eventos com valores a receber que já estão após o diaFinalPagamento. Representa valores vencidos que precisam de atenção para cobrança."
                  calculation="Valores Atrasados = Contagem de eventos com valorPendente > 0 cuja data de vencimento (diaFinalPagamento) já passou. Diferente de valores pendentes que ainda estão dentro do prazo."
                  className="flex-shrink-0"
                  iconClassName="h-5 w-5"
                />
              </div>
              <CardDescription>
                Eventos com valores em atraso
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.eventosComValoresAtrasados === 0 ? (
                <p className="text-text-muted text-center py-4">Nenhum valor em atraso</p>
              ) : (
                <div className="text-center">
                  <div className="text-3xl font-bold text-error">
                    {dashboardData.eventosComValoresAtrasados || 0}
                  </div>
                  <p className="text-sm text-text-secondary mt-2">
                    Eventos com valores atrasados
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Valor: {formatarValor(dashboardData.resumoFinanceiro.valorAtrasado)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Eventos Próximos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 mr-2 text-success" />
                Próximos Eventos (7 dias)
                <InfoTooltip
                  title="Próximos Eventos (7 dias)"
                  description="Lista de eventos agendados para os próximos 7 dias a partir de hoje. Ajuda no planejamento e preparação dos eventos."
                  calculation="Próximos Eventos = Eventos cuja dataEvento está entre hoje e os próximos 7 dias (inclusive). Ordenados por data mais próxima primeiro."
                  className="flex-shrink-0"
                  iconClassName="h-5 w-5"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/eventos');
                }}
                className="text-text-secondary hover:text-primary"
              >
                Ver todos
              </Button>
            </CardTitle>
            <CardDescription>
              Eventos agendados para os próximos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.eventosProximos.length === 0 ? (
              <p className="text-text-muted text-center py-4">Nenhum evento nos próximos 7 dias</p>
            ) : (
              <>
                {/* Versão Desktop - Tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Local
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                      {dashboardData.eventosProximos.map((evento) => (
                        <tr key={evento.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                            {evento.clienteNome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {format(evento.dataEvento, 'dd/MM/yyyy', { locale: ptBR })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {evento.local}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {evento.tipoEvento}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
                              {evento.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/eventos/${evento.id}`);
                              }}
                              title="Visualizar"
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Versão Mobile - Cards */}
                <div className="md:hidden space-y-3">
                  {dashboardData.eventosProximos.map((evento) => (
                    <div
                      key={evento.id}
                      className="p-4 bg-surface rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-primary truncate">
                            {evento.clienteNome}
                          </h3>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                              <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                              <span>{format(evento.dataEvento, 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                              <span className="truncate">{evento.local}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                                {evento.tipoEvento}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
                                {evento.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/eventos/${evento.id}`);
                          }}
                          title="Visualizar"
                          className="hover:bg-primary/10 hover:text-primary flex-shrink-0"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
          <Card 
            onClick={() => {
              router.push('/relatorios');
              setTimeout(() => {
                const element = document.getElementById('fluxo-caixa');
                if (element) {
                  const offset = 120;
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }, 100);
            }}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Receita do Mês</CardTitle>
                <InfoTooltip
                  title="Receita do Mês"
                  description="Soma de todos os pagamentos recebidos (com status 'Pago') no mês atual. Representa a receita efetivamente recebida no mês corrente."
                  calculation="Receita do Mês = Soma de todos os pagamentos com status 'Pago' e dataPagamento dentro do mês atual (1º ao último dia do mês)."
                  className="flex-shrink-0"
                  iconClassName="h-5 w-5"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {dashboardData.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-text-muted mt-1">
                {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-text-secondary">Carregando...</div>
          </div>
        </Layout>
      }
    >
      <DashboardContentInner />
    </Suspense>
  );
}
