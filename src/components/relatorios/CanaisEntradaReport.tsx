'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cliente, CanalEntrada, Evento } from '@/types';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filtrarEventosValidos } from '@/lib/utils/evento-filters';
import { ArrowDownTrayIcon, ChartBarIcon, ExclamationTriangleIcon, UserPlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { AreaChart, Area, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { 
  StatCard, 
  StatGrid, 
  TabbedChart, 
  PieChart, 
  BarChart,
  ChartDataPoint 
} from '@/components/charts';

interface CanaisEntradaReportProps {
  clientes: Cliente[];
  canaisEntrada: CanalEntrada[];
  eventos: Evento[];
}

export default function CanaisEntradaReport({ clientes, canaisEntrada, eventos }: CanaisEntradaReportProps) {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState(
    format(subMonths(new Date(), 11), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const dadosCanaisEntrada = useMemo(() => {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Filtrar clientes do período
    const clientesPeriodo = clientes.filter(cliente => {
      const dataCadastro = new Date(cliente.dataCadastro);
      return dataCadastro >= inicio && dataCadastro <= fim;
    });

    // Criar mapa de canais
    const canaisMap = new Map(canaisEntrada.map(canal => [canal.id, canal]));

    // Resumo geral
    const totalClientes = clientesPeriodo.length;
    const clientesComCanal = clientesPeriodo.filter(c => c.canalEntradaId).length;
    const clientesSemCanalList = clientesPeriodo.filter(c => !c.canalEntradaId);
    const clientesSemCanal = clientesSemCanalList.length;
    const taxaPreenchimento = totalClientes > 0 ? (clientesComCanal / totalClientes) * 100 : 0;
    const canaisAtivos = new Set(clientesPeriodo.map(c => c.canalEntradaId).filter(Boolean)).size;

    // Clientes por canal
    const clientesPorCanalMap: Record<string, { quantidade: number; eventos: Evento[] }> = {};
    clientesPeriodo.forEach(cliente => {
      if (cliente.canalEntradaId) {
        if (!clientesPorCanalMap[cliente.canalEntradaId]) {
          clientesPorCanalMap[cliente.canalEntradaId] = { quantidade: 0, eventos: [] };
        }
        clientesPorCanalMap[cliente.canalEntradaId].quantidade++;
        
        // Buscar eventos válidos deste cliente
        const eventosCliente = eventosValidos.filter(e => e.clienteId === cliente.id);
        clientesPorCanalMap[cliente.canalEntradaId].eventos.push(...eventosCliente);
      }
    });

    const clientesPorCanal = Object.entries(clientesPorCanalMap).map(([canalId, dados]) => {
      const canal = canaisMap.get(canalId);
      const valorTotalEventos = dados.eventos.reduce((sum, evento) => sum + evento.valorTotal, 0);
      const ticketMedio = dados.quantidade > 0 ? valorTotalEventos / dados.quantidade : 0;
      
      return {
        canalId,
        canalNome: canal?.nome || 'Canal não encontrado',
        quantidade: dados.quantidade,
        percentual: totalClientes > 0 ? (dados.quantidade / totalClientes) * 100 : 0,
        valorTotalEventos,
        ticketMedio
      };
    });

    // Clientes por mês
    const clientesPorMesMap: Record<string, { total: number; porCanal: Record<string, number> }> = {};
    clientesPeriodo.forEach(cliente => {
      const mes = format(new Date(cliente.dataCadastro), 'yyyy-MM');
      if (!clientesPorMesMap[mes]) {
        clientesPorMesMap[mes] = { total: 0, porCanal: {} };
      }
      clientesPorMesMap[mes].total++;
      
      if (cliente.canalEntradaId) {
        const canalNome = canaisMap.get(cliente.canalEntradaId)?.nome || 'Sem canal';
        clientesPorMesMap[mes].porCanal[canalNome] = 
          (clientesPorMesMap[mes].porCanal[canalNome] || 0) + 1;
      }
    });

    const meses = eachMonthOfInterval({ start: inicio, end: fim });
    const clientesPorMes = meses.map(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const dados = clientesPorMesMap[mesKey] || { total: 0, porCanal: {} };
      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        ano: mes.getFullYear(),
        totalClientes: dados.total,
        porCanal: dados.porCanal
      };
    });

    // Conversão por canal
    const conversaoPorCanal = clientesPorCanal.map(canal => {
      const eventosCanal = eventosValidos.filter(e => {
        const cliente = clientesPeriodo.find(c => c.id === e.clienteId);
        return cliente?.canalEntradaId === canal.canalId;
      });
      
      const receitaGerada = eventosCanal.reduce((sum, evento) => sum + evento.valorTotal, 0);
      const taxaConversao = canal.quantidade > 0 ? (eventosCanal.length / canal.quantidade) * 100 : 0;
      
      return {
        canalNome: canal.canalNome,
        totalLeads: canal.quantidade,
        eventosGerados: eventosCanal.length,
        taxaConversao,
        receitaGerada
      };
    });

    // Tendências
    const canalMaisEfetivo = conversaoPorCanal.length > 0 ? 
      conversaoPorCanal.reduce((max, atual) => atual.taxaConversao > max.taxaConversao ? atual : max).canalNome : 'N/A';
    const canalMenosEfetivo = conversaoPorCanal.length > 0 ? 
      conversaoPorCanal.reduce((min, atual) => atual.taxaConversao < min.taxaConversao ? atual : min).canalNome : 'N/A';
    
    const crescimentoLeads = clientesPorMes.length >= 2 ? 
      ((clientesPorMes[clientesPorMes.length - 1].totalClientes - clientesPorMes[0].totalClientes) / 
       Math.max(clientesPorMes[0].totalClientes, 1)) * 100 : 0;

    const canaisEmAlta = clientesPorCanal
      .filter(canal => canal.percentual > 15)
      .map(canal => canal.canalNome);

    // Alertas
    const alertas = [];
    if (clientesSemCanal > 0) {
      alertas.push({
        tipo: 'clientes_sem_canal' as const,
        mensagem: `${clientesSemCanal} clientes sem canal de entrada cadastrado`,
        severidade: 'media' as const,
        clientesSemCanal: clientesSemCanalList.map(cliente => ({
          id: cliente.id,
          nome: cliente.nome,
          email: cliente.email || 'Sem email',
          telefone: cliente.telefone || 'Sem telefone',
          dataCadastro: cliente.dataCadastro
        }))
      });
    }
    
    const canalBaixaConversao = conversaoPorCanal.find(canal => canal.taxaConversao < 30);
    if (canalBaixaConversao) {
      alertas.push({
        tipo: 'baixa_conversao' as const,
        mensagem: `${canalBaixaConversao.canalNome} com baixa taxa de conversão (${canalBaixaConversao.taxaConversao.toFixed(1)}%)`,
        severidade: 'baixa' as const
      });
    }

    const canaisInativos = canaisEntrada.filter(canal => !canal.ativo);
    if (canaisInativos.length > 0) {
      alertas.push({
        tipo: 'canal_inativo' as const,
        mensagem: `${canaisInativos.length} canais inativos encontrados`,
        severidade: 'baixa' as const
      });
    }

    return {
      periodo: { inicio, fim },
      resumoGeral: {
        totalClientes,
        canaisAtivos,
        clientesSemCanal,
        taxaPreenchimento
      },
      clientesPorCanal,
      clientesPorMes,
      conversaoPorCanal,
      tendencias: {
        canalMaisEfetivo,
        canalMenosEfetivo,
        crescimentoLeads,
        canaisEmAlta
      },
      alertas
    };
  }, [dataInicio, dataFim, clientes, canaisEntrada, eventos]);

  // Converter dados para formato dos gráficos
  const clientesPorCanalData: ChartDataPoint[] = dadosCanaisEntrada.clientesPorCanal.map(item => ({
    label: item.canalNome,
    value: item.quantidade,
    percentage: item.percentual
  }));

  const clientesPorMesData: ChartDataPoint[] = dadosCanaisEntrada.clientesPorMes.map(item => ({
    label: item.mes,
    value: item.totalClientes,
    percentage: 0
  }));

  const conversaoPorCanalData: ChartDataPoint[] = dadosCanaisEntrada.conversaoPorCanal.map(item => ({
    label: item.canalNome,
    value: item.taxaConversao,
    percentage: 0
  }));

  // Dados formatados para gráficos melhorados
  const clientesPorMesChartData = dadosCanaisEntrada.clientesPorMes.map(item => ({
    mes: item.mes,
    totalClientes: item.totalClientes,
    ...item.porCanal
  }));

  // Extrair todos os canais únicos para o gráfico de clientes por mês
  const todosCanaisUnicos = new Set<string>();
  dadosCanaisEntrada.clientesPorMes.forEach(item => {
    Object.keys(item.porCanal).forEach(canal => todosCanaisUnicos.add(canal));
  });
  const canaisUnicosArray = Array.from(todosCanaisUnicos).slice(0, 5); // Limitar a 5 canais para não poluir

  const conversaoPorCanalChartData = dadosCanaisEntrada.conversaoPorCanal.map(item => ({
    canal: item.canalNome.length > 15 ? item.canalNome.substring(0, 15) + '...' : item.canalNome,
    canalNome: item.canalNome,
    totalLeads: item.totalLeads,
    eventosGerados: item.eventosGerados,
    taxaConversao: item.taxaConversao,
    receitaGerada: item.receitaGerada
  }));

  const chartConfigClientes = {
    totalClientes: {
      label: "Total de Clientes",
      color: "#313c43"
    },
    ...canaisUnicosArray.reduce((acc, canal, index) => {
      const colors = ['#21b6bf', '#5d6b74', '#1a9ba3', '#7d8d96', '#2c383f'];
      acc[canal.replace(/\s+/g, '')] = {
        label: canal,
        color: colors[index % colors.length]
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>)
  };

  const chartConfigConversao = {
    totalLeads: {
      label: "Total de Leads",
      color: "#313c43"
    },
    eventosGerados: {
      label: "Eventos Gerados",
      color: "#21b6bf"
    },
    taxaConversao: {
      label: "Taxa de Conversão (%)",
      color: "#1a9ba3"
    },
    receitaGerada: {
      label: "Receita Gerada",
      color: "#5d6b74"
    }
  };

  const exportarCSV = () => {
    const csvData = [
      ['Relatório de Canais de Entrada'],
      [`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['RESUMO GERAL'],
      ['Total de Clientes', dadosCanaisEntrada.resumoGeral.totalClientes],
      ['Canais Ativos', dadosCanaisEntrada.resumoGeral.canaisAtivos],
      ['Clientes sem Canal', dadosCanaisEntrada.resumoGeral.clientesSemCanal],
      ['Taxa de Preenchimento (%)', dadosCanaisEntrada.resumoGeral.taxaPreenchimento.toFixed(2)],
      [''],
      ['CLIENTES POR CANAL'],
      ['Canal', 'Quantidade', 'Percentual (%)', 'Valor Total Eventos', 'Ticket Médio'],
      ...dadosCanaisEntrada.clientesPorCanal.map(item => [
        item.canalNome,
        item.quantidade,
        item.percentual.toFixed(2),
        item.valorTotalEventos,
        item.ticketMedio.toFixed(2)
      ]),
      [''],
      ['CONVERSÃO POR CANAL'],
      ['Canal', 'Total Leads', 'Eventos Gerados', 'Taxa Conversão (%)', 'Receita Gerada'],
      ...dadosCanaisEntrada.conversaoPorCanal.map(item => [
        item.canalNome,
        item.totalLeads,
        item.eventosGerados,
        item.taxaConversao.toFixed(2),
        item.receitaGerada
      ]),
      [''],
      ['CLIENTES POR MÊS'],
      ['Mês', 'Total Clientes'],
      ...dadosCanaisEntrada.clientesPorMes.map(item => [
        item.mes,
        item.totalClientes
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-canais-entrada-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeveridadeColor = (severidade: string) => {
    switch (severidade) {
      case 'alta': return 'text-[#d97757] bg-[#d97757]/10';
      case 'media': return 'text-[#5d6b74] bg-[#5d6b74]/10';
      case 'baixa': return 'text-accent bg-accent/10';
      default: return 'text-text-secondary bg-surface';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5" />
            Relatório de Canais de Entrada
          </CardTitle>
          <CardDescription>
            Análise detalhada da origem dos leads e efetividade dos canais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Data Início"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
            <Input
              label="Data Fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
            <div className="flex items-end">
              <Button 
                onClick={exportarCSV} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 focus:ring-blue-500 focus:ring-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {dadosCanaisEntrada.alertas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Alertas de Canais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dadosCanaisEntrada.alertas.map((alerta, index) => (
                <div key={index} className={`p-3 rounded-lg ${getSeveridadeColor(alerta.severidade)}`}>
                  <div className="font-medium mb-2">{alerta.mensagem}</div>
                  {alerta.tipo === 'clientes_sem_canal' && alerta.clientesSemCanal && alerta.clientesSemCanal.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-semibold text-text-secondary mb-2">Clientes sem canal de entrada:</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-surface/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Nome</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Telefone</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Data Cadastro</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="bg-background/50 divide-y divide-border">
                            {alerta.clientesSemCanal.map((cliente, idx) => (
                              <tr key={cliente.id || idx}>
                                <td className="px-4 py-2 text-sm text-text-primary">{cliente.nome}</td>
                                <td className="px-4 py-2 text-sm text-text-primary">{cliente.email}</td>
                                <td className="px-4 py-2 text-sm text-text-primary">{cliente.telefone}</td>
                                <td className="px-4 py-2 text-sm text-text-primary">
                                  {format(new Date(cliente.dataCadastro), 'dd/MM/yyyy', { locale: ptBR })}
                                </td>
                                <td className="px-4 py-2 text-sm text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/clientes/${cliente.id}`)}
                                    className="hover:bg-primary/10 hover:text-primary"
                                    title="Visualizar cliente"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Geral */}
      <StatGrid>
        <StatCard
          title="Total de Clientes"
          value={dadosCanaisEntrada.resumoGeral.totalClientes}
          color="primary"
          tooltip={{
            title: "Total de Clientes",
            description: "Quantidade total de clientes cadastrados no período selecionado. Inclui todos os clientes, independentemente de terem canal de entrada cadastrado.",
            calculation: "Total de Clientes = Contagem de clientes cuja dataCadastro está dentro do período selecionado."
          }}
        />
        <StatCard
          title="Canais Ativos"
          value={dadosCanaisEntrada.resumoGeral.canaisAtivos}
          color="info"
          tooltip={{
            title: "Canais Ativos",
            description: "Quantidade de canais de entrada diferentes utilizados pelos clientes no período. Indica a diversidade de origens dos leads.",
            calculation: "Canais Ativos = Contagem de canais de entrada únicos (canalEntradaId) associados aos clientes do período."
          }}
        />
        <StatCard
          title="Taxa de Preenchimento"
          value={`${dadosCanaisEntrada.resumoGeral.taxaPreenchimento.toFixed(1)}%`}
          color={dadosCanaisEntrada.resumoGeral.taxaPreenchimento >= 80 ? "success" : "warning"}
          tooltip={{
            title: "Taxa de Preenchimento",
            description: "Percentual de clientes que possuem canal de entrada cadastrado. Indica a qualidade do cadastro de clientes.",
            calculation: "Taxa de Preenchimento = (Clientes com Canal / Total de Clientes) × 100. Valores acima de 80% indicam bom preenchimento."
          }}
        />
        <StatCard
          title="Clientes sem Canal"
          value={dadosCanaisEntrada.resumoGeral.clientesSemCanal}
          color={dadosCanaisEntrada.resumoGeral.clientesSemCanal === 0 ? "success" : "warning"}
          tooltip={{
            title: "Clientes sem Canal",
            description: "Quantidade de clientes que não possuem canal de entrada cadastrado. Esses clientes precisam ter o canal preenchido para melhor análise de origem dos leads.",
            calculation: "Clientes sem Canal = Contagem de clientes do período que não possuem canalEntradaId cadastrado (canalEntradaId é null ou vazio)."
          }}
        />
      </StatGrid>

      {/* Clientes por Canal */}
      <TabbedChart
        title="Clientes por Canal de Entrada"
        subtitle="Distribuição dos clientes por origem"
        titleTooltip={{
          title: "Clientes por Canal de Entrada",
          description: "Distribuição visual dos clientes agrupados por canal de entrada (Instagram, Facebook, Indicação, etc.) no período selecionado.",
          calculation: "Cada cliente é contabilizado uma vez de acordo com seu canalEntradaId. O gráfico mostra a quantidade e percentual de clientes por canal."
        }}
        tabs={[
          {
            id: 'pizza',
            label: '🥧 Pizza',
            content: (
              <PieChart 
                data={clientesPorCanalData}
                config={{ 
                  showLegend: true, 
                  showValues: true, 
                  showPercentages: true 
                }}
              />
            )
          },
          {
            id: 'barras',
            label: '📊 Barras',
            content: (
              <BarChart 
                data={clientesPorCanalData}
                config={{ 
                  showValues: true, 
                  showPercentages: false 
                }}
              />
            )
          },
          {
            id: 'tabela',
            label: '📋 Tabela',
            content: (
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Canal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Quantidade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Percentual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Valor Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {dadosCanaisEntrada.clientesPorCanal.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{item.canalNome}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.quantidade}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.percentual.toFixed(1)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          R$ {item.valorTotalEventos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          R$ {item.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        ]}
        defaultTab="pizza"
      />

      {/* Análise Temporal e Conversão */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Clientes por Mês</CardTitle>
              <InfoTooltip
                title="Clientes por Mês"
                description="Evolução temporal do número de clientes cadastrados ao longo do período, mostrando a distribuição por canal de entrada."
                calculation="Clientes são agrupados por mês de cadastro (dataCadastro) e por canal de entrada. Mostra a evolução mensal de cada canal."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <CardDescription>
              Evolução do número de clientes ao longo do tempo por canal de entrada
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[500px]">
              <ChartContainer config={chartConfigClientes} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={clientesPorMesChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 50 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#313c43" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#313c43" stopOpacity={0.1}/>
                    </linearGradient>
                    {canaisUnicosArray.map((canal, index) => {
                      const colors = ['#21b6bf', '#5d6b74', '#1a9ba3', '#7d8d96', '#2c383f'];
                      return (
                        <linearGradient key={canal} id={`color${canal.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.1}/>
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(164, 179, 186, 0.3)" />
                  <XAxis 
                    dataKey="mes" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    width={50}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-surface border-border p-3 shadow-lg">
                          <div className="mb-2 text-sm font-semibold text-text-primary">
                            {payload[0]?.payload?.mes}
                          </div>
                          <div className="space-y-1">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-text-secondary">{entry.name}:</span>
                                </div>
                                <span className="font-semibold text-text-primary">
                                  {typeof entry.value === 'number' ? entry.value : entry.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="totalClientes" 
                    stroke="#313c43" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)"
                    name="Total de Clientes"
                  />
                  {canaisUnicosArray.map((canal, index) => {
                    const colors = ['#21b6bf', '#5d6b74', '#1a9ba3', '#7d8d96', '#2c383f'];
                    const dataKey = canal.replace(/\s+/g, '');
                    return (
                      <Area 
                        key={canal}
                        type="monotone" 
                        dataKey={canal} 
                        stackId="1"
                        stroke={colors[index % colors.length]} 
                        fill={`url(#color${dataKey})`}
                        name={canal}
                      />
                    );
                  })}
                </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Taxa de Conversão por Canal</CardTitle>
              <InfoTooltip
                title="Taxa de Conversão por Canal"
                description="Percentual de leads de cada canal que se converteram em eventos. Indica a efetividade de cada canal em gerar negócios."
                calculation="Taxa de Conversão = (Eventos Gerados pelo Canal / Total de Leads do Canal) × 100. Valores altos indicam canais mais efetivos em converter leads em eventos."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <CardDescription>
              Efetividade de cada canal: leads, conversão e receita gerada
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[500px]">
              <ChartContainer config={chartConfigConversao} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={conversaoPorCanalChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(164, 179, 186, 0.3)" />
                  <XAxis 
                    dataKey="canal" 
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    width={50}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    tickFormatter={(value) => `${value}%`}
                    width={50}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border bg-surface border-border p-3 shadow-lg">
                          <div className="mb-2 text-sm font-semibold text-text-primary">
                            {data?.canalNome}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Total Leads:</span>
                              <span className="font-semibold text-text-primary">{data?.totalLeads}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Eventos Gerados:</span>
                              <span className="font-semibold text-text-primary">{data?.eventosGerados}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Taxa de Conversão:</span>
                              <span className="font-semibold text-text-primary">{data?.taxaConversao.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Receita Gerada:</span>
                              <span className="font-semibold text-text-primary">
                                R$ {typeof data?.receitaGerada === 'number' 
                                  ? data.receitaGerada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                  : data?.receitaGerada}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar 
                    yAxisId="left"
                    dataKey="totalLeads" 
                    fill="#313c43" 
                    name="Total de Leads"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="eventosGerados" 
                    fill="#21b6bf" 
                    name="Eventos Gerados"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="taxaConversao" 
                    stroke="#1a9ba3" 
                    strokeWidth={3}
                    name="Taxa de Conversão (%)"
                    dot={{ fill: '#1a9ba3', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Tendências e Insights
          </CardTitle>
          <CardDescription>
            Análise das tendências de canais de entrada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-accent/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-accent-dark">Canal Mais Efetivo</h4>
                <InfoTooltip
                  title="Canal Mais Efetivo"
                  description="Canal de entrada com maior taxa de conversão de leads em eventos. Indica qual canal está gerando mais negócios."
                  calculation="Canal Mais Efetivo = Canal com maior Taxa de Conversão. Taxa de Conversão = (Eventos Gerados / Total de Leads) × 100."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className="text-accent font-bold">{dadosCanaisEntrada.tendencias.canalMaisEfetivo}</p>
            </div>
            <div className="p-4 border rounded-lg bg-[#d97757]/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-[#d97757]">Canal Menos Efetivo</h4>
                <InfoTooltip
                  title="Canal Menos Efetivo"
                  description="Canal de entrada com menor taxa de conversão de leads em eventos. Pode indicar necessidade de melhorias ou ajustes."
                  calculation="Canal Menos Efetivo = Canal com menor Taxa de Conversão. Taxa de Conversão = (Eventos Gerados / Total de Leads) × 100."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className="text-[#d97757] font-bold">{dadosCanaisEntrada.tendencias.canalMenosEfetivo}</p>
            </div>
            <div className="p-4 border rounded-lg bg-secondary/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-secondary">Crescimento de Leads</h4>
                <InfoTooltip
                  title="Crescimento de Leads"
                  description="Variação percentual na quantidade de leads (clientes) entre o primeiro e o último mês do período analisado."
                  calculation="Crescimento de Leads = ((Leads do Último Mês - Leads do Primeiro Mês) / Leads do Primeiro Mês) × 100. Requer pelo menos 2 meses de dados."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className={`font-bold ${dadosCanaisEntrada.tendencias.crescimentoLeads >= 0 ? 'text-accent' : 'text-[#d97757]'}`}>
                {dadosCanaisEntrada.tendencias.crescimentoLeads.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-accent-dark/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-accent-dark">
                  Canais em Alta
                  {dadosCanaisEntrada.tendencias.canaisEmAlta.length > 0 && (
                    <span className="ml-2 text-xs font-normal">({dadosCanaisEntrada.tendencias.canaisEmAlta.length})</span>
                  )}
                </h4>
                <InfoTooltip
                  title="Canais em Alta"
                  description="Canais de entrada que representam mais de 15% do total de clientes no período. Indica canais com alta representatividade."
                  calculation="Para cada canal, calculamos: (quantidade de clientes do canal / total de clientes) × 100. Canais com percentual maior que 15% são considerados 'em alta'."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              {dadosCanaisEntrada.tendencias.canaisEmAlta.length > 0 ? (
                <div className="space-y-1.5">
                  {dadosCanaisEntrada.tendencias.canaisEmAlta.map((canal, index) => (
                    <div key={index} className="text-accent-dark font-medium text-sm">{canal}</div>
                  ))}
                </div>
              ) : (
                <p className="text-accent-dark/70 text-sm">Nenhum canal acima de 15%</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
