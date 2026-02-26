'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Evento } from '@/types';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filtrarEventosValidos } from '@/lib/utils/evento-filters';
import { ArrowDownTrayIcon, PrinterIcon, ExclamationTriangleIcon, ChartBarIcon, EyeIcon } from '@heroicons/react/24/outline';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Area, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { 
  StatCard, 
  StatGrid, 
  TabbedChart, 
  PieChart, 
  BarChart,
  ChartDataPoint 
} from '@/components/charts';

interface ImpressoesReportProps {
  eventos: Evento[];
}

export default function ImpressoesReport({ eventos }: ImpressoesReportProps) {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState(
    format(subMonths(new Date(), 11), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const dadosImpressoes = useMemo(() => {
    // Normalizar datas para comparar apenas dia/mês/ano (sem hora)
    const normalizarData = (data: Date): Date => {
      const dataNormalizada = new Date(data);
      dataNormalizada.setHours(0, 0, 0, 0);
      return dataNormalizada;
    };

    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const inicio = normalizarData(new Date(dataInicio));
    const fim = normalizarData(new Date(dataFim));
    // Adicionar 1 dia ao fim para incluir eventos do último dia (comparar com <)
    const fimInclusivo = new Date(fim);
    fimInclusivo.setDate(fimInclusivo.getDate() + 1);
    
    // Filtrar eventos do período
    const eventosPeriodo = eventosValidos.filter(evento => {
      const dataEvento = normalizarData(new Date(evento.dataEvento));
      return dataEvento >= inicio && dataEvento < fimInclusivo;
    });

    // Resumo geral
    const totalImpressoes = eventosPeriodo.reduce((sum, evento) => sum + (evento.numeroImpressoes || 0), 0);
    const eventosComImpressoes = eventosPeriodo.filter(e => (e.numeroImpressoes || 0) > 0).length;
    const eventosSemImpressoesList = eventosPeriodo.filter(e => (e.numeroImpressoes || 0) === 0);
    const eventosSemImpressoes = eventosSemImpressoesList.length;
    const taxaUtilizacaoImpressoes = eventosPeriodo.length > 0 ? (eventosComImpressoes / eventosPeriodo.length) * 100 : 0;
    
    // Custo médio por impressão (assumindo R$ 0,50 por impressão)
    const custoPorImpressao = 0.50;
    const custoMedioPorImpressao = custoPorImpressao;

    // Impressões por evento
    const impressoesPorEvento = eventosPeriodo
      .filter(e => (e.numeroImpressoes || 0) > 0)
      .map(evento => ({
        eventoId: evento.id,
        clienteNome: evento.cliente.nome,
        dataEvento: evento.dataEvento,
        tipoEvento: evento.tipoEvento,
        quantidadeImpressoes: evento.numeroImpressoes || 0,
        valorEvento: evento.valorTotal,
        custoImpressaoPorEvento: (evento.numeroImpressoes || 0) * custoPorImpressao
      }))
      .sort((a, b) => b.quantidadeImpressoes - a.quantidadeImpressoes);

    // Impressões por tipo de evento
    const impressoesPorTipoMap: Record<string, { total: number; eventos: number; somaImpressoes: number }> = {};
    eventosPeriodo.forEach(evento => {
      if (!impressoesPorTipoMap[evento.tipoEvento]) {
        impressoesPorTipoMap[evento.tipoEvento] = { total: 0, eventos: 0, somaImpressoes: 0 };
      }
      impressoesPorTipoMap[evento.tipoEvento].total++;
      if ((evento.numeroImpressoes || 0) > 0) {
        impressoesPorTipoMap[evento.tipoEvento].eventos++;
        impressoesPorTipoMap[evento.tipoEvento].somaImpressoes += evento.numeroImpressoes || 0;
      }
    });

    const impressoesPorTipoEvento = Object.entries(impressoesPorTipoMap).map(([tipo, dados]) => ({
      tipoEvento: tipo,
      totalImpressoes: dados.somaImpressoes,
      eventosComImpressoes: dados.eventos,
      mediaImpressoesPorEvento: dados.eventos > 0 ? dados.somaImpressoes / dados.eventos : 0,
      percentual: totalImpressoes > 0 ? (dados.somaImpressoes / totalImpressoes) * 100 : 0
    }));

    // Impressões por mês
    const impressoesPorMesMap: Record<string, { totalImpressoes: number; eventosComImpressoes: number }> = {};
    eventosPeriodo.forEach(evento => {
      const mes = format(new Date(evento.dataEvento), 'yyyy-MM');
      if (!impressoesPorMesMap[mes]) {
        impressoesPorMesMap[mes] = { totalImpressoes: 0, eventosComImpressoes: 0 };
      }
      impressoesPorMesMap[mes].totalImpressoes += evento.numeroImpressoes || 0;
      if ((evento.numeroImpressoes || 0) > 0) {
        impressoesPorMesMap[mes].eventosComImpressoes++;
      }
    });

    const meses = eachMonthOfInterval({ start: inicio, end: fim });
    const impressoesPorMes = meses.map(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const dados = impressoesPorMesMap[mesKey] || { totalImpressoes: 0, eventosComImpressoes: 0 };
      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        ano: mes.getFullYear(),
        totalImpressoes: dados.totalImpressoes,
        eventosComImpressoes: dados.eventosComImpressoes,
        custoTotalImpressoes: dados.totalImpressoes * custoPorImpressao
      };
    });

    // Análise custo-benefício
    const analiseCustoBeneficio = impressoesPorTipoEvento.map(tipo => {
      const eventosTipo = eventosPeriodo.filter(e => e.tipoEvento === tipo.tipoEvento);
      const valorMedioEvento = eventosTipo.length > 0 ? 
        eventosTipo.reduce((sum, e) => sum + e.valorTotal, 0) / eventosTipo.length : 0;
      const custoMedioImpressoes = tipo.mediaImpressoesPorEvento * custoPorImpressao;
      const percentualCustoImpressoes = valorMedioEvento > 0 ? (custoMedioImpressoes / valorMedioEvento) * 100 : 0;
      const roiImpressoes = valorMedioEvento > 0 ? ((valorMedioEvento - custoMedioImpressoes) / custoMedioImpressoes) * 100 : 0;
      
      return {
        tipoEvento: tipo.tipoEvento,
        valorMedioEvento,
        custoMedioImpressoes,
        percentualCustoImpressoes,
        roiImpressoes
      };
    });

    // Tendências
    const eventoComMaisImpressoes = impressoesPorEvento.length > 0 ? 
      impressoesPorEvento[0].clienteNome : 'N/A';
    const eventoComMenosImpressoes = impressoesPorEvento.length > 0 ? 
      impressoesPorEvento[impressoesPorEvento.length - 1].clienteNome : 'N/A';
    
    const crescimentoImpressoes = impressoesPorMes.length >= 2 ? 
      ((impressoesPorMes[impressoesPorMes.length - 1].totalImpressoes - impressoesPorMes[0].totalImpressoes) / 
       Math.max(impressoesPorMes[0].totalImpressoes, 1)) * 100 : 0;

    const tiposEventoMaisImpressos = impressoesPorTipoEvento
      .filter(tipo => tipo.percentual > 20)
      .map(tipo => tipo.tipoEvento);

    // Alertas
    const alertas = [];
    if (eventosSemImpressoes > 0) {
      alertas.push({
        tipo: 'evento_sem_impressoes' as const,
        mensagem: `${eventosSemImpressoes} eventos sem impressões cadastradas`,
        severidade: 'media' as const,
        eventosSemImpressoes: eventosSemImpressoesList.map(evento => ({
          id: evento.id,
          clienteNome: evento.cliente.nome,
          dataEvento: evento.dataEvento,
          tipoEvento: evento.tipoEvento,
          nomeEvento: evento.nomeEvento || 'Sem nome'
        }))
      });
    }
    
    const altoCustoImpressoes = analiseCustoBeneficio.find(analise => analise.percentualCustoImpressoes > 10);
    if (altoCustoImpressoes) {
      alertas.push({
        tipo: 'alto_custo_impressoes' as const,
        mensagem: `${altoCustoImpressoes.tipoEvento} com alto custo de impressões (${altoCustoImpressoes.percentualCustoImpressoes.toFixed(1)}% do valor do evento)`,
        severidade: 'alta' as const
      });
    }

    if (taxaUtilizacaoImpressoes < 50) {
      alertas.push({
        tipo: 'baixa_utilizacao' as const,
        mensagem: `Baixa utilização de impressões (${taxaUtilizacaoImpressoes.toFixed(1)}% dos eventos)`,
        severidade: 'baixa' as const
      });
    }

    return {
      periodo: { inicio, fim },
      resumoGeral: {
        totalImpressoes,
        eventosComImpressoes,
        eventosSemImpressoes,
        taxaUtilizacaoImpressoes,
        custoMedioPorImpressao
      },
      impressoesPorEvento,
      impressoesPorTipoEvento,
      impressoesPorMes,
      analiseCustoBeneficio,
      tendencias: {
        eventoComMaisImpressoes,
        eventoComMenosImpressoes,
        crescimentoImpressoes,
        tiposEventoMaisImpressos
      },
      alertas
    };
  }, [dataInicio, dataFim, eventos]);

  // Converter dados para formato dos gráficos
  const impressoesPorTipoData: ChartDataPoint[] = dadosImpressoes.impressoesPorTipoEvento.map(item => ({
    label: item.tipoEvento,
    value: item.totalImpressoes,
    percentage: item.percentual
  }));

  const impressoesPorMesData: ChartDataPoint[] = dadosImpressoes.impressoesPorMes.map(item => ({
    label: item.mes,
    value: item.totalImpressoes,
    percentage: 0
  }));

  const custoBeneficioData: ChartDataPoint[] = dadosImpressoes.analiseCustoBeneficio.map(item => ({
    label: item.tipoEvento,
    value: item.percentualCustoImpressoes,
    percentage: 0
  }));

  // Dados formatados para gráficos melhorados
  const impressoesPorMesChartData = dadosImpressoes.impressoesPorMes.map(item => ({
    mes: item.mes,
    totalImpressoes: item.totalImpressoes,
    eventosComImpressoes: item.eventosComImpressoes,
    custoTotalImpressoes: item.custoTotalImpressoes
  }));

  const custoImpressoesPorTipoChartData = dadosImpressoes.analiseCustoBeneficio.map(item => ({
    tipoEvento: item.tipoEvento,
    percentualCusto: item.percentualCustoImpressoes,
    custoMedioImpressoes: item.custoMedioImpressoes,
    valorMedioEvento: item.valorMedioEvento,
    roiImpressoes: item.roiImpressoes
  }));

  const chartConfigImpressoes = {
    totalImpressoes: {
      label: "Total de Impressões",
      color: "#313c43"
    },
    eventosComImpressoes: {
      label: "Eventos com Impressões",
      color: "#21b6bf"
    },
    custoTotalImpressoes: {
      label: "Custo Total (R$)",
      color: "#1a9ba3"
    }
  };

  const chartConfigCusto = {
    percentualCusto: {
      label: "Percentual do Custo (%)",
      color: "#d97757"
    },
    custoMedioImpressoes: {
      label: "Custo Médio (R$)",
      color: "#5d6b74"
    },
    valorMedioEvento: {
      label: "Valor Médio Evento (R$)",
      color: "#21b6bf"
    },
    roiImpressoes: {
      label: "ROI Impressões (%)",
      color: "#1a9ba3"
    }
  };

  const exportarCSV = () => {
    const csvData = [
      ['Relatório de Impressões dos Eventos'],
      [`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['RESUMO GERAL'],
      ['Total de Impressões', dadosImpressoes.resumoGeral.totalImpressoes],
      ['Eventos com Impressões', dadosImpressoes.resumoGeral.eventosComImpressoes],
      ['Eventos sem Impressões', dadosImpressoes.resumoGeral.eventosSemImpressoes],
      ['Taxa de Utilização (%)', dadosImpressoes.resumoGeral.taxaUtilizacaoImpressoes.toFixed(2)],
      ['Custo Médio por Impressão', `R$ ${dadosImpressoes.resumoGeral.custoMedioPorImpressao.toFixed(2)}`],
      [''],
      ['IMPRESSÕES POR TIPO DE EVENTO'],
      ['Tipo de Evento', 'Total Impressões', 'Eventos com Impressões', 'Média por Evento', 'Percentual (%)'],
      ...dadosImpressoes.impressoesPorTipoEvento.map(item => [
        item.tipoEvento,
        item.totalImpressoes,
        item.eventosComImpressoes,
        item.mediaImpressoesPorEvento.toFixed(1),
        item.percentual.toFixed(2)
      ]),
      [''],
      ['ANÁLISE CUSTO-BENEFÍCIO'],
      ['Tipo de Evento', 'Valor Médio Evento', 'Custo Médio Impressões', 'Percentual Custo (%)', 'ROI Impressões (%)'],
      ...dadosImpressoes.analiseCustoBeneficio.map(item => [
        item.tipoEvento,
        item.valorMedioEvento.toFixed(2),
        item.custoMedioImpressoes.toFixed(2),
        item.percentualCustoImpressoes.toFixed(2),
        item.roiImpressoes.toFixed(2)
      ]),
      [''],
      ['IMPRESSÕES POR MÊS'],
      ['Mês', 'Total Impressões', 'Eventos com Impressões', 'Custo Total'],
      ...dadosImpressoes.impressoesPorMes.map(item => [
        item.mes,
        item.totalImpressoes,
        item.eventosComImpressoes,
        item.custoTotalImpressoes.toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-impressoes-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
            <PrinterIcon className="h-5 w-5" />
            Relatório de Impressões dos Eventos
          </CardTitle>
          <CardDescription>
            Análise detalhada do uso de impressões e custos de insumos
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
      {dadosImpressoes.alertas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Alertas de Impressões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dadosImpressoes.alertas.map((alerta, index) => (
                <div key={index} className={`p-3 rounded-lg ${getSeveridadeColor(alerta.severidade)}`}>
                  <div className="font-medium mb-2">{alerta.mensagem}</div>
                  {alerta.tipo === 'evento_sem_impressoes' && alerta.eventosSemImpressoes && alerta.eventosSemImpressoes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-semibold text-text-secondary mb-2">Eventos sem impressões:</div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-surface/50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Cliente</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Data do Evento</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Tipo</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Nome do Evento</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="bg-background/50 divide-y divide-border">
                            {alerta.eventosSemImpressoes.map((evento, idx) => (
                              <tr key={evento.id || idx}>
                                <td className="px-4 py-2 text-sm text-text-primary">{evento.clienteNome}</td>
                                <td className="px-4 py-2 text-sm text-text-primary">
                                  {format(new Date(evento.dataEvento), 'dd/MM/yyyy', { locale: ptBR })}
                                </td>
                                <td className="px-4 py-2 text-sm text-text-primary">{evento.tipoEvento}</td>
                                <td className="px-4 py-2 text-sm text-text-primary">{evento.nomeEvento}</td>
                                <td className="px-4 py-2 text-sm text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/eventos/${evento.id}`)}
                                    className="hover:bg-primary/10 hover:text-primary"
                                    title="Visualizar evento"
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
          title="Total de Impressões"
          value={dadosImpressoes.resumoGeral.totalImpressoes.toLocaleString('pt-BR')}
          color="primary"
          tooltip={{
            title: "Total de Impressões",
            description: "Soma total de todas as impressões realizadas nos eventos do período selecionado. Representa o volume total de impressões.",
            calculation: "Total de Impressões = Soma do campo numeroImpressoes de todos os eventos cuja dataEvento está dentro do período selecionado."
          }}
        />
        <StatCard
          title="Eventos com Impressões"
          value={dadosImpressoes.resumoGeral.eventosComImpressoes}
          color="info"
          tooltip={{
            title: "Eventos com Impressões",
            description: "Quantidade de eventos que possuem impressões cadastradas (numeroImpressoes > 0). Indica quantos eventos utilizaram impressões.",
            calculation: "Eventos com Impressões = Contagem de eventos únicos com numeroImpressoes maior que zero no período."
          }}
        />
        <StatCard
          title="Taxa de Utilização"
          value={`${dadosImpressoes.resumoGeral.taxaUtilizacaoImpressoes.toFixed(1)}%`}
          color={dadosImpressoes.resumoGeral.taxaUtilizacaoImpressoes >= 70 ? "success" : "warning"}
          tooltip={{
            title: "Taxa de Utilização",
            description: "Percentual de eventos que possuem impressões cadastradas. Indica o quanto as impressões estão sendo utilizadas.",
            calculation: "Taxa de Utilização = (Eventos com Impressões / Total de Eventos no Período) × 100. Valores acima de 70% indicam boa utilização."
          }}
        />
        <StatCard
          title="Custo Médio por Impressão"
          value={`R$ ${dadosImpressoes.resumoGeral.custoMedioPorImpressao.toFixed(2)}`}
          color="info"
          tooltip={{
            title: "Custo Médio por Impressão",
            description: "Custo médio estimado por impressão. Atualmente fixo em R$ 0,50 por impressão. Útil para calcular custos totais.",
            calculation: "Custo Médio por Impressão = R$ 0,50 (valor fixo). Custo Total = Total de Impressões × R$ 0,50."
          }}
        />
      </StatGrid>

      {/* Impressões por Tipo de Evento */}
      <TabbedChart
        title="Impressões por Tipo de Evento"
        subtitle="Distribuição das impressões por categoria de evento"
        titleTooltip={{
          title: "Impressões por Tipo de Evento",
          description: "Distribuição visual das impressões agrupadas por tipo de evento (Casamento, Aniversário, etc.) no período selecionado.",
          calculation: "As impressões são somadas por tipo de evento. Cada evento contribui com seu numeroImpressoes para o total do seu tipoEvento."
        }}
        tabs={[
          {
            id: 'pizza',
            label: '🥧 Pizza',
            content: (
              <PieChart 
                data={impressoesPorTipoData}
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
                data={impressoesPorTipoData}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tipo de Evento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total Impressões</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Eventos com Impressões</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Média por Evento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Percentual</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {dadosImpressoes.impressoesPorTipoEvento.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{item.tipoEvento}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.totalImpressoes.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.eventosComImpressoes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.mediaImpressoesPorEvento.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.percentual.toFixed(1)}%</td>
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

      {/* Análise Temporal e Custo-Benefício */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Impressões por Mês</CardTitle>
              <InfoTooltip
                title="Impressões por Mês"
                description="Evolução temporal do uso de impressões ao longo do período, mostrando quantidade de impressões, eventos com impressões e custos mensais."
                calculation="Impressões são agrupadas por mês da dataEvento. Mostra total de impressões, eventos que utilizaram impressões e custo total (impressões × R$ 0,50) por mês."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <CardDescription>
              Evolução do uso de impressões, eventos e custos ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[500px]">
              <ChartContainer config={chartConfigImpressoes} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={impressoesPorMesChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 50 }}
                >
                  <defs>
                    <linearGradient id="colorImpressoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#313c43" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#313c43" stopOpacity={0.1}/>
                    </linearGradient>
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
                    yAxisId="left"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    width={50}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                    width={60}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border bg-surface border-border p-3 shadow-lg">
                          <div className="mb-2 text-sm font-semibold text-text-primary">
                            {data?.mes}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Total Impressões:</span>
                              <span className="font-semibold text-text-primary">{data?.totalImpressoes?.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Eventos com Impressões:</span>
                              <span className="font-semibold text-text-primary">{data?.eventosComImpressoes}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Custo Total:</span>
                              <span className="font-semibold text-text-primary">
                                R$ {typeof data?.custoTotalImpressoes === 'number' 
                                  ? data.custoTotalImpressoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                  : data?.custoTotalImpressoes}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="totalImpressoes" 
                    fill="url(#colorImpressoes)"
                    stroke="#313c43"
                    strokeWidth={2}
                    name="Total de Impressões"
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="eventosComImpressoes" 
                    fill="#21b6bf" 
                    name="Eventos com Impressões"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="custoTotalImpressoes" 
                    stroke="#1a9ba3" 
                    strokeWidth={3}
                    name="Custo Total (R$)"
                    dot={{ fill: '#1a9ba3', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Custo de Impressões por Tipo</CardTitle>
              <InfoTooltip
                title="Custo de Impressões por Tipo"
                description="Análise de custo-benefício das impressões por tipo de evento, mostrando percentual de custo em relação ao valor do evento e ROI (Retorno sobre Investimento)."
                calculation="Percentual de Custo = (Custo Médio de Impressões / Valor Médio do Evento) × 100. ROI = ((Valor Médio - Custo Médio) / Custo Médio) × 100. Custo por impressão = R$ 0,50."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <CardDescription>
              Análise completa: percentual de custo, valores e ROI por tipo de evento
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[500px]">
              <ChartContainer config={chartConfigCusto} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={custoImpressoesPorTipoChartData}
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
                    yAxisId="left"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}k`}
                    width={60}
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
                            {data?.tipoEvento}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Percentual Custo:</span>
                              <span className="font-semibold text-text-primary">{data?.percentualCusto?.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Custo Médio:</span>
                              <span className="font-semibold text-text-primary">
                                R$ {typeof data?.custoMedioImpressoes === 'number' 
                                  ? data.custoMedioImpressoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                  : data?.custoMedioImpressoes}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">Valor Médio Evento:</span>
                              <span className="font-semibold text-text-primary">
                                R$ {typeof data?.valorMedioEvento === 'number' 
                                  ? data.valorMedioEvento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                                  : data?.valorMedioEvento}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-text-secondary">ROI Impressões:</span>
                              <span className={`font-semibold ${data?.roiImpressoes >= 0 ? 'text-accent' : 'text-[#d97757]'}`}>
                                {data?.roiImpressoes?.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar 
                    yAxisId="right"
                    dataKey="percentualCusto" 
                    fill="#d97757" 
                    name="Percentual do Custo (%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="custoMedioImpressoes" 
                    fill="#5d6b74" 
                    name="Custo Médio (R$)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="valorMedioEvento" 
                    fill="#21b6bf" 
                    name="Valor Médio Evento (R$)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="roiImpressoes" 
                    stroke="#1a9ba3" 
                    strokeWidth={3}
                    name="ROI Impressões (%)"
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

      {/* Top Eventos com Mais Impressões */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Top Eventos com Mais Impressões</CardTitle>
            <InfoTooltip
              title="Top Eventos com Mais Impressões"
              description="Lista dos eventos que mais utilizaram impressões no período selecionado, ordenados por quantidade de impressões."
              calculation="Eventos são ordenados por numeroImpressoes em ordem decrescente. Mostra os eventos com maior volume de impressões e seus custos associados."
              className="flex-shrink-0"
              iconClassName="h-6 w-6"
            />
          </div>
          <CardDescription>
            Eventos que mais utilizaram impressões no período
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de Período */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border">
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
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Impressões</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Valor Evento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Custo Impressões</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {dadosImpressoes.impressoesPorEvento.slice(0, 10).map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{item.clienteNome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {format(item.dataEvento, 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.tipoEvento}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{item.quantidadeImpressoes.toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      R$ {item.valorEvento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      R$ {item.custoImpressaoPorEvento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/eventos/${item.eventoId}`)}
                        className="hover:bg-primary/10 hover:text-primary"
                        title="Visualizar evento"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Análise das tendências de uso de impressões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-accent/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-accent-dark">Evento com Mais Impressões</h4>
                <InfoTooltip
                  title="Evento com Mais Impressões"
                  description="Cliente/evento que utilizou a maior quantidade de impressões no período. Indica eventos com maior volume de impressões."
                  calculation="Evento com Mais Impressões = Evento com maior valor de numeroImpressoes no período selecionado."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className="text-accent font-bold">{dadosImpressoes.tendencias.eventoComMaisImpressoes}</p>
            </div>
            <div className="p-4 border rounded-lg bg-[#d97757]/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-[#d97757]">Evento com Menos Impressões</h4>
                <InfoTooltip
                  title="Evento com Menos Impressões"
                  description="Cliente/evento que utilizou a menor quantidade de impressões no período (entre os eventos que utilizaram impressões)."
                  calculation="Evento com Menos Impressões = Evento com menor valor de numeroImpressoes (maior que zero) no período selecionado."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className="text-[#d97757] font-bold">{dadosImpressoes.tendencias.eventoComMenosImpressoes}</p>
            </div>
            <div className="p-4 border rounded-lg bg-secondary/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-secondary">Crescimento de Impressões</h4>
                <InfoTooltip
                  title="Crescimento de Impressões"
                  description="Variação percentual na quantidade de impressões entre o primeiro e o último mês do período analisado."
                  calculation="Crescimento de Impressões = ((Impressões do Último Mês - Impressões do Primeiro Mês) / Impressões do Primeiro Mês) × 100. Requer pelo menos 2 meses de dados."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              <p className={`font-bold ${dadosImpressoes.tendencias.crescimentoImpressoes >= 0 ? 'text-accent' : 'text-[#d97757]'}`}>
                {dadosImpressoes.tendencias.crescimentoImpressoes.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-accent-dark/10 border-border">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-accent-dark">
                  Tipos Mais Impressos
                  {dadosImpressoes.tendencias.tiposEventoMaisImpressos.length > 0 && (
                    <span className="ml-2 text-xs font-normal">({dadosImpressoes.tendencias.tiposEventoMaisImpressos.length})</span>
                  )}
                </h4>
                <InfoTooltip
                  title="Tipos Mais Impressos"
                  description="Tipos de eventos que representam mais de 20% do total de impressões no período. Indica tipos de eventos com alta utilização de impressões."
                  calculation="Para cada tipo de evento, calculamos: (impressões do tipo / total de impressões) × 100. Tipos com percentual maior que 20% são considerados 'em alta'."
                  className="flex-shrink-0"
                  iconClassName="h-6 w-6"
                />
              </div>
              {dadosImpressoes.tendencias.tiposEventoMaisImpressos.length > 0 ? (
                <div className="space-y-1.5">
                  {dadosImpressoes.tendencias.tiposEventoMaisImpressos.map((tipo, index) => (
                    <div key={index} className="text-accent-dark font-medium text-sm">{tipo}</div>
                  ))}
                </div>
              ) : (
                <p className="text-accent-dark/70 text-sm">Nenhum tipo acima de 20%</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
