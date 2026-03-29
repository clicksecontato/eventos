'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  valorTotalCobrado: number;
  totalCustos: number;
  totalServicosCalculado: number;
  modoValorTotal: string;
  temDivergencia: boolean;
  divergenciaTotal: number;
};

export function EventoResumoFinanceiroSection({
  valorTotalCobrado,
  totalCustos,
  totalServicosCalculado,
  modoValorTotal,
  temDivergencia,
  divergenciaTotal,
}: Props) {
  const lucro = valorTotalCobrado - totalCustos;

  return (
    <div className="pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
          <CardDescription>Visão geral dos valores do evento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-surface/50 p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                R$ {valorTotalCobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-text-secondary">Valor Total Cobrado</div>
            </div>
            <div className="rounded-lg bg-surface/50 p-4 text-center">
              <div className="text-2xl font-bold text-error">
                R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-text-secondary">Total de Custos</div>
            </div>
            <div className="rounded-lg bg-surface/50 p-4 text-center">
              <div className={`text-2xl font-bold ${lucro >= 0 ? 'text-success' : 'text-error'}`}>
                R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-text-secondary">Estimativa de Lucro</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-3 text-sm">
              <div className="text-text-secondary">Modo do valor total</div>
              <div className="font-semibold capitalize text-text-primary">{modoValorTotal}</div>
              <div className="mt-1 text-text-secondary">
                Total calculado pelos serviços:{' '}
                <strong>R$ {totalServicosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
            {temDivergencia && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  modoValorTotal === 'manual'
                    ? 'border-warning bg-warning-bg/30 text-warning-text'
                    : 'border-error bg-error-bg/30 text-error-text'
                }`}
              >
                <div className="font-semibold">
                  {modoValorTotal === 'manual'
                    ? 'Diferença intencional (modo manual)'
                    : 'Atenção: divergência no modo automático'}
                </div>
                <div>
                  Diferença entre cobrado e calculado:{' '}
                  <strong>R$ {divergenciaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
