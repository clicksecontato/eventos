import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PagamentosPage from './page';
import { useAllPagamentos } from '@/hooks/useData';

vi.mock('@/hooks/useData', () => ({
  useAllPagamentos: vi.fn()
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
  Input: ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('/pagamentos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza lista de pagamentos quando há dados', () => {
    vi.mocked(useAllPagamentos).mockReturnValue({
      data: [
        {
          id: 'p1',
          userId: 'user-1',
          eventoId: 'e1',
          valor: 1000,
          dataPagamento: new Date('2026-01-01'),
          formaPagamento: 'PIX',
          status: 'Pago',
          dataCadastro: new Date(),
          dataAtualizacao: new Date(),
          evento: {
            id: 'e1',
            nome: 'Evento Teste',
            local: 'Salão',
            dataEvento: new Date('2026-01-20'),
            cliente: { nome: 'Cliente 1' }
          }
        }
      ],
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    render(<PagamentosPage />);

    expect(screen.getByText('Pagamentos (1)')).toBeInTheDocument();
    expect(screen.getAllByText('Cliente 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
  });

  it('renderiza estado vazio quando não há pagamentos', () => {
    vi.mocked(useAllPagamentos).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    render(<PagamentosPage />);

    expect(screen.getByText('Nenhum pagamento encontrado')).toBeInTheDocument();
  });

  it('filtra por status com interação do usuário', async () => {
    const user = userEvent.setup();
    vi.mocked(useAllPagamentos).mockReturnValue({
      data: [
        {
          id: 'p1',
          userId: 'user-1',
          eventoId: 'e1',
          valor: 1000,
          dataPagamento: new Date('2026-01-01'),
          formaPagamento: 'PIX',
          status: 'Pago',
          dataCadastro: new Date(),
          dataAtualizacao: new Date(),
          evento: {
            id: 'e1',
            nome: 'Evento Pago',
            local: 'Salão',
            dataEvento: new Date('2026-01-20'),
            cliente: { nome: 'Cliente Pago' }
          }
        },
        {
          id: 'p2',
          userId: 'user-1',
          eventoId: 'e2',
          valor: 500,
          dataPagamento: new Date('2026-01-10'),
          formaPagamento: 'Dinheiro',
          status: 'Pendente',
          dataCadastro: new Date(),
          dataAtualizacao: new Date(),
          evento: {
            id: 'e2',
            nome: 'Evento Pendente',
            local: 'Praia',
            dataEvento: new Date('2026-01-25'),
            cliente: { nome: 'Cliente Pendente' }
          }
        }
      ],
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    render(<PagamentosPage />);

    expect(screen.getByText('Pagamentos (2)')).toBeInTheDocument();
    const select = screen.getByDisplayValue('Todos os Status');
    await user.selectOptions(select, 'Pendente');

    expect(screen.getByText('Pagamentos (1)')).toBeInTheDocument();
    expect(screen.getAllByText('Cliente Pendente').length).toBeGreaterThan(0);
  });

  it('filtra por termo de busca no campo de pesquisa', async () => {
    const user = userEvent.setup();
    vi.mocked(useAllPagamentos).mockReturnValue({
      data: [
        {
          id: 'p1',
          userId: 'user-1',
          eventoId: 'e1',
          valor: 1000,
          dataPagamento: new Date('2026-01-01'),
          formaPagamento: 'PIX',
          status: 'Pago',
          dataCadastro: new Date(),
          dataAtualizacao: new Date(),
          evento: {
            id: 'e1',
            nome: 'Evento Casamento',
            local: 'Salão Azul',
            dataEvento: new Date('2026-01-20'),
            cliente: { nome: 'Maria' }
          }
        },
        {
          id: 'p2',
          userId: 'user-1',
          eventoId: 'e2',
          valor: 500,
          dataPagamento: new Date('2026-01-10'),
          formaPagamento: 'Dinheiro',
          status: 'Pendente',
          dataCadastro: new Date(),
          dataAtualizacao: new Date(),
          evento: {
            id: 'e2',
            nome: 'Evento Formatura',
            local: 'Espaço Verde',
            dataEvento: new Date('2026-01-25'),
            cliente: { nome: 'João' }
          }
        }
      ],
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    render(<PagamentosPage />);

    const inputBusca = screen.getByPlaceholderText(
      'Buscar por evento, cliente, local ou observações...'
    );
    await user.type(inputBusca, 'Formatura');

    expect(screen.getByText('Pagamentos (1)')).toBeInTheDocument();
    expect(screen.getAllByText('João').length).toBeGreaterThan(0);
  });
});

