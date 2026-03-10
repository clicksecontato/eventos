import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfissionaisPage from './page';
import { getJson } from '@/lib/api/client';

const showToastMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsMock = new URLSearchParams();
const routerMock = { replace: replaceMock };

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock
}));

vi.mock('@/lib/api/client', () => ({
  getJson: vi.fn()
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
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

describe('/profissionais page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Array.from(searchParamsMock.keys()).forEach((key) => searchParamsMock.delete(key));
    vi.mocked(getJson).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/agendamento/profissionais')) {
        if (init?.method === 'POST') {
          return { id: 'prof-3', nome: 'Dra. Nova', ativo: true } as never;
        }
        return [
          { id: 'prof-1', nome: 'Dra. Clarice', especialidade: 'Dermatologia', ativo: true },
          { id: 'prof-2', nome: 'Dr. Marcos', especialidade: 'Estética', ativo: false }
        ] as never;
      }
      if (url.startsWith('/api/agendamento/disponibilidade')) {
        return {
          disponibilidades: [],
          disponibilidadesDia: [],
          bloqueios: []
        } as never;
      }
      throw new Error(`URL não mockada: ${url}`);
    });
  });

  it('renderiza profissionais ativos e inativos', async () => {
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByText('Profissionais')).toBeInTheDocument();
      expect(screen.getAllByText('Dra. Clarice').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dr. Marcos').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Ativo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Inativo').length).toBeGreaterThan(0);
    });
  });

  it('cadastra profissional pela tela', async () => {
    const user = userEvent.setup();
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Nome'), 'Dra. Nova');
    await user.type(screen.getByLabelText('Especialidade'), 'Harmonização');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/api/agendamento/profissionais', expect.objectContaining({
        method: 'POST'
      }));
      expect(showToastMock).toHaveBeenCalledWith('Profissional cadastrado com sucesso', 'success');
    });
  });

  it('remove disponibilidade pela tela', async () => {
    const user = userEvent.setup();
    vi.mocked(getJson).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/agendamento/profissionais')) {
        return [
          { id: 'prof-1', nome: 'Dra. Clarice', especialidade: 'Dermatologia', ativo: true }
        ] as never;
      }
      if (url.startsWith('/api/agendamento/disponibilidade?tipo=disponibilidade&id=disp-1') && init?.method === 'DELETE') {
        return { sucesso: true } as never;
      }
      if (url.startsWith('/api/agendamento/disponibilidade')) {
        return {
          disponibilidades: [{ id: 'disp-1', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' }],
          disponibilidadesDia: [{ id: 'disp-1', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' }],
          bloqueios: []
        } as never;
      }
      throw new Error(`URL não mockada: ${url}`);
    });

    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByText('Disponibilidades cadastradas')).toBeInTheDocument();
      expect(screen.getByText('Disponibilidades do dia selecionado')).toBeInTheDocument();
      expect(screen.getAllByText(/Dia 1 - 09:00 até 12:00/i).length).toBeGreaterThan(0);
    });

    const botoesExcluir = screen.getAllByRole('button', { name: 'Excluir' });
    await user.click(botoesExcluir[0]);
    await user.click(screen.getAllByRole('button', { name: 'Excluir' }).at(-1)!);

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/api/agendamento/disponibilidade?tipo=disponibilidade&id=disp-1', {
        method: 'DELETE'
      });
      expect(showToastMock).toHaveBeenCalledWith('Disponibilidade removida com sucesso', 'success');
    });
  });

  it('confirma antes de inativar profissional', async () => {
    const user = userEvent.setup();
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByText('Profissionais')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Inativar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/api/agendamento/profissionais', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          id: 'prof-1',
          ativo: false
        })
      }));
      expect(showToastMock).toHaveBeenCalledWith('Profissional inativado com sucesso', 'success');
    });
  });

  it('filtra lista para mostrar apenas disponibilidades do dia selecionado', async () => {
    const user = userEvent.setup();
    vi.mocked(getJson).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/agendamento/profissionais')) {
        return [
          { id: 'prof-1', nome: 'Dra. Clarice', especialidade: 'Dermatologia', ativo: true }
        ] as never;
      }
      if (url.startsWith('/api/agendamento/disponibilidade')) {
        return {
          disponibilidades: [
            { id: 'disp-1', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' },
            { id: 'disp-2', diaSemana: 3, horaInicio: '14:00', horaFim: '18:00' }
          ],
          disponibilidadesDia: [
            { id: 'disp-1', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' }
          ],
          bloqueios: []
        } as never;
      }
      throw new Error(`URL não mockada: ${url}`);
    });

    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByText(/Dia 3 - 14:00 até 18:00/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Visualização'), 'dia');

    await waitFor(() => {
      expect(screen.queryByText(/Dia 3 - 14:00 até 18:00/i)).not.toBeInTheDocument();
    });
  });

  it('filtra lista para semana selecionada', async () => {
    const user = userEvent.setup();
    vi.mocked(getJson).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/agendamento/profissionais')) {
        return [{ id: 'prof-1', nome: 'Dra. Clarice', especialidade: 'Dermatologia', ativo: true }] as never;
      }
      if (url.startsWith('/api/agendamento/disponibilidade')) {
        return {
          disponibilidades: [
            { id: 'disp-1', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' },
            { id: 'disp-2', diaSemana: 0, horaInicio: '14:00', horaFim: '18:00' }
          ],
          disponibilidadesDia: [{ id: 'disp-1', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' }],
          bloqueios: []
        } as never;
      }
      throw new Error(`URL não mockada: ${url}`);
    });

    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Visualização')).toBeInTheDocument();
      expect(screen.getByText(/Dia 0 - 14:00 até 18:00/i)).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('Início do período'));
    await user.type(screen.getByLabelText('Início do período'), '2026-03-03');
    await user.clear(screen.getByLabelText('Fim do período'));
    await user.type(screen.getByLabelText('Fim do período'), '2026-03-05');
    await user.selectOptions(screen.getByLabelText('Visualização'), 'semana');

    await waitFor(() => {
      expect(screen.queryByText(/Dia 0 - 14:00 até 18:00/i)).not.toBeInTheDocument();
    });
  });

  it('sincroniza modo de visualização na querystring', async () => {
    const user = userEvent.setup();
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByText('Profissionais')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Visualização'), 'semana');

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      expect(chamadas.some((url) => url.includes('viewDisponibilidade=semana'))).toBe(true);
    });
  });

  it('sincroniza profissional e período na querystring', async () => {
    const user = userEvent.setup();
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Fim do período')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText('Profissional'), 'prof-2');
    await user.clear(screen.getByLabelText('Início do período'));
    await user.type(screen.getByLabelText('Início do período'), '2026-03-10');
    await user.clear(screen.getByLabelText('Fim do período'));
    await user.type(screen.getByLabelText('Fim do período'), '2026-03-20');

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      expect(chamadas.some((url) => url.includes('profissionalId=prof-2'))).toBe(true);
      expect(chamadas.some((url) => url.includes('periodoInicio=2026-03-10'))).toBe(true);
      expect(chamadas.some((url) => url.includes('periodoFim=2026-03-20'))).toBe(true);
    });
  });

  it('sincroniza busca e status na querystring', async () => {
    const user = userEvent.setup();
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Buscar profissional')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Buscar profissional'), 'Clarice');
    await user.selectOptions(screen.getAllByLabelText('Status')[0], 'inativos');

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      expect(chamadas.some((url) => url.includes('busca=Clarice'))).toBe(true);
      expect(chamadas.some((url) => url.includes('status=inativos'))).toBe(true);
    });
  });

  it('restaura busca e status a partir da querystring', async () => {
    searchParamsMock.set('busca', 'Marcos');
    searchParamsMock.set('status', 'inativos');
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Buscar profissional')).toHaveValue('Marcos');
      expect(screen.getAllByLabelText('Status')[0]).toHaveValue('inativos');
    });
  });

  it('sincroniza edicaoId na querystring ao clicar em editar', async () => {
    const user = userEvent.setup();
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText('Status')[0]).toHaveValue('todos');
    });

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    await waitFor(() => {
      const chamadas = replaceMock.mock.calls.map((args) => String(args[0]));
      expect(chamadas.some((url) => url.includes('edicaoId='))).toBe(true);
    });
  });

  it('restaura formulario de edicao a partir da querystring', async () => {
    searchParamsMock.set('edicaoId', 'prof-2');
    render(<ProfissionaisPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Nome')).toHaveValue('Dr. Marcos');
      expect(screen.getByLabelText('Especialidade')).toHaveValue('Estética');
      expect(screen.getByRole('button', { name: 'Salvar edição' })).toBeInTheDocument();
    });
  });
});

