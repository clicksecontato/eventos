import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TiposCustosPage from './page';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getTiposCustoAtivos: vi.fn(),
    getTiposCustoInativos: vi.fn(),
    createTipoCusto: vi.fn(),
    updateTipoCusto: vi.fn(),
    deleteTipoCusto: vi.fn(),
    reativarTipoCusto: vi.fn()
  }
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/PlanOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
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
  }) => (
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
  )
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
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
  Input: ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ label, ...props }: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <label>
      {label}
      <textarea {...props} />
    </label>
  )
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('/tipos-custos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'user-1' } as never);
    vi.mocked(dataService.getTiposCustoAtivos).mockResolvedValue([] as never);
    vi.mocked(dataService.getTiposCustoInativos).mockResolvedValue([] as never);
  });

  it('renderiza tipos de custo ativos carregados', async () => {
    vi.mocked(dataService.getTiposCustoAtivos).mockResolvedValue([
      {
        id: 't1',
        nome: 'Transporte',
        descricao: 'Custos de deslocamento',
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getTiposCustoInativos).mockResolvedValue([] as never);

    render(<TiposCustosPage />);

    await waitFor(() => {
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });
    expect(screen.getByText('Tipos de Custo')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há tipos de custo ativos', async () => {
    vi.mocked(dataService.getTiposCustoAtivos).mockResolvedValue([] as never);
    vi.mocked(dataService.getTiposCustoInativos).mockResolvedValue([] as never);

    render(<TiposCustosPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum tipo de custo ativo')).toBeInTheDocument();
    });
  });

  it('cria novo tipo de custo pelo formulário', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getTiposCustoAtivos)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: 't2',
          nome: 'Transporte',
          descricao: 'Deslocamento equipe',
          ativo: true,
          dataCadastro: new Date()
        }
      ] as never);
    vi.mocked(dataService.getTiposCustoInativos)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(dataService.createTipoCusto).mockResolvedValue({
      id: 't2'
    } as never);

    render(<TiposCustosPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum tipo de custo ativo')).toBeInTheDocument();
    });

    const botoes = screen.getAllByRole('button');
    await user.click(botoes[0]);
    await user.type(screen.getByPlaceholderText('Ex: TOTEM, PROMOTER, MOTORISTA...'), 'Transporte');
    await user.type(screen.getByPlaceholderText('Descrição do tipo de custo'), 'Deslocamento equipe');
    await user.click(screen.getByRole('button', { name: 'Criar Tipo' }));

    await waitFor(() => {
      expect(dataService.createTipoCusto).toHaveBeenCalledTimes(1);
    });
    expect(dataService.createTipoCusto).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Transporte',
        descricao: 'Deslocamento equipe',
        ativo: true
      }),
      'user-1'
    );
  });

  it('edita tipo de custo existente', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getTiposCustoAtivos).mockResolvedValue([
      {
        id: 't1',
        nome: 'Transporte',
        descricao: 'Custos de deslocamento',
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getTiposCustoInativos).mockResolvedValue([] as never);
    vi.mocked(dataService.updateTipoCusto).mockResolvedValue({ id: 't1' } as never);

    render(<TiposCustosPage />);

    await waitFor(() => {
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });

    const botoes = screen.getAllByRole('button');
    await user.click(botoes[botoes.length - 2]);
    await user.clear(screen.getByLabelText('Nome *'));
    await user.type(screen.getByLabelText('Nome *'), 'Transporte Executivo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(dataService.updateTipoCusto).toHaveBeenCalledTimes(1);
    });
    expect(dataService.updateTipoCusto).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        nome: 'Transporte Executivo'
      }),
      'user-1'
    );
  });

  it('inativa e reativa tipo de custo nas abas', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getTiposCustoAtivos).mockResolvedValue([
      {
        id: 't1',
        nome: 'Transporte',
        descricao: 'Ativo',
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getTiposCustoInativos).mockResolvedValue([
      {
        id: 't2',
        nome: 'Equipe Extra',
        descricao: 'Inativo',
        ativo: false,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.deleteTipoCusto).mockResolvedValue(undefined as never);
    vi.mocked(dataService.reativarTipoCusto).mockResolvedValue(undefined as never);

    render(<TiposCustosPage />);

    await waitFor(() => {
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });

    const inativarLabel = screen.getByText('Inativar tipo de custo');
    const botaoInativar = inativarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoInativar);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    await waitFor(() => {
      expect(dataService.deleteTipoCusto).toHaveBeenCalledWith('t1', 'user-1');
    });

    await user.click(screen.getByRole('button', { name: /Inativos \(1\)/ }));
    await waitFor(() => {
      expect(screen.getByText('Equipe Extra')).toBeInTheDocument();
    });

    const reativarLabel = screen.getByText('Reativar tipo de custo');
    const botaoReativar = reativarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoReativar);
    await waitFor(() => {
      expect(dataService.reativarTipoCusto).toHaveBeenCalledWith('t2', 'user-1');
    });
  });
});

