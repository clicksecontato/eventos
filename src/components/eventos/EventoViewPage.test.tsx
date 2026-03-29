/**
 * Testes de integração da página completa (muitos mocks).
 * Comportamento por módulo: ver `*.test.ts` / `*Section.test.tsx` na mesma pasta.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventoViewPage from './EventoViewPage';
import {
  useContratosPorEvento,
  useCustosPorEvento,
  useEvento,
  usePagamentosPorEvento,
  useServicosPorEvento,
} from '@/hooks/useData';
import { useAnexos } from '@/hooks/useAnexos';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';

const pushMock = vi.fn();
const showToastMock = vi.fn();
const refetchEventoMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ev-1' }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/hooks/useData', () => ({
  useEvento: vi.fn(),
  usePagamentosPorEvento: vi.fn(),
  useCustosPorEvento: vi.fn(),
  useServicosPorEvento: vi.fn(),
  useContratosPorEvento: vi.fn(),
}));

vi.mock('@/hooks/useAnexos', () => ({
  useAnexos: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    deleteEvento: vi.fn(),
    updateEvento: vi.fn(),
    getAgendamentoAlocacoesPorEvento: vi.fn(),
    getAgendamentoProfissionaisAtivos: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/usePlano', () => ({
  usePlano: () => ({
    temPermissao: vi.fn().mockResolvedValue(true),
    statusPlano: { plano: { nome: 'Premium' } },
  }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/LoadingHotmart', () => ({
  default: () => React.createElement('div', null, 'LoadingHotmart'),
}));

vi.mock('@/components/PagamentoHistorico', () => ({
  default: () => React.createElement('div', null, 'PagamentoHistorico'),
}));
vi.mock('@/components/CustosEvento', () => ({
  default: () => React.createElement('div', null, 'CustosEvento'),
}));
vi.mock('@/components/ServicosEvento', () => ({
  default: () => React.createElement('div', null, 'ServicosEvento'),
}));
vi.mock('@/components/AnexosEvento', () => ({
  default: () => React.createElement('div', null, 'AnexosEvento'),
}));

vi.mock('@/components/contratos/ContratoSignatariosLinksLista', () => ({
  ContratoSignatariosLinksLista: () => null,
}));

vi.mock('@/components/contratos/GerarLinkAssinaturaClienteDialog', () => ({
  GerarLinkAssinaturaClienteDialog: () => null,
}));

vi.mock('@/components/contratos/LinkGeradoSucessoDialog', () => ({
  LinkGeradoSucessoDialog: () => null,
}));

vi.mock('@/components/EventoStatusSelect', () => ({
  default: ({
    eventoId,
    onStatusChange,
  }: {
    eventoId: string;
    onStatusChange: (eventoId: string, status: string) => Promise<void>;
  }) =>
    React.createElement(
      'button',
      { onClick: () => void onStatusChange(eventoId, 'Confirmado') },
      'Alterar status detalhe ',
      eventoId
    ),
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  default: ({
    open,
    onConfirm,
    confirmText,
    onOpenChange,
  }: {
    open: boolean;
    onConfirm: () => void;
    confirmText?: string;
    onOpenChange?: (value: boolean) => void;
  }) =>
    open
      ? React.createElement(
          'button',
          {
            onClick: () => {
              onConfirm();
              onOpenChange?.(false);
            },
          },
          confirmText || 'Confirmar'
        )
      : null,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  CardDescription: ({ children }: { children: React.ReactNode }) => React.createElement('p', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    React.createElement('button', props, children),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}));

describe('EventoViewPage', () => {
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
        valorTotal: 1000,
      },
      loading: false,
      error: null,
      refetch: refetchEventoMock,
    } as never);
    vi.mocked(usePagamentosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useCustosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useServicosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useContratosPorEvento).mockReturnValue({ data: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(useAnexos).mockReturnValue({ anexos: [], loading: false, refetch: vi.fn() } as never);
    vi.mocked(dataService.deleteEvento).mockResolvedValue(undefined as never);
    vi.mocked(dataService.updateEvento).mockResolvedValue(undefined as never);
    vi.mocked(dataService.getAgendamentoAlocacoesPorEvento).mockResolvedValue([
      {
        id: 'aloc-1',
        profissionalId: 'prof-1',
        status: 'agendado',
        inicioTs: new Date('2026-03-10T10:00:00'),
        fimTs: new Date('2026-03-10T18:00:00'),
      },
    ] as never);
    vi.mocked(dataService.getAgendamentoProfissionaisAtivos).mockResolvedValue([
      { id: 'prof-1', nome: 'Dra. Clarice' },
    ] as never);
  });

  it('renderiza detalhes do evento', async () => {
    render(React.createElement(EventoViewPage));
    await waitFor(() => {
      expect(screen.getByText('Evento Detalhe')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Cliente Detalhe').length).toBeGreaterThan(0);
    expect(screen.getByText('Resumo Financeiro')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Dra\. Clarice/i)).toBeInTheDocument();
    });
  });

  it('arquiva evento com confirmação', async () => {
    const user = userEvent.setup();
    render(React.createElement(EventoViewPage));

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
    render(React.createElement(EventoViewPage));

    await waitFor(() => {
      expect(screen.getByText('Evento Detalhe')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Alterar status detalhe ev-1/ }));

    await waitFor(() => {
      expect(dataService.updateEvento).toHaveBeenCalledWith('ev-1', { status: 'Confirmado' }, 'user-1');
    });
  });
});
