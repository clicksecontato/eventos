import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from './page';

const showToastMock = vi.fn();

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
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
    ...props
  }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

describe('/admin/users page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (!init && url.includes('/api/admin/users')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              users: [
                { id: 'adm-1', nome: 'Admin', email: 'admin@teste.com', role: 'admin' },
                {
                  id: 'user-1',
                  nome: 'Usuário 1',
                  email: 'user1@teste.com',
                  role: 'user',
                  assinatura: { planoNome: 'Básico', status: 'ATIVA', planoId: 'plano-1' }
                }
              ]
            }
          })
        } as Response;
      }

      if (!init && url.includes('/api/planos')) {
        return {
          ok: true,
          json: async () => ({
            data: { planos: [{ id: 'plano-1', nome: 'Básico', codigoHotmart: 'BASICO_MENSAL' }] }
          })
        } as Response;
      }

      if (url.includes('/api/admin/create-user') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            user: { nome: 'Novo User', email: 'novo@teste.com' },
            planoAtribuido: { planoNome: 'Básico', planoCodigo: 'BASICO_MENSAL' }
          })
        } as Response;
      }

      if (url.includes('/api/admin/users/user-1/plano') && init?.method === 'PUT') {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }

      if (url.includes('/api/admin/users/user-1/assinatura-status') && init?.method === 'PUT') {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }

      if (url.includes('/api/users/user-1/assinatura') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    }) as never);
  });

  it('renderiza usuários não-admin carregados', async () => {
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Usuário 1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('cria novo usuário pelo formulário', async () => {
    const user = userEvent.setup();
    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Usuário 1')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Nome'), 'Novo User');
    await user.type(screen.getByLabelText('Email'), 'novo@teste.com');
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByTestId('admin-criar-usuario'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        'Usuário criado com sucesso (Básico - BASICO_MENSAL)',
        'success'
      );
    });
  });
});
