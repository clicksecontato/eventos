import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './page';
import { useDashboardData } from '@/hooks/useData';
import { usePlano } from '@/lib/hooks/usePlano';

const pushMock = vi.fn();
const refetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: vi.fn(() => null) })
}));

vi.mock('@/hooks/useData', () => ({
  useDashboardData: vi.fn()
}));

vi.mock('@/lib/hooks/usePlano', () => ({
  usePlano: vi.fn()
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/ui/info-tooltip', () => ({
  InfoTooltip: () => <span>info</span>
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>
}));

describe('/dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlano).mockReturnValue({
      statusPlano: { ativo: true },
      loading: false
    } as never);
    vi.mocked(useDashboardData).mockReturnValue({
      data: {
        resumoFinanceiro: {
          receitaTotal: 1000,
          valorPendente: 200,
          valorAtrasado: 50,
          totalEventos: 12,
          eventosConcluidos: 5
        },
        receitaMes: 500,
        eventosHoje: 1,
        eventosHojeLista: [{ id: 'ev-1', clienteNome: 'Cliente 1', local: 'Salão', chegadaNoLocal: '18:00', tipoEvento: 'Casamento' }],
        eventosComValoresAtrasados: 1,
        eventosProximos: [],
        lastUpdatedAt: new Date('2026-03-06T12:00:00.000Z')
      },
      loading: false,
      error: null,
      refetch: refetchMock
    } as never);
  });

  it('renderiza dashboard e atualiza dados no botão', async () => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('Cliente 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Atualizar relatórios/i }));
    expect(refetchMock).toHaveBeenCalled();
  });
});
