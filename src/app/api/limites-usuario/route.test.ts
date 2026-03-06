import { GET } from './route';
import { createContextoAssinaturaServidor } from '@/lib/composition/server-assinatura-context';
import { getAuthenticatedUser } from '@/lib/api/route-helpers';

const obterLimitesUsuarioMock = vi.fn();

vi.mock('@/lib/composition/server-assinatura-context', () => ({
  createContextoAssinaturaServidor: vi.fn()
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/limites-usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
      email: 'user@teste.com'
    } as never);
    vi.mocked(createContextoAssinaturaServidor).mockResolvedValue({
      funcionalidadeService: {
        obterLimitesUsuario: obterLimitesUsuarioMock
      }
    } as never);
  });

  it('retorna limites do usuário autenticado', async () => {
    obterLimitesUsuarioMock.mockResolvedValue({ clientesLimite: 100, clientesTotal: 2 });

    const response = await GET();

    expect(obterLimitesUsuarioMock).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { limites: { clientesLimite: 100, clientesTotal: 2 } }
    });
  });
});
