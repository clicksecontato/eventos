'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Evento, Pagamento } from '@/types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface ReceitaMensalReportProps {
  eventos: Evento[];
  pagamentos: Pagamento[];
}

export default function ReceitaMensalReport({ eventos, pagamentos }: ReceitaMensalReportProps) {
  const [dataInicio, setDataInicio] = useState(
    format(startOfMonth(subMonths(new Date(), 23)), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  const dadosReceitaMensal = useMemo(() => {
    if (!pagamentos || pagamentos.length === 0) {
      return {
        receitaPorMes: [],
        resumoGeral: {
          receitaTotal: 0,
          receitaMedia: 0,
          maiorValor: 0,
          menorValor: 0,
          mesesComReceita: 0,
          totalMeses: 0
        }
      };
    }

    const inicio = parseISO(dataInicio);
    const fim = parseISO(dataFim);
    
    // Validar que o período não exceda 24 meses
    const diferencaMeses = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (diferencaMeses > 24) {
      // Ajustar dataFim para não exceder 24 meses
      const novaDataFim = endOfMonth(subMonths(inicio, -24));
      setDataFim(format(novaDataFim, 'yyyy-MM-dd'));
      // Retornar estrutura vazia válida temporariamente até o próximo render
      return {
        receitaPorMes: [],
        resumoGeral: {
          receitaTotal: 0,
          receitaMedia: 0,
          maiorValor: 0,
          menorValor: 0,
          mesesComReceita: 0,
          totalMeses: 0
        }
      };
    }

    // Obter todos os meses no intervalo
    const meses = eachMonthOfInterval({ start: startOfMonth(inicio), end: endOfMonth(fim) });

    // Calcular receita por mês (usando a mesma lógica do dashboard)
    const receitaPorMes = meses.map(mes => {
      const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
      const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Filtrar pagamentos do mês (mesma lógica do data-service)
      const pagamentosDoMes = pagamentos.filter(pagamento => {
        if (!pagamento.dataPagamento) {
          return false;
        }
        const dataPagamento = new Date(pagamento.dataPagamento);
        return dataPagamento >= inicioMes && dataPagamento <= fimMes && pagamento.status === 'Pago';
      });
      
      const receitaMes = pagamentosDoMes.reduce((total, p) => total + p.valor, 0);

      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        mesCompleto: format(mes, 'MMMM yyyy', { locale: ptBR }),
        valor: receitaMes,
        data: mes
      };
    });

    const receitaTotal = receitaPorMes.reduce((total, item) => total + item.valor, 0);
    const valores = receitaPorMes.map(r => r.valor);
    const valoresPositivos = valores.filter(v => v > 0);
    const maiorValor = valores.length > 0 ? Math.max(...valores) : 0;
    const menorValor = valoresPositivos.length > 0 ? Math.min(...valoresPositivos) : 0;
    const receitaMedia = receitaPorMes.length > 0 ? receitaTotal / receitaPorMes.length : 0;
    const mesesComReceita = valoresPositivos.length;

    return {
      receitaPorMes,
      resumoGeral: {
        receitaTotal,
        receitaMedia,
        maiorValor,
        menorValor,
        mesesComReceita,
        totalMeses: receitaPorMes.length
      }
    };
  }, [dataInicio, dataFim, pagamentos]);

  const exportarCSV = () => {
    if (!dadosReceitaMensal || !dadosReceitaMensal.resumoGeral) {
      return;
    }

    const resumoGeral = dadosReceitaMensal.resumoGeral;
    const receitaPorMes = dadosReceitaMensal.receitaPorMes || [];

    const csvData = [
      ['Relatório de Receita Mensal'],
      [`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['RESUMO GERAL'],
      ['Receita Total', `R$ ${(resumoGeral.receitaTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Receita Média Mensal', `R$ ${(resumoGeral.receitaMedia || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Maior Receita Mensal', `R$ ${(resumoGeral.maiorValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Menor Receita Mensal', `R$ ${(resumoGeral.menorValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Meses com Receita', resumoGeral.mesesComReceita || 0],
      ['Total de Meses Analisados', resumoGeral.totalMeses || 0],
      [''],
      ['RECEITA POR MÊS'],
      ['Mês', 'Valor (R$)', 'Percentual (%)'],
      ...receitaPorMes.map(item => [
        item.mesCompleto,
        item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        (resumoGeral.receitaTotal || 0) > 0 
          ? ((item.valor / (resumoGeral.receitaTotal || 1)) * 100).toFixed(2)
          : '0.00'
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `receita-mensal-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDataInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaDataInicio = parseISO(e.target.value);
    const dataFimAtual = parseISO(dataFim);
    const mesesDiferenca = Math.ceil((dataFimAtual.getTime() - novaDataInicio.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (mesesDiferenca > 24) {
      const novaDataFim = endOfMonth(subMonths(novaDataInicio, -24));
      setDataFim(format(novaDataFim, 'yyyy-MM-dd'));
    }
    
    setDataInicio(e.target.value);
  };

  const handleDataFimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaDataFim = parseISO(e.target.value);
    const dataInicioAtual = parseISO(dataInicio);
    const mesesDiferenca = Math.ceil((novaDataFim.getTime() - dataInicioAtual.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (mesesDiferenca > 24) {
      const novaDataInicio = startOfMonth(subMonths(novaDataFim, 24));
      setDataInicio(format(novaDataInicio, 'yyyy-MM-dd'));
    }
    
    setDataFim(e.target.value);
  };

  return (
    <div className="space-y-6">
      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
          <CardDescription>
            Selecione o período para análise (máximo 24 meses)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Input
                label="Data Início"
                type="date"
                value={dataInicio}
                onChange={handleDataInicioChange}
              />
            </div>
            <div>
              <Input
                label="Data Fim"
                type="date"
                value={dataFim}
                onChange={handleDataFimChange}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={exportarCSV} className="w-full">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                    description="Soma de todos os pagamentos recebidos (com status 'Pago') no período selecionado. Representa a receita efetivamente recebida pela empresa."
                    calculation="Receita Total = Soma de todos os pagamentos com status 'Pago' e dataPagamento dentro do período selecionado. Considera apenas pagamentos liquidados."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {(dadosReceitaMensal?.resumoGeral?.receitaTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0 rounded-md p-2 bg-primary/10">
                <span className="text-primary text-lg">📊</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Média Mensal</p>
                  <InfoTooltip
                    title="Média Mensal"
                    description="Valor médio de receita por mês no período selecionado. Útil para entender a receita média esperada e fazer projeções."
                    calculation="Média Mensal = Receita Total / Total de Meses no Período. Inclui todos os meses do período, mesmo aqueles sem receita (considerados como zero)."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {(dadosReceitaMensal?.resumoGeral?.receitaMedia || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0 rounded-md p-2 bg-accent/10">
                <span className="text-accent text-lg">📈</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Maior Receita</p>
                  <InfoTooltip
                    title="Maior Receita"
                    description="O maior valor de receita mensal registrado no período selecionado. Identifica o melhor mês em termos de receita."
                    calculation="Maior Receita = Máximo valor entre todos os meses do período. Considera todos os meses, incluindo aqueles com receita zero."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {(dadosReceitaMensal?.resumoGeral?.maiorValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0 rounded-md p-2 bg-warning-bg">
                <span className="text-warning text-lg">📉</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Menor Receita</p>
                  <InfoTooltip
                    title="Menor Receita"
                    description="O menor valor de receita mensal registrado no período selecionado (considerando apenas meses com receita maior que zero). Identifica o pior mês em termos de receita."
                    calculation="Menor Receita = Mínimo valor entre todos os meses com receita maior que zero. Meses sem receita (zero) são excluídos do cálculo."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
                >
                  R$ {(dadosReceitaMensal?.resumoGeral?.menorValor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0 rounded-md p-2 bg-primary/10">
                <span className="text-primary text-lg">📅</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-end text-right">
                <div className="flex items-center gap-1 justify-end mb-1">
                  <p className="text-xs font-medium text-text-secondary leading-tight">Meses c/ Receita</p>
                  <InfoTooltip
                    title="Meses com Receita"
                    description="Quantidade de meses que tiveram receita registrada versus o total de meses no período. Indica a frequência de recebimentos."
                    calculation="Meses com Receita = Quantidade de meses com receita maior que zero. Total de Meses = Todos os meses do período selecionado (incluindo meses sem receita)."
                    className="flex-shrink-0"
                    iconClassName="h-6 w-6"
                  />
                </div>
                <p 
                  className="font-bold text-text-primary leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)' }}
                >
                  {dadosReceitaMensal?.resumoGeral?.mesesComReceita || 0} / {dadosReceitaMensal?.resumoGeral?.totalMeses || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receita Mensal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Receita Mensal</CardTitle>
            <InfoTooltip
              title="Receita Mensal"
              description="Evolução temporal da receita mês a mês no período selecionado. Mostra a receita de cada mês e sua proporção em relação ao total."
              calculation="Receita Mensal = Soma de todos os pagamentos com status 'Pago' e dataPagamento dentro do mês. Percentual = (Receita do Mês / Receita Total) × 100."
              className="flex-shrink-0"
              iconClassName="h-6 w-6"
            />
          </div>
          <CardDescription>
            Evolução da receita ao longo do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!dadosReceitaMensal || dadosReceitaMensal.receitaPorMes.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                Nenhum dado disponível para o período selecionado
              </p>
            ) : (
              dadosReceitaMensal.receitaPorMes.map((item, index) => {
                const receitaTotal = dadosReceitaMensal.resumoGeral?.receitaTotal || 0;
                const maiorValor = dadosReceitaMensal.resumoGeral?.maiorValor || 0;
                const percentual = receitaTotal > 0
                  ? (item.valor / receitaTotal) * 100
                  : 0;
                const larguraBarra = maiorValor > 0
                  ? (item.valor / maiorValor) * 100
                  : 0;

                return (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary w-32">
                      {item.mes}
                    </span>
                    <div className="flex items-center flex-1 mx-4">
                      <div className="w-full bg-surface rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${larguraBarra}%`
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-text-primary w-32 text-right">
                      R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-text-secondary w-16 text-right">
                      {percentual.toFixed(1)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

