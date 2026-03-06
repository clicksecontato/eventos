import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RelatoriosPage from './page';
import { getJson } from '@/lib/api/client';

const refreshMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

vi.mock('@/lib/api/client', () => ({
  getJson: vi.fn()
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

vi.mock('@/hooks/useData', () => ({
  useAllEventos: () => ({ data: [{ id: 'ev-1' }], loading: false }),
  useDashboardData: () => ({ data: { resumoFinanceiro: { valorPendente: 10, valorAtrasado: 5 } }, loading: false }),
  useAllPagamentos: () => ({ data: [], loading: false }),
  useAllServicos: () => ({ data: [], loading: false }),
  useTiposServicos: () => ({ data: [], loading: false }),
  useAllClientes: () => ({ data: [], loading: false }),
  useCanaisEntrada: () => ({ data: [], loading: false }),
  useAllCustos: () => ({ data: [], loading: false })
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/PlanOverlay', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/PlanoBloqueio', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/relatorios/PerformanceEventosReport', () => ({ default: () => <div>PerformanceEventosReport</div> }));
vi.mock('@/components/relatorios/FluxoCaixaReport', () => ({ default: () => <div>FluxoCaixaReport</div> }));
vi.mock('@/components/relatorios/ServicosReport', () => ({ default: () => <div>ServicosReport</div> }));
vi.mock('@/components/relatorios/CanaisEntradaReport', () => ({ default: () => <div>CanaisEntradaReport</div> }));
vi.mock('@/components/relatorios/ImpressoesReport', () => ({ default: () => <div>ImpressoesReport</div> }));
vi.mock('@/components/relatorios/ReceitaMensalReport', () => ({ default: () => <div>ReceitaMensalReport</div> }));
vi.mock('@/components/relatorios/DetalhamentoReceberReport', () => ({ default: () => <div>DetalhamentoReceberReport</div> }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>
}));

describe('/relatorios page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getJson)
      .mockResolvedValueOnce({ dateKey: '20260306', ultimaAtualizacao: '2026-03-06T10:00:00.000Z' } as never)
      .mockResolvedValueOnce({ atualizadoEm: '2026-03-06T11:00:00.000Z' } as never);
  });

  it('renderiza página e dispara atualização de relatórios', async () => {
    const user = userEvent.setup();
    render(<RelatoriosPage />);

    await waitFor(() => {
      expect(screen.getByText('Relatórios')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Atualizar relatórios/i }));

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/api/relatorios/atualizar', { method: 'POST' });
    });
    expect(showToastMock).toHaveBeenCalledWith('Relatórios atualizados com sucesso!', 'success');
  });
});
