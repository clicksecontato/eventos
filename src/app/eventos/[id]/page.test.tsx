import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventoViewPage from './page';
import {
  useContratosPorEvento,
  useCustosPorEvento,
  useEvento,
  usePagamentosPorEvento,
  useServicosPorEvento
} from '@/hooks/useData';
import { useAnexos } from '@/hooks/useAnexos';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';

const pushMock = vi.fn();
const showToastMock = vi.fn();
const refetchEventoMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ev-1' }),
  useRouter: () => ({ push: pushMock })
}));

vi.mock('@/hooks/useData', () => ({
  useEvento: vi.fn(),
  usePagamentosPorEvento: vi.fn(),
  useCustosPorEvento: vi.fn(),
  useServicosPorEvento: vi.fn(),
  useContratosPorEvento: vi.fn()
}));

vi.mock('@/hooks/useAnexos', () => ({
  useAnexos: vi.fn()
}));

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    deleteEvento: vi.fn(),
    updateEvento: vi.fn()
  }
}));

vi.mock('@/lib/hooks/usePlano', () => ({
  usePlano: () => ({
    temPermissao: vi.fn().mockResolvedValue(true),
    statusPlano: { plano: { nome: 'Premium' } }
  })
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/LoadingHotmart', () => ({
  default: () => <div>LoadingHotmart</div>
}));

vi.mock('@/components/PagamentoHistorico', () => ({ default: () => <div>PagamentoHistorico</div> }));
vi.mock('@/components/CustosEvento', () => ({ default: () => <div>CustosEvento</div> }));
vi.mock('@/components/ServicosEvento', () => ({ default: () => <div>ServicosEvento</div> }));
vi.mock('@/components/AnexosEvento', () => ({ default: () => <div>AnexosEvento</div> }));

vi.mock('@/components/EventoStatusSelect', () => ({
  default: ({
    eventoId,
    onStatusChange
  }: {
    eventoId: string;
    onStatusChange: (eventoId: string, status: string) => Promise<void>;
  }) => (
    <button onClick={() => onStatusChange(eventoId, 'Confirmado')}>
      Alterar status detalhe {eventoId}
    </button>
  )
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  default: ({
    open,
    onConfirm,
    confirmText,
    onOpenChange
  }: {
    open: boolean;
    onConfirm: () => void;
    confirmText?: string;
    onOpenChange?: (value: boolean) => void;
  }) =>
    open ? (
      <button
        onClick={() => {
          onConfirm();
          onOpenChange?.(false);
        }}
      >
        {confirmText || 'Confirmar'}
      </button>
    ) : null
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />
}));

describe('/eventos/[id] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'user-1' } as never);

    vi.mocked(useEvento).mockReturnValue({
      data: {
        id: 'ev-1',
        nomeEvento: 'Evento Detalhe',
        cliente: { nome: 'Cliente Detalhe', email: 'cliente@teste.com' },
        contratante: 'Contratante',
        dataEvento: new Date('2026-03-10'),
        dataCadastro: new Date('2026-02-01'),
        local: 'Salão A',
        endereco: 'Rua 1',
        numeroConvidados: 100,
        tipoEvento: 'Casamento',
        status: 'Agendado',
        valorTotal: 1000
      },
      loading: false,
      error: null,
      refetch: refetchEventoMock
    } as never);
    vi.mocked(usePagamentosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useCustosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useServicosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useContratosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useAnexos).mockReturnValue({ anexos: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(dataService.deleteEvento).mockResolvedValue(undefined as never);
    vi.mocked(dataService.updateEvento).mockResolvedValue(undefined as never);
  });

  it('renderiza detalhes do evento', async () => {
    render(<EventoViewPage />);
    await waitFor(() => {
      expect(screen.getByText('Evento Detalhe')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Cliente Detalhe').length).toBeGreaterThan(0);
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
  });

  it('arquiva evento com confirmação', async () => {
    const user = userEvent.setup();
    render(<EventoViewPage />);

    await waitFor(() => {
      expect(screen.getByText('Evento Detalhe')).toBeInTheDocument();
    });

    const arquivarLabel = screen.getByText('Arquivar evento');
    const botaoArquivar = arquivarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoArquivar);
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    await waitFor(() => {
      expect(dataService.deleteEvento).toHaveBeenCalledWith('ev-1', 'user-1');
    });
    expect(showToastMock).toHaveBeenCalledWith('Evento arquivado com sucesso!', 'success');
    expect(pushMock).toHaveBeenCalledWith('/eventos');
  });

  it('atualiza status do evento', async () => {
    const user = userEvent.setup();
    render(<EventoViewPage />);

    await waitFor(() => {
      expect(screen.getByText('Evento Detalhe')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Alterar status detalhe ev-1' }));

    await waitFor(() => {
      expect(dataService.updateEvento).toHaveBeenCalledWith(
        'ev-1',
        { status: 'Confirmado' },
        'user-1'
      );
    });
  });
});
