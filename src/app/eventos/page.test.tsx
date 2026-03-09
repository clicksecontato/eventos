import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventosPage from './page';
import {
  useEventos,
  useEventosArquivados,
  usePreCadastros,
  useServicosPorEventos,
  useTiposEvento
} from '@/hooks/useData';
import { dataService } from '@/lib/data-service';
import { useCurrentUser } from '@/hooks/useAuth';

const pushMock = vi.fn();
const refetchAtivosMock = vi.fn();
const refetchArquivadosMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}));

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/hooks/useData', () => ({
  useEventos: vi.fn(),
  useEventosArquivados: vi.fn(),
  useTiposEvento: vi.fn(),
  useServicosPorEventos: vi.fn(),
  usePreCadastros: vi.fn()
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    deleteEvento: vi.fn(),
    desarquivarEvento: vi.fn(),
    updateEvento: vi.fn()
  }
}));

vi.mock('@/lib/hooks/usePlano', () => ({
  usePlano: () => ({ limites: null })
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/PlanOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/LimiteUsoCompacto', () => ({
  default: () => <div />
}));

vi.mock('@/components/PreCadastrosSection', () => ({
  default: () => <div>PreCadastrosSection</div>
}));

vi.mock('@/components/ServicosBadges', () => ({
  default: () => <div>ServicosBadges</div>
}));

vi.mock('@/components/filters/DateRangeFilter', () => ({
  default: () => <div>DateRangeFilter</div>,
  isDateInFilter: () => true
}));

vi.mock('@/components/EventoStatusSelect', () => ({
  default: ({
    eventoId,
    onStatusChange
  }: {
    eventoId: string;
    onStatusChange: (eventoId: string, novoStatus: string) => Promise<void>;
  }) => (
    <button onClick={() => onStatusChange(eventoId, 'Confirmado')}>
      Alterar status {eventoId}
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
  Card: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
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
  Input: ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    label,
    value,
    onValueChange,
    options
  }: {
    label?: string;
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <label>
      {label}
      <select value={value} onChange={(e) => onValueChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}));

describe('/eventos page', () => {
  const eventosAtivos = [
    {
      id: 'ev-1',
      nomeEvento: 'Casamento Silva',
      cliente: { nome: 'João Silva' },
      contratante: 'João Silva',
      dataEvento: new Date('2026-03-01'),
      diaSemana: 'Domingo',
      local: 'Salão Central',
      status: 'Agendado',
      tipoEvento: 'Casamento',
      tipoEventoId: 'tipo-1',
      horarioInicio: '18:00'
    }
  ];

  const eventosArquivados = [
    {
      id: 'ev-2',
      nomeEvento: 'Aniversário Ana',
      cliente: { nome: 'Ana Souza' },
      contratante: 'Ana Souza',
      dataEvento: new Date('2026-02-20'),
      diaSemana: 'Sexta',
      local: 'Espaço Azul',
      status: 'Concluído',
      tipoEvento: 'Aniversário',
      tipoEventoId: 'tipo-2'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'user-1' } as never);
    vi.mocked(useEventos).mockReturnValue({
      data: eventosAtivos,
      loading: false,
      error: null,
      refetch: refetchAtivosMock
    } as never);
    vi.mocked(useEventosArquivados).mockReturnValue({
      data: eventosArquivados,
      loading: false,
      error: null,
      refetch: refetchArquivadosMock
    } as never);
    vi.mocked(useTiposEvento).mockReturnValue({
      data: [
        { id: 'tipo-1', nome: 'Casamento', ativo: true },
        { id: 'tipo-2', nome: 'Aniversário', ativo: true }
      ]
    } as never);
    vi.mocked(usePreCadastros).mockReturnValue({ data: [] } as never);
    vi.mocked(useServicosPorEventos).mockReturnValue({
      servicosPorEvento: new Map(),
      loading: false,
      error: null
    } as never);
    vi.mocked(dataService.deleteEvento).mockResolvedValue(undefined as never);
    vi.mocked(dataService.desarquivarEvento).mockResolvedValue(undefined as never);
    vi.mocked(dataService.updateEvento).mockResolvedValue(undefined as never);
  });

  it('renderiza lista de eventos ativos', async () => {
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });
    expect(screen.getByText('Eventos')).toBeInTheDocument();
    expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0);
  });

  it('filtra eventos por busca textual', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Nome do evento ou cliente...'), 'inexistente');

    await waitFor(() => {
      expect(screen.queryByText('Casamento Silva')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Nenhum evento encontrado')).toBeInTheDocument();
  });

  it('arquiva evento ativo e recarrega listas', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });

    const arquivarLabel = screen.getByText('Arquivar evento');
    const botaoArquivar = arquivarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoArquivar);
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    await waitFor(() => {
      expect(dataService.deleteEvento).toHaveBeenCalledWith('ev-1', 'user-1');
    });
    expect(refetchAtivosMock).toHaveBeenCalled();
    expect(refetchArquivadosMock).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith('Evento arquivado com sucesso!', 'success');
  });

  it('desarquiva evento na aba de arquivados', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await user.click(screen.getByRole('button', { name: /Arquivados \(1\)/i }));

    await waitFor(() => {
      expect(screen.getByText('Aniversário Ana')).toBeInTheDocument();
    });

    const desarquivarLabel = screen.getByText('Desarquivar evento');
    const botaoDesarquivar = desarquivarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoDesarquivar);

    await waitFor(() => {
      expect(dataService.desarquivarEvento).toHaveBeenCalledWith('ev-2', 'user-1');
    });
    expect(showToastMock).toHaveBeenCalledWith('Evento desarquivado com sucesso!', 'success');
  });

  it('altera status do evento via seletor de status', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Alterar status ev-1' }));

    await waitFor(() => {
      expect(dataService.updateEvento).toHaveBeenCalledWith(
        'ev-1',
        { status: 'Confirmado' },
        'user-1'
      );
    });
    expect(showToastMock).toHaveBeenCalledWith('Status atualizado com sucesso!', 'success');
  });
});
