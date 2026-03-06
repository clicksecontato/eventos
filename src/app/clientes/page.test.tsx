import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientesPage from './page';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';

const pushMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}));

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/lib/hooks/usePlano', () => ({
  usePlano: () => ({ limites: null })
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getClientes: vi.fn(),
    getClientesArquivados: vi.fn(),
    getCanaisEntradaAtivos: vi.fn(),
    createCliente: vi.fn(),
    updateCliente: vi.fn(),
    deleteCliente: vi.fn(),
    desarquivarCliente: vi.fn(),
    getEventos: vi.fn(),
    createCanalEntrada: vi.fn()
  }
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/PlanOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/PlanoBloqueio', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/LimiteUsoCompacto', () => ({
  default: () => <div />
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

vi.mock('@/lib/utils/plano-errors', () => ({
  handlePlanoError: vi.fn(() => false)
}));

vi.mock('@/components/ui/SelectWithSearch', () => ({
  default: ({
    label,
    value,
    onChange,
    options
  }: {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    label,
    ...props
  }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

describe('/clientes page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'user-1' } as never);
    vi.mocked(dataService.getClientes).mockResolvedValue([
      {
        id: 'cli-1',
        nome: 'Cliente Um',
        email: 'cliente1@teste.com',
        telefone: '(11) 99999-1111',
        dataCadastro: new Date(),
        canalEntradaId: 'canal-1'
      }
    ] as never);
    vi.mocked(dataService.getClientesArquivados).mockResolvedValue([
      {
        id: 'cli-2',
        nome: 'Cliente Arquivado',
        email: 'arquivado@teste.com',
        telefone: '(11) 99999-2222',
        dataCadastro: new Date(),
        canalEntradaId: 'canal-1'
      }
    ] as never);
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([
      { id: 'canal-1', nome: 'Instagram' }
    ] as never);
    vi.mocked(dataService.getEventos).mockResolvedValue([] as never);
    vi.mocked(dataService.createCliente).mockResolvedValue({ id: 'novo' } as never);
    vi.mocked(dataService.deleteCliente).mockResolvedValue(undefined as never);
    vi.mocked(dataService.desarquivarCliente).mockResolvedValue(undefined as never);
  });

  it('renderiza clientes ativos', async () => {
    render(<ClientesPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Cliente Um').length).toBeGreaterThan(0);
    });
  });

  it('cria novo cliente', async () => {
    const user = userEvent.setup();
    render(<ClientesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Cliente Um').length).toBeGreaterThan(0);
    });

    const novoLabel = screen.getByText('Novo cliente');
    const botaoNovo = novoLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoNovo);

    await user.type(screen.getByPlaceholderText('Nome completo do cliente'), 'Cliente Novo');
    await user.type(screen.getByPlaceholderText('email@exemplo.com'), 'novo@teste.com');
    await user.type(screen.getByPlaceholderText('(00) 00000-0000'), '(11) 98888-0000');
    await user.click(screen.getByRole('button', { name: 'Criar Cliente' }));

    await waitFor(() => {
      expect(dataService.createCliente).toHaveBeenCalledTimes(1);
    });
  });

  it('arquiva e desarquiva cliente', async () => {
    const user = userEvent.setup();
    render(<ClientesPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Cliente Um').length).toBeGreaterThan(0);
    });

    const arquivarLabel = screen.getAllByText('Arquivar cliente')[0];
    const botaoArquivar = arquivarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoArquivar);
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    await waitFor(() => {
      expect(dataService.deleteCliente).toHaveBeenCalledWith('cli-1', 'user-1');
    });

    await user.click(screen.getByRole('button', { name: /Arquivados \(1\)/ }));
    await waitFor(() => {
      expect(screen.getAllByText('Cliente Arquivado').length).toBeGreaterThan(0);
    });
    const desarquivarLabel = screen.getAllByText('Desarquivar cliente')[0];
    const botaoDesarquivar = desarquivarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoDesarquivar);

    await waitFor(() => {
      expect(dataService.desarquivarCliente).toHaveBeenCalledWith('cli-2', 'user-1');
    });
  });
});
