import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventoResumoFinanceiroSection } from './EventoResumoFinanceiroSection';

describe('EventoResumoFinanceiroSection', () => {
  it('exibe totais e modo sem bloco de divergência quando temDivergência é false', () => {
    render(
      <EventoResumoFinanceiroSection
        valorTotalCobrado={1000}
        totalCustos={250}
        totalServicosCalculado={1000}
        modoValorTotal="automatico"
        temDivergencia={false}
        divergenciaTotal={0}
      />
    );
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Valor Total Cobrado')).toBeInTheDocument();
    expect(screen.getByText('Total de Custos')).toBeInTheDocument();
    expect(screen.getByText('Estimativa de Lucro')).toBeInTheDocument();
    expect(screen.getByText('automatico')).toBeInTheDocument();
    expect(screen.queryByText(/Atenção: divergência no modo automático/i)).not.toBeInTheDocument();
  });

  it('mostra alerta quando temDivergência no modo automático', () => {
    render(
      <EventoResumoFinanceiroSection
        valorTotalCobrado={2000}
        totalCustos={0}
        totalServicosCalculado={1500}
        modoValorTotal="automatico"
        temDivergencia={true}
        divergenciaTotal={500}
      />
    );
    expect(screen.getByText(/Atenção: divergência no modo automático/i)).toBeInTheDocument();
  });

  it('mensagem de divergência diferente no modo manual', () => {
    render(
      <EventoResumoFinanceiroSection
        valorTotalCobrado={100}
        totalCustos={0}
        totalServicosCalculado={50}
        modoValorTotal="manual"
        temDivergencia={true}
        divergenciaTotal={50}
      />
    );
    expect(screen.getByText(/Diferença intencional \(modo manual\)/i)).toBeInTheDocument();
  });
});
