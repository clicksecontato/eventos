import { renderHook, waitFor } from '@testing-library/react';
import { usePlano } from './usePlano';
import { useSession } from 'next-auth/react';
import { getJson } from '@/lib/api/client';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}));

vi.mock('@/lib/api/client', () => ({
  getJson: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    public readonly status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
}));

describe('usePlano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user-1'
        }
      },
      status: 'authenticated'
    } as never);
  });

  it('usa fallback /api/assinaturas quando /api/users/[id]/assinatura falha', async () => {
    vi.mocked(getJson).mockImplementation((url: string) => {
      if (url.includes('/api/users/')) {
        return Promise.reject(new Error('Falha no endpoint principal'));
      }
      if (url === '/api/limites-usuario') {
        return Promise.resolve({
          limites: {
            eventosMesAtual: 3,
            clientesTotal: 12,
            usuariosConta: 1,
            armazenamentoUsado: 1000
          }
        });
      }
      if (url === '/api/assinaturas') {
        return Promise.resolve({
          assinatura: {
            id: 'ass-1',
            userId: 'user-1',
            planoId: 'plano-1',
            hotmartSubscriptionId: 'SUB-1',
            status: 'active',
            dataInicio: new Date('2026-01-01T10:00:00.000Z'),
            funcionalidadesHabilitadas: ['F1'],
            historico: [],
            dataCadastro: new Date('2026-01-01T10:00:00.000Z'),
            dataAtualizacao: new Date('2026-01-01T10:00:00.000Z')
          },
          todasAssinaturas: []
        });
      }
      return Promise.reject(new Error(`URL não mockada: ${url}`));
    });

    const { result } = renderHook(() => usePlano());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.statusPlano?.status).toBe('active');
    expect(result.current.statusPlano?.ativo).toBe(true);
    expect(result.current.error).toContain('Falha no endpoint principal');
    expect(result.current.limites?.eventosMesAtual).toBe(3);
  });
});

