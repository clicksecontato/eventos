'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Evento, Pagamento, CustoEvento } from '@/types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownTrayIcon, ChartBarIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { 
  TabbedChart, 
  PieChart, 
  BarChart,
  ChartDataPoint 
} from '@/components/charts';

interface FluxoCaixaReportProps {
  eventos: Evento[];
  pagamentos: Pagamento[];
  custos: CustoEvento[];
}

export default function FluxoCaixaReport({ eventos, pagamentos, custos }: FluxoCaixaReportProps) {
  const [dataInicio, setDataInicio] = useState(
    format(subMonths(new Date(), 11), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const dadosFluxoCaixa = useMemo(() => {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    
    // Filtrar dados do período
    const pagamentosPeriodo = pagamentos.filter(p => {
      const dataPag = new Date(p.dataPagamento);
      return dataPag >= inicio && dataPag <= fim && p.status === 'Pago';
    });

    const custosPeriodo = custos.filter(c => {
      // Filtrar custos removidos
      if (c.removido) {
        return false;
      }
      // Validar se tem dataCadastro
      if (!c.dataCadastro) {
        return false;
      }
      try {
        const dataCusto = new Date(c.dataCadastro);
        // Verificar se a data é válida
        if (isNaN(dataCusto.getTime())) {
          return false;
        }
        return dataCusto >= inicio && dataCusto <= fim;
      } catch (error) {
        return false;
      }
    });

    // Calcular receitas por mês
    const receitasPorMes: Record<string, number> = {};
    pagamentosPeriodo.forEach(pagamento => {
      const mes = format(new Date(pagamento.dataPagamento), 'yyyy-MM');
      receitasPorMes[mes] = (receitasPorMes[mes] || 0) + pagamento.valor;
    });

    // Calcular despesas por mês
    const despesasPorMes: Record<string, number> = {};
    custosPeriodo.forEach(custo => {
      const mes = format(new Date(custo.dataCadastro), 'yyyy-MM');
      // Multiplicar valor pela quantidade (mesma lógica do cálculo por categoria)
      const valorTotal = custo.valor * (custo.quantidade || 1);
      despesasPorMes[mes] = (despesasPorMes[mes] || 0) + valorTotal;
    });

    // Gerar fluxo mensal
    const meses = eachMonthOfInterval({ start: inicio, end: fim });
    const fluxoMensal = meses.map(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const receitas = receitasPorMes[mesKey] || 0;
      const despesas = despesasPorMes[mesKey] || 0;
      const saldo = receitas - despesas;
      
      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        ano: mes.getFullYear(),
        receitas,
        despesas,
        saldo,
        saldoAcumulado: 0 // Será calculado depois
      };
    });

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    fluxoMensal.forEach(item => {
      saldoAcumulado += item.saldo;
      item.saldoAcumulado = saldoAcumulado;
    });

    // Receitas por forma de pagamento
    const receitasPorForma: Record<string, number> = {};
    pagamentosPeriodo.forEach(pagamento => {
      receitasPorForma[pagamento.formaPagamento] = 
        (receitasPorForma[pagamento.formaPagamento] || 0) + pagamento.valor;
    });

    const totalReceitas = Object.values(receitasPorForma).reduce((sum, val) => sum + val, 0);
    const receitasPorFormaPagamento = Object.entries(receitasPorForma).map(([forma, valor]) => ({
      formaPagamento: forma,
      valor,
      percentual: totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0
    }));

    // Despesas por categoria
    const despesasPorCategoria: Record<string, number> = {};
    custosPeriodo.forEach(custo => {
      const categoria = custo.tipoCusto?.nome || 'Sem categoria';
      const valorTotal = custo.valor * (custo.quantidade || 1);
      despesasPorCategoria[categoria] = (despesasPorCategoria[categoria] || 0) + valorTotal;
    });

    const totalDespesas = Object.values(despesasPorCategoria).reduce((sum, val) => sum + val, 0);
    const despesasPorCategoriaData = Object.entries(despesasPorCategoria).map(([categoria, valor]) => ({
      categoria,
      valor,
      percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
    }));

    // Resumo geral
    const receitaTotal = totalReceitas;
    const despesaTotal = totalDespesas;
    const saldoAtual = receitaTotal - despesaTotal;
    const saldoAnterior = fluxoMensal.length > 1 ? 
      fluxoMensal[fluxoMensal.length - 2].saldoAcumulado : 0;
    const variacaoSaldo = saldoAtual - saldoAnterior;
    const percentualVariacao = saldoAnterior !== 0 ? (variacaoSaldo / Math.abs(saldoAnterior)) * 100 : 0;

    // Projeção (simples baseada na média dos últimos 3 meses)
    const ultimos3Meses = fluxoMensal.slice(-3);
    const mediaReceita = ultimos3Meses.reduce((sum, m) => sum + m.receitas, 0) / ultimos3Meses.length;
    const mediaDespesa = ultimos3Meses.reduce((sum, m) => sum + m.despesas, 0) / ultimos3Meses.length;
    
    const proximos3Meses = [];
    for (let i = 1; i <= 3; i++) {
      const mesProjecao = new Date(fim);
      mesProjecao.setMonth(mesProjecao.getMonth() + i);
      proximos3Meses.push({
        mes: format(mesProjecao, 'MMM/yyyy', { locale: ptBR }),
        receitaProjetada: mediaReceita,
        despesaProjetada: mediaDespesa,
        saldoProjetado: mediaReceita - mediaDespesa
      });
    }

    // Determinar tendência
    const crescimento = ultimos3Meses.length >= 2 ? 
      ultimos3Meses[ultimos3Meses.length - 1].saldo - ultimos3Meses[0].saldo : 0;
    const tendencia = crescimento > 0 ? 'crescimento' : crescimento < 0 ? 'declinio' : 'estavel';

    // Alertas
    const alertas = [];
    if (saldoAtual < 0) {
      alertas.push({
        tipo: 'saldo_negativo' as const,
        mensagem: 'Saldo atual negativo detectado',
        severidade: 'alta' as const
      });
    }
    if (percentualVariacao < -20) {
      alertas.push({
        tipo: 'declinio_receita' as const,
        mensagem: 'Declínio significativo nas receitas',
        severidade: 'media' as const
      });
    }

    return {
      periodo: { inicio, fim },
      resumoGeral: {
        receitaTotal,
        despesaTotal,
        saldoAtual,
        saldoAnterior,
        variacaoSaldo,
        percentualVariacao
      },
      fluxoMensal,
      receitasPorFormaPagamento,
      despesasPorCategoria: despesasPorCategoriaData,
      projecao: {
        proximos3Meses,
        tendencia,
        confiabilidade: 75 // Baseado na estabilidade dos dados
      },
      alertas
    };
  }, [dataInicio, dataFim, pagamentos, custos]);

  // Converter dados para formato dos gráficos
  const receitasPorFormaData: ChartDataPoint[] = dadosFluxoCaixa.receitasPorFormaPagamento.map(item => ({
    label: item.formaPagamento,
    value: item.valor,
    percentage: item.percentual
  }));

  const despesasPorCategoriaData: ChartDataPoint[] = dadosFluxoCaixa.despesasPorCategoria.map(item => ({
    label: item.categoria,
    value: item.valor,
    percentage: item.percentual
  }));

  const fluxoMensalData: ChartDataPoint[] = dadosFluxoCaixa.fluxoMensal.map(item => ({
    label: item.mes,
    value: item.saldo,
    percentage: 0
  }));

  // Dados formatados para o gráfico combinado
  const fluxoMensalChartData = dadosFluxoCaixa.fluxoMensal.map(item => ({
    mes: item.mes,
    receitas: item.receitas,
    despesas: item.despesas,
    saldo: item.saldo,
    saldoAcumulado: item.saldoAcumulado
  }));

  const chartConfig = {
    receitas: {
      label: "Receitas",
      color: "#21b6bf"
    },
    despesas: {
      label: "Despesas",
      color: "#d97757"
    },
    saldo: {
      label: "Saldo",
      color: "#5d6b74"
    },
    saldoAcumulado: {
      label: "Saldo Acumulado",
      color: "#1a9ba3"
    }
  };

  const exportarCSV = () => {
    const csvData = [
      ['Relatório de Fluxo de Caixa'],
      [`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['RESUMO GERAL'],
      ['Receita Total', dadosFluxoCaixa.resumoGeral.receitaTotal],
      ['Despesa Total', dadosFluxoCaixa.resumoGeral.despesaTotal],
      ['Saldo Atual', dadosFluxoCaixa.resumoGeral.saldoAtual],
      ['Variação do Saldo', dadosFluxoCaixa.resumoGeral.variacaoSaldo],
      ['Percentual de Variação (%)', dadosFluxoCaixa.resumoGeral.percentualVariacao.toFixed(2)],
      [''],
      ['FLUXO MENSAL'],
      ['Mês', 'Receitas', 'Despesas', 'Saldo', 'Saldo Acumulado'],
      ...dadosFluxoCaixa.fluxoMensal.map(item => [
        item.mes,
        item.receitas,
        item.despesas,
        item.saldo,
        item.saldoAcumulado
      ]),
      [''],
      ['RECEITAS POR FORMA DE PAGAMENTO'],
      ['Forma de Pagamento', 'Valor', 'Percentual (%)'],
      ...dadosFluxoCaixa.receitasPorFormaPagamento.map(item => [
        item.formaPagamento,
        item.valor,
        item.percentual.toFixed(2)
      ]),
      [''],
      ['DESPESAS POR CATEGORIA'],
      ['Categoria', 'Valor', 'Percentual (%)'],
      ...dadosFluxoCaixa.despesasPorCategoria.map(item => [
        item.categoria,
        item.valor,
        item.percentual.toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fluxo-caixa-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
            <ChartBarIcon className="h-5 w-5" />
            Relatório de Fluxo de Caixa
          </CardTitle>
          <CardDescription>
            Análise completa do fluxo de caixa mensal com projeções
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
      {dadosFluxoCaixa.alertas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Alertas Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dadosFluxoCaixa.alertas.map((alerta, index) => (
                <div key={index} className={`p-3 rounded-lg ${getSeveridadeColor(alerta.severidade)}`}>
                  <div className="font-medium">{alerta.mensagem}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0 rounded-md p-2 bg-success-bg">
                <span className="text-success text-lg">💰</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Receita Total</p>
                  <InfoTooltip
                    title="Receita Total"
                    description="Soma de todos os pagamentos recebidos (status 'Pago') no período selecionado. Representa o dinheiro que entrou no caixa."
                    calculation="Receita Total = Soma de todos os pagamentos com status 'Pago' e dataPagamento dentro do período selecionado."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {dadosFluxoCaixa.resumoGeral.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0 rounded-md p-2 bg-error-bg">
                <span className="text-error text-lg">💸</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Despesa Total</p>
                  <InfoTooltip
                    title="Despesa Total"
                    description="Soma de todos os custos cadastrados no período selecionado. Representa o dinheiro que saiu do caixa em despesas."
                    calculation="Despesa Total = Soma de (valor × quantidade) de todos os custos com dataCadastro dentro do período. Custos removidos são excluídos."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {dadosFluxoCaixa.resumoGeral.despesaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex-shrink-0 rounded-md p-2 ${dadosFluxoCaixa.resumoGeral.saldoAtual >= 0 ? 'bg-success-bg' : 'bg-error-bg'}`}>
                <span className={`${dadosFluxoCaixa.resumoGeral.saldoAtual >= 0 ? 'text-success' : 'text-error'} text-lg`}>💵</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Saldo Atual</p>
                  <InfoTooltip
                    title="Saldo Atual"
                    description="Diferença entre receitas e despesas no período. Valores positivos indicam lucro, valores negativos indicam prejuízo."
                    calculation="Saldo Atual = Receita Total - Despesa Total. Representa o resultado financeiro líquido do período."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {dadosFluxoCaixa.resumoGeral.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex-shrink-0 rounded-md p-2 ${dadosFluxoCaixa.resumoGeral.percentualVariacao >= 0 ? 'bg-success-bg' : 'bg-error-bg'}`}>
                {dadosFluxoCaixa.resumoGeral.percentualVariacao >= 0 ? (
                  <ArrowTrendingUpIcon className={`h-5 w-5 ${dadosFluxoCaixa.resumoGeral.percentualVariacao >= 0 ? 'text-success' : 'text-error'}`} />
                ) : (
                  <ArrowTrendingDownIcon className={`h-5 w-5 ${dadosFluxoCaixa.resumoGeral.percentualVariacao >= 0 ? 'text-success' : 'text-error'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Variação do Saldo</p>
                  <InfoTooltip
                    title="Variação do Saldo"
                    description="Percentual de variação do saldo acumulado em relação ao mês anterior. Indica se o saldo está crescendo ou diminuindo."
                    calculation="Variação do Saldo = ((Saldo Atual - Saldo do Mês Anterior) / |Saldo do Mês Anterior|) × 100. Valores positivos indicam crescimento, negativos indicam declínio."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  {dadosFluxoCaixa.resumoGeral.percentualVariacao >= 0 ? '+' : ''}{dadosFluxoCaixa.resumoGeral.percentualVariacao.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fluxo Mensal */}
      <TabbedChart
        title="Fluxo de Caixa Mensal"
        subtitle="Evolução das receitas, despesas e saldo ao longo do tempo"
        titleTooltip={{
          title: "Fluxo de Caixa Mensal",
          description: "Evolução temporal das receitas, despesas, saldo mensal e saldo acumulado ao longo do período selecionado.",
          calculation: "Receitas = Pagamentos com status 'Pago' no mês. Despesas = Custos cadastrados no mês. Saldo = Receitas - Despesas. Saldo Acumulado = Soma dos saldos mensais até o mês atual."
        }}
        tabs={[
          {
            id: 'grafico',
            label: '📊 Gráfico',
            content: (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={fluxoMensalChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 50 }}
                  >
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
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      width={60}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      width={60}
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
                                    {typeof entry.value === 'number' 
                                      ? `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                      : entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="receitas" 
                      fill="#21b6bf" 
                      name="Receitas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="despesas" 
                      fill="#d97757" 
                      name="Despesas"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="saldoAcumulado" 
                      stroke="#1a9ba3" 
                      strokeWidth={3}
                      name="Saldo Acumulado"
                      dot={{ fill: '#1a9ba3', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Mês</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Receitas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Despesas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Saldo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {dadosFluxoCaixa.fluxoMensal.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{item.mes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-accent">
                          R$ {item.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#d97757]">
                          R$ {item.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          item.saldo >= 0 ? 'text-accent' : 'text-[#d97757]'
                        }`}>
                          R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          item.saldoAcumulado >= 0 ? 'text-accent' : 'text-[#d97757]'
                        }`}>
                          R$ {item.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        ]}
        defaultTab="grafico"
      />

      {/* Análise de Receitas e Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Receitas por Forma de Pagamento</CardTitle>
              <InfoTooltip
                title="Receitas por Forma de Pagamento"
                description="Distribuição visual das receitas agrupadas por forma de pagamento (PIX, Cartão, Boleto, etc.) no período selecionado."
                calculation="Cada pagamento é contabilizado de acordo com sua formaPagamento. O gráfico mostra o valor total e percentual de cada forma de pagamento."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <CardDescription>
              Distribuição das receitas por método de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart 
              data={receitasPorFormaData}
              config={{ 
                showLegend: true, 
                showValues: true, 
                showPercentages: true 
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Despesas por Categoria</CardTitle>
              <InfoTooltip
                title="Despesas por Categoria"
                description="Distribuição visual das despesas agrupadas por categoria de custo (Insumos, Transporte, Equipamento, etc.) no período selecionado."
                calculation="Cada custo é contabilizado de acordo com seu tipoCusto. O valor total considera (valor × quantidade) de cada custo. O gráfico mostra o valor total e percentual de cada categoria."
                className="flex-shrink-0"
                iconClassName="h-6 w-6"
              />
            </div>
            <CardDescription>
              Distribuição dos custos por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart 
              data={despesasPorCategoriaData}
              config={{ 
                showLegend: true, 
                showValues: true, 
                showPercentages: true 
              }}
            />
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
