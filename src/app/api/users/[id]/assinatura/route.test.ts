import { GET, POST, PUT } from './route';
import { createContextoAssinaturaServidor } from '@/lib/composition/server-assinatura-context';
import { getAuthenticatedUser, requireAdmin } from '@/lib/api/route-helpers';
import { getServiceFactory } from '@/lib/factories/service-factory';

const obterStatusPlanoUsuarioMock = vi.fn();
const atualizarAssinaturaUsuarioMock = vi.fn();
const sincronizarPlanoUsuarioMock = vi.fn();

vi.mock('@/lib/composition/server-assinatura-context', () => ({
  createContextoAssinaturaServidor: vi.fn()
}));

vi.mock('@/lib/factories/service-factory', () => ({
  getServiceFactory: vi.fn()
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  requireAdmin: vi.fn(),
  getRouteParams: vi.fn(async (params: Promise<{ id: string }>) => params),
  getRequestBody: vi.fn(async (request: Request) => request.json()),
  createApiResponse: vi.fn((data: unknown, status = 200, message?: string) => ({ ok: true, status, message, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, status, error })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/users/[id]/assinatura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createContextoAssinaturaServidor).mockResolvedValue({
      assinaturaService: {
        obterStatusPlanoUsuario: obterStatusPlanoUsuarioMock
      }
    } as never);
    vi.mocked(getServiceFactory).mockReturnValue({
      getAssinaturaService: () => ({
        atualizarAssinaturaUsuario: atualizarAssinaturaUsuarioMock,
        sincronizarPlanoUsuario: sincronizarPlanoUsuarioMock,
        obterStatusPlanoUsuario: obterStatusPlanoUsuarioMock
      })
    } as never);
  });

  it('GET retorna 403 quando usuário não é dono nem admin', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
      email: 'user@teste.com'
    } as never);

    const response = await GET({} as never, { params: Promise.resolve({ id: 'other-user' }) } as never);

    expect(response).toEqual({ ok: false, status: 403, error: 'Não autorizado' });
  });

  it('GET retorna statusPlano para dono do recurso', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
      email: 'user@teste.com'
    } as never);
    obterStatusPlanoUsuarioMock.mockResolvedValue({ plano: { nome: 'Básico' } });

    const response = await GET({} as never, { params: Promise.resolve({ id: 'user-1' }) } as never);

    expect(obterStatusPlanoUsuarioMock).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      ok: true,
      status: 200,
      message: undefined,
      data: { success: true, statusPlano: { plano: { nome: 'Básico' } } }
    });
  });

  it('PUT valida assinaturaId obrigatório', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined as never);

    const request = new Request('http://localhost/api/users/user-1/assinatura', {
      method: 'PUT',
      body: JSON.stringify({})
    });

    const response = await PUT(request as never, { params: Promise.resolve({ id: 'user-1' }) } as never);

    expect(response).toEqual({ ok: false, status: 400, error: 'assinaturaId é obrigatório' });
  });

  it('POST com sincronizar=true executa sincronização', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(undefined as never);
    sincronizarPlanoUsuarioMock.mockResolvedValue({ id: 'user-1' });
    obterStatusPlanoUsuarioMock.mockResolvedValue({ plano: { nome: 'Premium' } });

    const request = new Request('http://localhost/api/users/user-1/assinatura', {
      method: 'POST',
      body: JSON.stringify({ sincronizar: true })
    });

    const response = await POST(request as never, { params: Promise.resolve({ id: 'user-1' }) } as never);

    expect(sincronizarPlanoUsuarioMock).toHaveBeenCalledWith('user-1');
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200
      })
    );
  });
});
