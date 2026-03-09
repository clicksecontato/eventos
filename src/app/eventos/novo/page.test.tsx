import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NovoEventoPage from './page';

const pushMock = vi.fn();
const eventoFormMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'clienteId' ? 'cli-123' : null)
  })
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/PlanoBloqueio', () => ({
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
  default: ({
    clienteInicialId,
    onSave,
    onCancel
  }: {
    clienteInicialId?: string;
    onSave: (evento: { id: string }) => void;
    onCancel: () => void;
  }) => {
    eventoFormMock({ clienteInicialId, onSave, onCancel });
    return (
      <div>
        <button onClick={() => onSave({ id: 'ev-novo-1' })}>Salvar Evento Mock</button>
        <button onClick={onCancel}>Cancelar Evento Mock</button>
      </div>
    );
  }
}));

describe('/eventos/novo page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a página de novo evento', () => {
    render(<NovoEventoPage />);

    expect(screen.getByText('Novo Evento')).toBeInTheDocument();
    expect(screen.getByText('Dados do Evento')).toBeInTheDocument();
    expect(screen.getByText('Salvar Evento Mock')).toBeInTheDocument();
  });

  it('passa clienteInicialId para o formulário quando recebido na URL', () => {
    render(<NovoEventoPage />);

    expect(eventoFormMock).toHaveBeenCalledWith(
      expect.objectContaining({ clienteInicialId: 'cli-123' })
    );
  });

  it('volta para lista de eventos no botão Voltar', async () => {
    const user = userEvent.setup();
    render(<NovoEventoPage />);

    await user.click(screen.getByRole('button', { name: /Voltar/i }));

    expect(pushMock).toHaveBeenCalledWith('/eventos');
  });

  it('navega para detalhes ao salvar novo evento', async () => {
    const user = userEvent.setup();
    render(<NovoEventoPage />);

    await user.click(screen.getByRole('button', { name: 'Salvar Evento Mock' }));

    expect(pushMock).toHaveBeenCalledWith('/eventos/ev-novo-1');
  });

  it('cancela criação e volta para lista', async () => {
    const user = userEvent.setup();
    render(<NovoEventoPage />);

    await user.click(screen.getByRole('button', { name: 'Cancelar Evento Mock' }));

    expect(pushMock).toHaveBeenCalledWith('/eventos');
  });
});
