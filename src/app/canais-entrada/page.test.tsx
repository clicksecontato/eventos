import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CanaisEntradaPage from './page';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn()
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getCanaisEntradaAtivos: vi.fn(),
    getCanaisEntradaInativos: vi.fn(),
    createCanalEntrada: vi.fn(),
    updateCanalEntrada: vi.fn(),
    deleteCanalEntrada: vi.fn(),
    reativarCanalEntrada: vi.fn()
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

describe('/canais-entrada page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentUser).mockReturnValue({ userId: 'user-1' } as never);
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([] as never);
    vi.mocked(dataService.getCanaisEntradaInativos).mockResolvedValue([] as never);
  });

  it('renderiza canais ativos carregados', async () => {
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([
      {
        id: 'c1',
        nome: 'Instagram',
        descricao: 'Canal social',
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getCanaisEntradaInativos).mockResolvedValue([] as never);

    render(<CanaisEntradaPage />);

    await waitFor(() => {
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });
    expect(screen.getByText(/Canais de Entrada/)).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há canais ativos', async () => {
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([] as never);
    vi.mocked(dataService.getCanaisEntradaInativos).mockResolvedValue([] as never);

    render(<CanaisEntradaPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum canal de entrada ativo')).toBeInTheDocument();
    });
  });

  it('cria novo canal com interação do formulário', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getCanaisEntradaAtivos)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          id: 'c2',
          nome: 'Google',
          descricao: 'Busca orgânica',
          ativo: true,
          dataCadastro: new Date()
        }
      ] as never);
    vi.mocked(dataService.getCanaisEntradaInativos)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(dataService.createCanalEntrada).mockResolvedValue({
      id: 'c2'
    } as never);

    render(<CanaisEntradaPage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum canal de entrada ativo')).toBeInTheDocument();
    });

    const botoes = screen.getAllByRole('button');
    await user.click(botoes[0]);
    await user.type(screen.getByPlaceholderText('Ex: Instagram, Boca a boca, Google...'), 'Google');
    await user.type(screen.getByPlaceholderText('Descrição opcional do canal de entrada'), 'Busca orgânica');
    await user.click(screen.getByRole('button', { name: 'Criar Canal' }));

    await waitFor(() => {
      expect(dataService.createCanalEntrada).toHaveBeenCalledTimes(1);
    });
    expect(dataService.createCanalEntrada).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Google',
        descricao: 'Busca orgânica',
        ativo: true
      }),
      'user-1'
    );
  });

  it('edita canal existente com interação do usuário', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([
      {
        id: 'c1',
        nome: 'Instagram',
        descricao: 'Canal social',
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getCanaisEntradaInativos).mockResolvedValue([] as never);
    vi.mocked(dataService.updateCanalEntrada).mockResolvedValue({ id: 'c1' } as never);

    render(<CanaisEntradaPage />);

    await waitFor(() => {
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    const botoes = screen.getAllByRole('button');
    await user.click(botoes[botoes.length - 2]);
    await user.clear(screen.getByLabelText('Nome *'));
    await user.type(screen.getByLabelText('Nome *'), 'Instagram Ads');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(dataService.updateCanalEntrada).toHaveBeenCalledTimes(1);
    });
    expect(dataService.updateCanalEntrada).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        nome: 'Instagram Ads'
      }),
      'user-1'
    );
  });

  it('inativa e reativa canal nas abas', async () => {
    const user = userEvent.setup();
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([
      {
        id: 'c1',
        nome: 'Instagram',
        descricao: 'Canal social',
        ativo: true,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.getCanaisEntradaInativos).mockResolvedValue([
      {
        id: 'c2',
        nome: 'Facebook',
        descricao: 'Canal antigo',
        ativo: false,
        dataCadastro: new Date()
      }
    ] as never);
    vi.mocked(dataService.deleteCanalEntrada).mockResolvedValue(undefined as never);
    vi.mocked(dataService.reativarCanalEntrada).mockResolvedValue(undefined as never);

    render(<CanaisEntradaPage />);

    await waitFor(() => {
      expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    const inativarLabel = screen.getByText('Inativar canal de entrada');
    const botaoInativar = inativarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoInativar);
    await user.click(screen.getByRole('button', { name: 'Inativar' }));

    await waitFor(() => {
      expect(dataService.deleteCanalEntrada).toHaveBeenCalledWith('c1', 'user-1');
    });

    await user.click(screen.getByRole('button', { name: /Inativos \(1\)/ }));
    await waitFor(() => {
      expect(screen.getByText('Facebook')).toBeInTheDocument();
    });

    const reativarLabel = screen.getByText('Reativar canal de entrada');
    const botaoReativar = reativarLabel.previousElementSibling as HTMLButtonElement;
    await user.click(botaoReativar);

    await waitFor(() => {
      expect(dataService.reativarCanalEntrada).toHaveBeenCalledWith('c2', 'user-1');
    });
  });
});

