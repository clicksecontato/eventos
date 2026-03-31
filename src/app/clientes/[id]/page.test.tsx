import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClienteDetalhePage from './page';
import { useCliente, useContratosAgrupadosPorEventos, useEventos } from '@/hooks/useData';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'cli-1' }),
  useRouter: () => ({ push: pushMock })
}));

vi.mock('@/hooks/useData', () => ({
  useCliente: vi.fn(),
  useEventos: vi.fn(),
  useContratosAgrupadosPorEventos: vi.fn()
}));

vi.mock('@/components/Layout', () => ({
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

describe('/clientes/[id] page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCliente).mockReturnValue({
      data: {
        id: 'cli-1',
        nome: 'Cliente XPTO',
        email: 'cliente@xpto.com',
        telefone: '(11) 99999-0000',
        dataCadastro: new Date('2026-01-01'),
        canalEntrada: { nome: 'Instagram' }
      },
      loading: false,
      error: null
    } as never);
    vi.mocked(useEventos).mockReturnValue({
      data: [
        {
          id: 'ev-1',
          clienteId: 'cli-1',
          nomeEvento: 'Evento 1',
          dataEvento: new Date('2026-03-10'),
          status: 'Agendado',
          local: 'Salão',
          valorTotal: 1200
        }
      ],
      loading: false
    } as never);
    vi.mocked(useContratosAgrupadosPorEventos).mockReturnValue({
      data: {
        'ev-1': [
          {
            id: 'ct-1',
            eventoId: 'ev-1',
            modeloContratoId: 'mod-1',
            modeloContrato: { nome: 'Contrato Prestação' },
            dadosPreenchidos: {},
            status: 'gerado',
            dataGeracao: new Date('2026-02-01'),
            dataCadastro: new Date('2026-02-01'),
            dataAtualizacao: new Date('2026-02-01'),
            criadoPor: 'u1'
          }
        ]
      },
      loading: false,
      error: null,
      refetch: vi.fn()
    } as never);
  });

  it('renderiza resumo e eventos do cliente', async () => {
    render(<ClienteDetalhePage />);

    await waitFor(() => {
      expect(screen.getByText('Cliente XPTO')).toBeInTheDocument();
    });
    expect(screen.getByText('Eventos do Cliente')).toBeInTheDocument();
    expect(screen.getByText('Evento 1')).toBeInTheDocument();
    expect(screen.getByText('Contrato Prestação')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir contrato/i })).toBeInTheDocument();
  });

  it('navega para evento ao clicar em Ver evento', async () => {
    const user = userEvent.setup();
    render(<ClienteDetalhePage />);

    await waitFor(() => {
      expect(screen.getByText('Evento 1')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Ver evento/i }));

    expect(pushMock).toHaveBeenCalledWith('/eventos/ev-1');
  });

  it('inicia criação de evento com cliente pré-selecionado', async () => {
    const user = userEvent.setup();
    render(<ClienteDetalhePage />);

    await waitFor(() => {
      expect(screen.getByText('Cliente XPTO')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Novo Evento' }));

    expect(pushMock).toHaveBeenCalledWith('/eventos/novo?clienteId=cli-1');
  });
});
