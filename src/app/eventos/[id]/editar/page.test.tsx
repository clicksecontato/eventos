import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditarEventoPage from './page';
import { useEvento } from '@/hooks/useData';

const pushMock = vi.fn();
const eventoFormMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ev-1' }),
  useRouter: () => ({ push: pushMock })
}));

vi.mock('@/hooks/useData', () => ({
  useEvento: vi.fn()
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

vi.mock('@/components/forms/EventoForm', () => ({
  default: (props: unknown) => {
    eventoFormMock(props);
    return <div>EventoFormMock</div>;
  }
}));

describe('/eventos/[id]/editar page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza loading ao carregar evento', () => {
    vi.mocked(useEvento).mockReturnValue({
      data: null,
      loading: true,
      error: null
    } as never);

    render(<EditarEventoPage />);

    expect(screen.getByText('Carregando evento...')).toBeInTheDocument();
  });

  it('renderiza erro quando hook retorna falha', () => {
    vi.mocked(useEvento).mockReturnValue({
      data: null,
      loading: false,
      error: 'falha ao carregar'
    } as never);

    render(<EditarEventoPage />);

    expect(screen.getByText('Erro ao carregar evento: falha ao carregar')).toBeInTheDocument();
  });

  it('renderiza estado de não encontrado', async () => {
    const user = userEvent.setup();
    vi.mocked(useEvento).mockReturnValue({
      data: null,
      loading: false,
      error: null
    } as never);

    render(<EditarEventoPage />);

    expect(screen.getByText('Evento não encontrado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Voltar para Eventos/i }));
    expect(pushMock).toHaveBeenCalledWith('/eventos');
  });

  it('renderiza formulário quando evento existe', async () => {
    const user = userEvent.setup();
    vi.mocked(useEvento).mockReturnValue({
      data: {
        id: 'ev-1',
        nomeEvento: 'Aniversário',
        contratante: 'Maria',
        cliente: { nome: 'Cliente 1' }
      },
      loading: false,
      error: null
    } as never);

    render(<EditarEventoPage />);

    expect(screen.getByText('Editar Evento')).toBeInTheDocument();
    expect(screen.getByText('EventoFormMock')).toBeInTheDocument();
    expect(eventoFormMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(pushMock).toHaveBeenCalledWith('/eventos/ev-1');
  });
});
