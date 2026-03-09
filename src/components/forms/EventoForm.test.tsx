import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EventoForm from './EventoForm';

const {
  getTiposEventoMock,
  getServicosCatalogoAtivosMock,
  clientesHookResult,
  canaisEntradaHookResult
} = vi.hoisted(() => ({
  getTiposEventoMock: vi.fn(),
  getServicosCatalogoAtivosMock: vi.fn(),
  clientesHookResult: {
    data: [
      {
        id: 'cli-1',
        nome: 'Cliente XPTO',
        email: 'cliente@xpto.com',
        telefone: '(11) 99999-0000',
        dataCadastro: new Date('2026-01-01')
      }
    ],
    loading: false,
    error: null,
    refetch: vi.fn()
  },
  canaisEntradaHookResult: {
    data: [],
    loading: false,
    error: null,
    refetch: vi.fn()
  }
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn()
  }))
}));

vi.mock('@/hooks/useData', () => ({
  useClientes: vi.fn(() => clientesHookResult),
  useCanaisEntrada: vi.fn(() => canaisEntradaHookResult)
}));

vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: vi.fn(() => ({
    userId: 'user-1',
    isLoading: false
  }))
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getTiposEvento: getTiposEventoMock,
    getServicosCatalogoAtivos: getServicosCatalogoAtivosMock
  }
}));

vi.mock('@/lib/hooks/usePlano', () => ({
  usePlano: vi.fn(() => ({
    podeCriar: true
  }))
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn()
  }))
}));

vi.mock('@/components/forms/EventoServicosSection', () => ({
  default: () => <div data-testid="evento-servicos-section-mock" />
}));

vi.mock('@/components/EventoStatusSelect', () => ({
  default: () => <div data-testid="evento-status-select-mock" />
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

vi.mock('@/components/ui/select', () => ({
  Select: ({
    label,
    value,
    onValueChange
  }: {
    label?: string;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="">Selecione</option>
      </select>
    </label>
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    label,
    value,
    onChange
  }: {
    label?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  }) => (
    <label>
      {label}
      <textarea aria-label={label} value={value} onChange={onChange} />
    </label>
  )
}));

vi.mock('@/components/ui/SelectWithSearch', () => ({
  default: ({
    label,
    value,
    onChange
  }: {
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  )
}));

describe('EventoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTiposEventoMock.mockResolvedValue([]);
    getServicosCatalogoAtivosMock.mockResolvedValue([]);
  });

  it('preenche automaticamente o campo de busca de cliente ao receber clienteInicialId', async () => {
    render(
      <EventoForm
        clienteInicialId="cli-1"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Buscar Cliente')).toHaveValue('Cliente XPTO');
    });
  });
});
