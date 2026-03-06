import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminFuncionalidadesPage from './page';
import { getJson } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  getJson: vi.fn()
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

vi.mock('@/components/ui/input', () => ({
  Input: ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  default: () => null
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

describe('/admin/funcionalidades page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza funcionalidades carregadas da API', async () => {
    vi.mocked(getJson).mockResolvedValue({
      funcionalidades: [
        {
          id: 'f1',
          codigo: 'RELATORIOS_FULL',
          nome: 'Relatórios Full',
          descricao: 'desc',
          categoria: 'RELATORIOS',
          ativo: true,
          ordem: 1,
          dataCadastro: new Date()
        }
      ]
    } as never);

    render(<AdminFuncionalidadesPage />);

    await waitFor(() => {
      expect(screen.getByText('Relatórios Full')).toBeInTheDocument();
    });
    expect(screen.getByText(/Funcionalidades \(1\)/)).toBeInTheDocument();
  });

  it('exibe mensagem quando não há funcionalidades', async () => {
    vi.mocked(getJson).mockResolvedValue({ funcionalidades: [] } as never);

    render(<AdminFuncionalidadesPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Nenhuma funcionalidade cadastrada/).length).toBeGreaterThan(0);
    });
  });
});

