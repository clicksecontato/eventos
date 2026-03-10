import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventosPage from './page';
import {
  useAgendamentoAlocacoesPorEventos,
  useAgendamentoProfissionais,
  useEventos,
  useEventosArquivados,
  usePreCadastros,
  useServicosPorEventos,
  useTiposEvento
} from '@/hooks/useData';
import { dataService } from '@/lib/data-service';
import { useCurrentUser } from '@/hooks/useAuth';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refetchAtivosMock = vi.fn();
const refetchArquivadosMock = vi.fn();
const showToastMock = vi.fn();
const searchParamsMock = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock
}));

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/hooks/useData', () => ({
  useEventos: vi.fn(),
  useEventosArquivados: vi.fn(),
  useTiposEvento: vi.fn(),
  useServicosPorEventos: vi.fn(),
  useAgendamentoAlocacoesPorEventos: vi.fn(),
  useAgendamentoProfissionais: vi.fn(),
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
  default: ({ onFilterChange }: { onFilterChange: (filter: any) => void }) => (
    <div>
      <button
        onClick={() =>
          onFilterChange({
            type: 'custom',
            range: {
              startDate: new Date('2026-03-01T12:00:00'),
              endDate: new Date('2026-03-31T12:00:00')
            }
          })
        }
      >
        Aplicar período de teste
      </button>
      <button
        onClick={() =>
          onFilterChange({
            type: 'quick',
            quickFilter: 'thisWeek',
            range: {
              startDate: new Date('2026-03-01T12:00:00'),
              endDate: new Date('2026-03-07T12:00:00')
            }
          })
        }
      >
        Aplicar rápido de teste
      </button>
      <button onClick={() => onFilterChange(null)}>Limpar período de teste</button>
    </div>
  ),
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
    searchParamsMock.forEach((_, key) => searchParamsMock.delete(key));
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
    vi.mocked(useAgendamentoProfissionais).mockReturnValue({
      data: [{ id: 'prof-1', nome: 'Dra. Clarice' }],
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(useAgendamentoAlocacoesPorEventos).mockReturnValue({
      alocacoesPorEvento: new Map([
        ['ev-1', [{ id: 'aloc-1', profissionalId: 'prof-1', status: 'agendado' }]]
      ]),
      loading: false,
      error: null,
      refetch: vi.fn()
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
    expect(screen.getAllByText('Dra. Clarice').length).toBeGreaterThan(0);
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

  it('filtra eventos por profissional de agendamento', async () => {
    const user = userEvent.setup();
    vi.mocked(useEventos).mockReturnValue({
      data: [
        ...eventosAtivos,
        {
          id: 'ev-3',
          nomeEvento: 'Evento Sem Profissional',
          cliente: { nome: 'Cliente Sem Profissional' },
          dataEvento: new Date('2026-03-05'),
          diaSemana: 'Quinta',
          status: 'Agendado',
          tipoEvento: 'Casamento',
          tipoEventoId: 'tipo-1',
          horarioInicio: '10:00'
        }
      ],
      loading: false,
      error: null,
      refetch: refetchAtivosMock
    } as never);
    vi.mocked(useAgendamentoAlocacoesPorEventos).mockReturnValue({
      alocacoesPorEvento: new Map([
        ['ev-1', [{ id: 'aloc-1', profissionalId: 'prof-1', status: 'agendado' }]],
        ['ev-3', []]
      ]),
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
      expect(screen.getByText('Evento Sem Profissional')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Profissional'), 'prof-1');

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
      expect(screen.queryByText('Evento Sem Profissional')).not.toBeInTheDocument();
      expect(useEventos).toHaveBeenLastCalledWith('prof-1', { limit: 10, offset: 0 });
      expect(useEventosArquivados).toHaveBeenLastCalledWith('prof-1', { limit: 10, offset: 0 });
    });
  });

  it('avança página e sincroniza querystring', async () => {
    const user = userEvent.setup();

    vi.mocked(useEventos).mockReturnValue({
      data: Array.from({ length: 10 }).map((_, index) => ({
        id: `ev-${index + 1}`,
        nomeEvento: `Evento ${index + 1}`,
        cliente: { nome: `Cliente ${index + 1}` },
        dataEvento: new Date('2026-03-01'),
        diaSemana: 'Domingo',
        status: 'Agendado',
        tipoEvento: 'Casamento',
        tipoEventoId: 'tipo-1',
        horarioInicio: '18:00'
      })),
      loading: false,
      error: null,
      refetch: refetchAtivosMock
    } as never);

    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Página 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/eventos?paginaAtivos=2');
    });
  });

  it('altera itens por página e reinicia paginação', async () => {
    const user = userEvent.setup();

    render(<EventosPage />);

    await waitFor(() => {
      expect(useEventos).toHaveBeenLastCalledWith(undefined, { limit: 10, offset: 0 });
    });

    await user.selectOptions(screen.getByLabelText('Itens por página'), '25');

    await waitFor(() => {
      expect(useEventos).toHaveBeenLastCalledWith(undefined, { limit: 25, offset: 0 });
      expect(useEventosArquivados).toHaveBeenLastCalledWith(undefined, { limit: 25, offset: 0 });
      expect(replaceMock).toHaveBeenCalledWith('/eventos?itensPorPagina=25&paginaAtivos=1&paginaArquivados=1');
    });
  });

  it('sincroniza busca, tipo e status na querystring', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Nome do evento ou cliente...'), 'clarice');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'Casamento');
    await user.click(screen.getByRole('button', { name: /Confirmado \(/i }));

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      expect(chamadas.some((url) => url.includes('busca=clarice'))).toBe(true);
      expect(chamadas.some((url) => url.includes('tipo=Casamento'))).toBe(true);
      expect(chamadas.some((url) => url.includes('status=Confirmado'))).toBe(true);
    });
  });

  it('sincroniza período personalizado na querystring', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Aplicar período de teste' }));

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      expect(chamadas.some((url) => url.includes('dateType=custom'))).toBe(true);
      expect(chamadas.some((url) => url.includes('start=2026-03-01'))).toBe(true);
      expect(chamadas.some((url) => url.includes('end=2026-03-31'))).toBe(true);
    });
  });

  it('sincroniza período rápido sem start/end na querystring', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);

    await waitFor(() => {
      expect(screen.getByText('Casamento Silva')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Aplicar rápido de teste' }));

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      const possuiQuick = chamadas.some((url) => url.includes('dateType=quick') && url.includes('quick=thisWeek'));
      const possuiDatasNoQuick = chamadas.some((url) =>
        url.includes('dateType=quick') && (url.includes('start=') || url.includes('end='))
      );
      expect(possuiQuick).toBe(true);
      expect(possuiDatasNoQuick).toBe(false);
    });
  });
});
