import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminPlanosPage from './page';
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

vi.mock('@/components/ui/confirmation-dialog', () => ({
  default: () => null
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

describe('/admin/planos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza planos carregados da API', async () => {
    vi.mocked(getJson).mockImplementation(async (url: string) => {
      if (url === '/api/planos') {
        return {
          planos: [
            {
              id: 'p1',
              nome: 'Premium',
              descricao: 'Plano premium',
              codigoHotmart: 'PREMIUM_MENSAL',
              funcionalidades: ['f1'],
              preco: 149.9,
              intervalo: 'mensal',
              ativo: true,
              destaque: true,
              dataCadastro: new Date(),
              dataAtualizacao: new Date()
            }
          ]
        } as never;
      }
      if (url === '/api/funcionalidades') {
        return {
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
        } as never;
      }
      throw new Error(`URL não mockada: ${url}`);
    });

    render(<AdminPlanosPage />);

    await waitFor(() => {
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });
    expect(screen.getByText(/Planos Cadastrados \(1\)/)).toBeInTheDocument();
  });

  it('exibe mensagem quando não há planos', async () => {
    vi.mocked(getJson).mockImplementation(async (url: string) => {
      if (url === '/api/planos') {
        return { planos: [] } as never;
      }
      if (url === '/api/funcionalidades') {
        return { funcionalidades: [] } as never;
      }
      throw new Error(`URL não mockada: ${url}`);
    });

    render(<AdminPlanosPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Nenhum plano cadastrado/).length).toBeGreaterThan(0);
    });
  });
});

