import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContratosPage from './page';

const pushMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: showToastMock })
}));

vi.mock('@/components/Layout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/PlanOverlay', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
vi.mock('@/components/ui/confirmation-dialog', () => ({
  default: ({ open, onConfirm, confirmText, onOpenChange }: { open: boolean; onConfirm: () => void; confirmText?: string; onOpenChange?: (value: boolean) => void }) =>
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
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>
}));
vi.mock('@/components/ui/input', () => ({
  Input: ({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label>
      {label}
      <input {...props} />
    </label>
  )
}));

describe('/contratos page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/contratos') && !init) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'ct-1',
                numeroContrato: 'CTR-1',
                status: 'rascunho',
                modeloContrato: { nome: 'Modelo A' },
                evento: { nomeEvento: 'Evento A' },
                eventoId: 'ev-1',
                dataCadastro: new Date('2026-03-01').toISOString()
              }
            ]
          })
        } as Response;
      }
      if (url.includes('/api/contratos/ct-1') && init?.method === 'DELETE') {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      if (url.includes('/api/contratos/ct-1/gerar-pdf') && init?.method === 'POST') {
        return { ok: true, json: async () => ({ pdfUrl: 'https://pdf' }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as never);
  });

  it('renderiza lista de contratos e exclui contrato', async () => {
    const user = userEvent.setup();
    render(<ContratosPage />);

    await waitFor(() => {
      expect(screen.getByText('CTR-1')).toBeInTheDocument();
    });

    const excluirBtn = screen.getByText('Excluir Contrato').previousElementSibling as HTMLButtonElement;
    await user.click(excluirBtn);
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('Contrato excluído com sucesso', 'success');
    });
  });
});
