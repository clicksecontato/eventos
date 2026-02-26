'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Evento, ServicoEvento, TipoServico } from '@/types';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filtrarEventosValidos } from '@/lib/utils/evento-filters';
import { ArrowDownTrayIcon, ChartBarIcon, ExclamationTriangleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { Area, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { 
  StatCard, 
  StatGrid, 
  TabbedChart, 
  PieChart, 
  ChartDataPoint 
} from '@/components/charts';

interface ServicosReportProps {
  eventos: Evento[];
  servicos: ServicoEvento[];
  tiposServicos: TipoServico[];
}

export default function ServicosReport({ eventos, servicos, tiposServicos }: ServicosReportProps) {
  const [dataInicio, setDataInicio] = useState(
    format(subMonths(new Date(), 11), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const dadosServicos = useMemo(() => {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Filtrar eventos do período
    const eventosPeriodo = eventosValidos.filter(evento => {
      const dataEvento = new Date(evento.dataEvento);
      return dataEvento >= inicio && dataEvento <= fim;
    });

    // Filtrar serviços dos eventos do período
    const servicosPeriodo = servicos.filter(servico => {
      return eventosPeriodo.some(evento => evento.id === servico.eventoId);
    });

    // Criar mapa de tipos de serviços
    const tiposMap = new Map(tiposServicos.map(tipo => [tipo.id, tipo]));

    // Resumo geral (apenas eventosSemServicos para alertas)
    const eventosComServicos = new Set(servicosPeriodo.map(s => s.eventoId)).size;
    const eventosSemServicos = eventosPeriodo.length - eventosComServicos;

    // Total de serviços (mantido apenas para cálculo de percentuais)
    const totalServicos = servicosPeriodo.length;

    // Serviços por tipo
    const servicosPorTipoMap: Record<string, { quantidade: number; eventos: Set<string> }> = {};
    servicosPeriodo.forEach(servico => {
      const tipoNome = tiposMap.get(servico.tipoServicoId)?.nome || 'Tipo não encontrado';
      if (!servicosPorTipoMap[tipoNome]) {
        servicosPorTipoMap[tipoNome] = { quantidade: 0, eventos: new Set() };
      }
      servicosPorTipoMap[tipoNome].quantidade++;
      servicosPorTipoMap[tipoNome].eventos.add(servico.eventoId);
    });

    const servicosPorTipo = Object.entries(servicosPorTipoMap).map(([tipoServico, dados]) => ({
      tipoServico,
      quantidade: dados.quantidade,
      percentual: totalServicos > 0 ? (dados.quantidade / totalServicos) * 100 : 0,
      eventosUtilizando: dados.eventos.size
    }));

    // Serviços por evento
    const servicosPorEventoMap: Record<string, { servicos: ServicoEvento[]; evento: Evento }> = {};
    servicosPeriodo.forEach(servico => {
      const evento = eventosPeriodo.find(e => e.id === servico.eventoId);
      if (evento) {
        if (!servicosPorEventoMap[servico.eventoId]) {
          servicosPorEventoMap[servico.eventoId] = { servicos: [], evento };
        }
        servicosPorEventoMap[servico.eventoId].servicos.push(servico);
      }
    });

    const servicosPorEvento = Object.values(servicosPorEventoMap).map(({ servicos: servicosEvento, evento }) => ({
      eventoId: evento.id,
      clienteNome: evento.cliente.nome,
      dataEvento: evento.dataEvento,
      tipoEvento: evento.tipoEvento,
      quantidadeServicos: servicosEvento.length,
      tiposServicos: servicosEvento.map(s => tiposMap.get(s.tipoServicoId)?.nome || 'Tipo não encontrado')
    }));

    // Serviços por mês
    const servicosPorMesMap: Record<string, { quantidade: number; tipos: Set<string> }> = {};
    servicosPeriodo.forEach(servico => {
      const evento = eventosPeriodo.find(e => e.id === servico.eventoId);
      if (evento) {
        const mes = format(new Date(evento.dataEvento), 'yyyy-MM');
        if (!servicosPorMesMap[mes]) {
          servicosPorMesMap[mes] = { quantidade: 0, tipos: new Set() };
        }
        servicosPorMesMap[mes].quantidade++;
        servicosPorMesMap[mes].tipos.add(servico.tipoServicoId);
      }
    });

    const meses = eachMonthOfInterval({ start: inicio, end: fim });
    const servicosPorMes = meses.map(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const dados = servicosPorMesMap[mesKey] || { quantidade: 0, tipos: new Set() };
      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        ano: mes.getFullYear(),
        quantidadeServicos: dados.quantidade,
        tiposUnicos: dados.tipos.size
      };
    });

    // Serviços por tipo de evento
    const servicosPorTipoEventoMap: Record<string, { quantidade: number; tipos: Record<string, number> }> = {};
    servicosPeriodo.forEach(servico => {
      const evento = eventosPeriodo.find(e => e.id === servico.eventoId);
      if (evento) {
        const tipoNome = tiposMap.get(servico.tipoServicoId)?.nome || 'Tipo não encontrado';
        if (!servicosPorTipoEventoMap[evento.tipoEvento]) {
          servicosPorTipoEventoMap[evento.tipoEvento] = { quantidade: 0, tipos: {} };
        }
        servicosPorTipoEventoMap[evento.tipoEvento].quantidade++;
        servicosPorTipoEventoMap[evento.tipoEvento].tipos[tipoNome] = 
          (servicosPorTipoEventoMap[evento.tipoEvento].tipos[tipoNome] || 0) + 1;
      }
    });

    const servicosPorTipoEvento = Object.entries(servicosPorTipoEventoMap).map(([tipoEvento, dados]) => ({
      tipoEvento,
      quantidadeServicos: dados.quantidade,
      tiposMaisUtilizados: Object.entries(dados.tipos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([tipoServico, quantidade]) => ({ tipoServico, quantidade }))
    }));

    // Tendências
    const servicoMaisUtilizado = servicosPorTipo.length > 0 ? 
      servicosPorTipo.reduce((max, atual) => atual.quantidade > max.quantidade ? atual : max).tipoServico : 'N/A';
    const servicoMenosUtilizado = servicosPorTipo.length > 0 ? 
      servicosPorTipo.reduce((min, atual) => atual.quantidade < min.quantidade ? atual : min).tipoServico : 'N/A';
    
    const crescimentoUtilizacao = servicosPorMes.length >= 2 ? 
      ((servicosPorMes[servicosPorMes.length - 1].quantidadeServicos - servicosPorMes[0].quantidadeServicos) / 
       Math.max(servicosPorMes[0].quantidadeServicos, 1)) * 100 : 0;

    const tiposEmAlta = servicosPorTipo
      .filter(tipo => tipo.percentual > 15)
      .map(tipo => tipo.tipoServico);

    // Alertas
    const alertas = [];
    if (eventosSemServicos > 0) {
      alertas.push({
        tipo: 'evento_sem_servicos' as const,
        mensagem: `${eventosSemServicos} eventos sem serviços cadastrados`,
        severidade: 'media' as const
      });
    }
    
    const servicoPoucoUtilizado = servicosPorTipo.find(tipo => tipo.percentual < 5);
    if (servicoPoucoUtilizado) {
      alertas.push({
        tipo: 'servico_pouco_utilizado' as const,
        mensagem: `${servicoPoucoUtilizado.tipoServico} com baixa utilização (${servicoPoucoUtilizado.percentual.toFixed(1)}%)`,
        severidade: 'baixa' as const
      });
    }

    return {
      periodo: { inicio, fim },
      resumoGeral: {
        eventosSemServicos
      },
      servicosPorTipo,
      servicosPorEvento,
      servicosPorMes,
      servicosPorTipoEvento,
      tendencias: {
        servicoMaisUtilizado,
        servicoMenosUtilizado,
        crescimentoUtilizacao,
        tiposEmAlta
      },
      alertas
    };
  }, [dataInicio, dataFim, eventos, servicos, tiposServicos]);

  // Converter dados para formato dos gráficos
  const servicosPorTipoData: ChartDataPoint[] = dadosServicos.servicosPorTipo.map(item => ({
    label: item.tipoServico,
    value: item.quantidade,
    percentage: item.percentual
  }));

  const servicosPorMesData: ChartDataPoint[] = dadosServicos.servicosPorMes.map(item => ({
    label: item.mes,
    value: item.quantidadeServicos,
    percentage: 0
  }));

  const servicosPorTipoEventoData: ChartDataPoint[] = dadosServicos.servicosPorTipoEvento.map(item => ({
    label: item.tipoEvento,
    value: item.quantidadeServicos,
    percentage: 0
  }));

  // Preparar dados do gráfico com nomes dos serviços
  const servicosPorTipoEventoChartData = dadosServicos.servicosPorTipoEvento.map(item => ({
    tipoEvento: item.tipoEvento,
    quantidadeServicos: item.quantidadeServicos,
    topServico1: item.tiposMaisUtilizados[0]?.quantidade || 0,
    topServico1Nome: item.tiposMaisUtilizados[0]?.tipoServico || '',
    topServico2: item.tiposMaisUtilizados[1]?.quantidade || 0,
    topServico2Nome: item.tiposMaisUtilizados[1]?.tipoServico || '',
    topServico3: item.tiposMaisUtilizados[2]?.quantidade || 0,
    topServico3Nome: item.tiposMaisUtilizados[2]?.tipoServico || ''
  }));

  // Coletar todos os serviços únicos usados no gráfico para a legenda
  const servicosUnicosNoGrafico = new Set<string>();
  dadosServicos.servicosPorTipoEvento.forEach(item => {
    item.tiposMaisUtilizados.forEach(servico => {
      if (servico.tipoServico) {
        servicosUnicosNoGrafico.add(servico.tipoServico);
      }
    });
  });

  // Criar mapeamento de cores para serviços
  const coresServicos: Record<string, string> = {};
  const coresDisponiveis = ['#21b6bf', '#5d6b74', '#1a9ba3', '#313c43', '#d97757', '#a4b3ba'];
  Array.from(servicosUnicosNoGrafico).forEach((servico, index) => {
    coresServicos[servico] = coresDisponiveis[index % coresDisponiveis.length];
  });

  // Criar config dinâmico baseado nos nomes dos serviços
  const chartConfigTipoEvento: Record<string, { label: string; color: string }> = {
    quantidadeServicos: {
      label: "Total de Serviços",
      color: "#313c43"
    }
  };

  // Adicionar configurações dinâmicas para cada serviço único
  Array.from(servicosUnicosNoGrafico).forEach((servico, index) => {
    const chave = `servico_${index}`;
    chartConfigTipoEvento[chave] = {
      label: servico,
      color: coresServicos[servico]
    };
  });

  const exportarCSV = () => {
    const csvData = [
      ['Relatório de Serviços por Tipo'],
      [`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['SERVIÇOS POR TIPO'],
      ['Tipo de Serviço', 'Quantidade', 'Percentual (%)', 'Eventos Utilizando'],
      ...dadosServicos.servicosPorTipo.map(item => [
        item.tipoServico,
        item.quantidade,
        item.percentual.toFixed(2),
        item.eventosUtilizando
      ]),
      [''],
      ['SERVIÇOS POR EVENTO'],
      ['Cliente', 'Data do Evento', 'Tipo de Evento', 'Quantidade de Serviços', 'Tipos de Serviços'],
      ...dadosServicos.servicosPorEvento.map(item => [
        item.clienteNome,
        format(item.dataEvento, 'dd/MM/yyyy', { locale: ptBR }),
        item.tipoEvento,
        item.quantidadeServicos,
        item.tiposServicos.join(', ')
      ]),
      [''],
      ['SERVIÇOS POR MÊS'],
      ['Mês', 'Quantidade de Serviços', 'Tipos Únicos'],
      ...dadosServicos.servicosPorMes.map(item => [
        item.mes,
        item.quantidadeServicos,
        item.tiposUnicos
      ]),
      [''],
      ['SERVIÇOS POR TIPO DE EVENTO'],
      ['Tipo de Evento', 'Quantidade de Serviços', 'Tipos Mais Utilizados'],
      ...dadosServicos.servicosPorTipoEvento.map(item => [
        item.tipoEvento,
        item.quantidadeServicos,
        item.tiposMaisUtilizados.map(t => `${t.tipoServico} (${t.quantidade})`).join(', ')
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-servicos-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
            <WrenchScrewdriverIcon className="h-5 w-5" />
            Relatório de Serviços por Tipo
          </CardTitle>
          <CardDescription>
            Análise detalhada da utilização de serviços por tipo e evento
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
      {dadosServicos.alertas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Alertas de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dadosServicos.alertas.map((alerta, index) => (
                <div key={index} className={`p-3 rounded-lg ${getSeveridadeColor(alerta.severidade)}`}>
                  <div className="font-medium">{alerta.mensagem}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Serviços por Tipo */}
      <TabbedChart
        title="Serviços por Tipo"
        subtitle="Distribuição dos serviços contratados por tipo"
        titleTooltip={{
          title: "Serviços por Tipo",
          description: "Distribuição visual dos serviços agrupados por tipo (Totem Fotográfico, Álbum de Assinaturas, etc.) no período selecionado.",
          calculation: "Cada serviço é contabilizado uma vez de acordo com seu tipoServicoId. O gráfico mostra a quantidade e percentual de cada tipo de serviço."
        }}
        tabs={[
          {
            id: 'pizza',
            label: '🥧 Pizza',
            content: (
              <PieChart 
                data={servicosPorTipoData}
                config={{ 
                  showLegend: true, 
                  showValues: true, 
                  showPercentages: true 
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tipo de Serviço</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Quantidade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Percentual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Eventos Utilizando</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {dadosServicos.servicosPorTipo.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{item.tipoServico}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.quantidade}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.percentual.toFixed(1)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.eventosUtilizando}</td>
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

      {/* Serviços por Tipo de Evento */}
      <Card>
        <CardHeader>
          <CardTitle>Serviços por Tipo de Evento</CardTitle>
          <CardDescription>
            Distribuição de serviços e tipos mais utilizados por tipo de evento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <ChartContainer config={chartConfigTipoEvento} className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={servicosPorTipoEventoChartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(164, 179, 186, 0.3)" />
                    <XAxis 
                      dataKey="tipoEvento" 
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
                        const payloadData = payload[0]?.payload as any;
                        return (
                          <div className="rounded-lg border bg-surface border-border p-3 shadow-lg">
                            <div className="mb-2 text-sm font-semibold text-text-primary">
                              {payloadData?.tipoEvento}
                            </div>
                            <div className="space-y-1">
                              {payload.map((entry: any, index: number) => {
                                let nomeServico = entry.name;
                                if (entry.dataKey === 'topServico1' && payloadData?.topServico1Nome) {
                                  nomeServico = payloadData.topServico1Nome;
                                } else if (entry.dataKey === 'topServico2' && payloadData?.topServico2Nome) {
                                  nomeServico = payloadData.topServico2Nome;
                                } else if (entry.dataKey === 'topServico3' && payloadData?.topServico3Nome) {
                                  nomeServico = payloadData.topServico3Nome;
                                }
                                return (
                                  <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                      />
                                      <span className="text-text-secondary">{nomeServico}:</span>
                                    </div>
                                    <span className="font-semibold text-text-primary">
                                      {typeof entry.value === 'number' ? entry.value : entry.value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar 
                      dataKey="quantidadeServicos" 
                      fill="#313c43" 
                      name="Total de Serviços"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="topServico1" 
                      fill="#21b6bf" 
                      name="Top 1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="topServico2" 
                      fill="#5d6b74" 
                      name="Top 2"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="topServico3" 
                      fill="#1a9ba3" 
                      name="Top 3"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
            <div className="border-l border-border pl-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Legenda de Serviços</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 rounded" style={{ backgroundColor: '#313c43' }}></div>
                    <span className="text-sm font-medium text-text-primary">Total de Serviços</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Serviços por Posição:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#21b6bf' }}></div>
                      <span className="text-xs text-text-primary">1º Mais Utilizado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#5d6b74' }}></div>
                      <span className="text-xs text-text-primary">2º Mais Utilizado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: '#1a9ba3' }}></div>
                      <span className="text-xs text-text-primary">3º Mais Utilizado</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-2">Serviços Utilizados:</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {Array.from(servicosUnicosNoGrafico).map((servico) => {
                      // Encontrar em quais tipos de evento este serviço aparece e em qual posição
                      const ocorrencias = dadosServicos.servicosPorTipoEvento
                        .filter(item => item.tiposMaisUtilizados.some(s => s.tipoServico === servico))
                        .map(item => {
                          const posicao = item.tiposMaisUtilizados.findIndex(s => s.tipoServico === servico);
                          return { tipoEvento: item.tipoEvento, posicao: posicao + 1 };
                        });
                      
                      const coresPorPosicao = ['#21b6bf', '#5d6b74', '#1a9ba3'];
                      const cor = ocorrencias.length > 0 
                        ? coresPorPosicao[ocorrencias[0].posicao - 1] || '#21b6bf'
                        : coresServicos[servico] || '#21b6bf';
                      
                      return (
                        <div key={servico} className="flex items-start gap-2">
                          <div 
                            className="h-3 w-3 rounded mt-1 flex-shrink-0" 
                            style={{ backgroundColor: cor }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-text-primary block truncate">{servico}</span>
                            {ocorrencias.length > 0 && (
                              <span className="text-xs text-text-secondary">
                                {ocorrencias.map(o => `${o.tipoEvento} (${o.posicao}º)`).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tendências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Tendências e Insights
          </CardTitle>
          <CardDescription>
            Análise das tendências de utilização de serviços
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-accent/10 border-border">
              <h4 className="font-medium text-accent-dark mb-2">Serviço Mais Utilizado</h4>
              <p className="text-accent font-bold">{dadosServicos.tendencias.servicoMaisUtilizado}</p>
            </div>
            <div className="p-4 border rounded-lg bg-[#d97757]/10 border-border">
              <h4 className="font-medium text-[#d97757] mb-2">Serviço Menos Utilizado</h4>
              <p className="text-[#d97757] font-bold">{dadosServicos.tendencias.servicoMenosUtilizado}</p>
            </div>
            <div className="p-4 border rounded-lg bg-secondary/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-secondary">Crescimento</h4>
                <InfoTooltip
                  title="Crescimento"
                  description="Indica a variação percentual na quantidade de serviços contratados entre o primeiro e o último mês do período analisado. Valores positivos indicam crescimento, valores negativos indicam redução."
                  calculation="Cálculo: ((quantidade do último mês - quantidade do primeiro mês) / quantidade do primeiro mês) × 100. Requer pelo menos 2 meses de dados para ser calculado."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className={`font-bold ${dadosServicos.tendencias.crescimentoUtilizacao >= 0 ? 'text-accent' : 'text-[#d97757]'}`}>
                {dadosServicos.tendencias.crescimentoUtilizacao.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-accent-dark/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-accent-dark">
                  Tipos em Alta
                  {dadosServicos.tendencias.tiposEmAlta.length > 0 && (
                    <span className="ml-2 text-xs font-normal">({dadosServicos.tendencias.tiposEmAlta.length})</span>
                  )}
                </h4>
                <InfoTooltip
                  title="Tipos em Alta"
                  description="Tipos de serviços que representam mais de 15% do total de serviços contratados no período analisado. Isso indica serviços com alta demanda e relevância no negócio."
                  calculation="Para cada tipo de serviço, calculamos: (quantidade do tipo / total de serviços) × 100. Tipos com percentual maior que 15% são considerados 'em alta'."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              {dadosServicos.tendencias.tiposEmAlta.length > 0 ? (
                <div className="space-y-1.5">
                  {dadosServicos.tendencias.tiposEmAlta.map((tipo, index) => {
                    const tipoInfo = dadosServicos.servicosPorTipo.find(t => t.tipoServico === tipo);
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-accent-dark font-medium truncate pr-2">{tipo}</span>
                        {tipoInfo && (
                          <span className="text-accent-dark/70 text-xs flex-shrink-0">
                            {tipoInfo.percentual.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-accent-dark/70 text-sm">Nenhum tipo acima de 15%</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
