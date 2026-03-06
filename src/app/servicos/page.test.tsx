import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ServicosPage from './page';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getServicosCatalogoAtivos: vi.fn(),
    getServicosCatalogoInativos: vi.fn(),
    createServicoCatalogo: vi.fn(),
    updateServicoCatalogo: vi.fn(),
    deleteServicoCatalogo: vi.fn(),
    reativarServicoCatalogo: vi.fn()
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
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    label,
    hideSpinner,
    ...props
  }: { label?: string; hideSpinner?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) => (
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

describe('/servicos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'user-1' } as never);
    vi.mocked(dataService.getServicosCatalogoAtivos).mockResolvedValue([] as never);
    vi.mocked(dataService.getServicosCatalogoInativos).mockResolvedValue([] as never);
  });

  it('renderiza serviços ativos carregados', async () => {
    vi.mocked(dataService.getServicosCatalogoAtivos).mockResolvedValue([
      {
        id: 's1',
        nome: 'Foto Cabine',
        descricao: 'Cabine de fotos',
        valorPadrao: 500,
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getServicosCatalogoInativos).mockResolvedValue([] as never);

    render(<ServicosPage />);

    await waitFor(() => {
      expect(screen.getByText('Foto Cabine')).toBeInTheDocument();
    });
    expect(screen.getByText('Serviços')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há serviços ativos', async () => {
    vi.mocked(dataService.getServicosCatalogoAtivos).mockResolvedValue([] as never);
    vi.mocked(dataService.getServicosCatalogoInativos).mockResolvedValue([] as never);

    render(<ServicosPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum serviço ativo')).toBeInTheDocument();
    });
  });

  it('cria novo serviço com valor padrão', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getServicosCatalogoAtivos)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: 's2',
          nome: 'Totem',
          descricao: 'Totem premium',
          valorPadrao: 1200,
          ativo: true,
          dataCadastro: new Date()
        }
      ] as never);
    vi.mocked(dataService.getServicosCatalogoInativos)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(dataService.createServicoCatalogo).mockResolvedValue({
      id: 's2'
    } as never);

    render(<ServicosPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum serviço ativo')).toBeInTheDocument();
    });

    const botoes = screen.getAllByRole('button');
    await user.click(botoes[0]);
    await user.type(screen.getByPlaceholderText('Nome do serviço'), 'Totem');
    await user.type(screen.getByPlaceholderText('Descrição do serviço (opcional)'), 'Totem premium');
    await user.clear(screen.getByLabelText('Valor padrão (R$)'));
    await user.type(screen.getByLabelText('Valor padrão (R$)'), '1200');
    await user.click(screen.getByRole('button', { name: 'Criar Serviço' }));

    await waitFor(() => {
      expect(dataService.createServicoCatalogo).toHaveBeenCalledTimes(1);
    });
    expect(dataService.createServicoCatalogo).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Totem',
        descricao: 'Totem premium',
        valorPadrao: 1200,
        ativo: true
      }),
      'user-1'
    );
  });

  it('edita serviço existente', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getServicosCatalogoAtivos).mockResolvedValue([
      {
        id: 's1',
        nome: 'Foto Cabine',
        descricao: 'Cabine',
        valorPadrao: 500,
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getServicosCatalogoInativos).mockResolvedValue([] as never);
    vi.mocked(dataService.updateServicoCatalogo).mockResolvedValue({ id: 's1' } as never);

    render(<ServicosPage />);

    await waitFor(() => {
      expect(screen.getByText('Foto Cabine')).toBeInTheDocument();
    });

    const botoes = screen.getAllByRole('button');
    await user.click(botoes[botoes.length - 2]);
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Foto Cabine Pro');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(dataService.updateServicoCatalogo).toHaveBeenCalledTimes(1);
    });
    expect(dataService.updateServicoCatalogo).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        nome: 'Foto Cabine Pro'
      }),
      'user-1'
    );
  });

  it('inativa e reativa serviço nas abas', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getServicosCatalogoAtivos).mockResolvedValue([
      {
        id: 's1',
        nome: 'Foto Cabine',
        descricao: 'Cabine',
        valorPadrao: 500,
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getServicosCatalogoInativos).mockResolvedValue([
      {
        id: 's2',
        nome: 'Totem',
        descricao: 'Inativo',
        valorPadrao: 400,
        ativo: false,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.deleteServicoCatalogo).mockResolvedValue(undefined as never);
    vi.mocked(dataService.reativarServicoCatalogo).mockResolvedValue(undefined as never);

    render(<ServicosPage />);

    await waitFor(() => {
      expect(screen.getByText('Foto Cabine')).toBeInTheDocument();
    });

    const inativarLabel = screen.getByText('Inativar serviço');
    const botaoInativar = inativarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoInativar);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    await waitFor(() => {
      expect(dataService.deleteServicoCatalogo).toHaveBeenCalledWith('s1', 'user-1');
    });

    await user.click(screen.getByRole('button', { name: /Inativos \(1\)/ }));
    await waitFor(() => {
      expect(screen.getByText('Totem')).toBeInTheDocument();
    });

    const reativarLabel = screen.getByText('Reativar serviço');
    const botaoReativar = reativarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoReativar);
    await waitFor(() => {
      expect(dataService.reativarServicoCatalogo).toHaveBeenCalledWith('s2', 'user-1');
    });
  });
});

