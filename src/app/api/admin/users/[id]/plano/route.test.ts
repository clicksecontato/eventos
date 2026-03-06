import { PUT } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { createApiResponse, createErrorResponse, requireAdminOrPremium } from '@/lib/api/route-helpers';
import { getServiceFactory } from '@/lib/factories/service-factory';

const findByIdMock = vi.fn();
const findByCodigoHotmartMock = vi.fn();
const definirPlanoUsuarioMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getPlanoRepository: vi.fn()
  }
}));

vi.mock('@/lib/factories/service-factory', () => ({
  getServiceFactory: vi.fn()
}));

vi.mock('@/lib/api/route-helpers', () => ({
  requireAdminOrPremium: vi.fn(),
  getRouteParams: vi.fn(async (params: Promise<{ id: string }>) => params),
  getRequestBody: vi.fn(async (request: Request) => request.json()),
  createApiResponse: vi.fn((data: unknown, status = 200, message?: string) => ({ ok: true, status, message, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, status, error })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/admin/users/[id]/plano', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminOrPremium).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(repositoryFactory.getPlanoRepository).mockReturnValue({
      findById: findByIdMock,
      findByCodigoHotmart: findByCodigoHotmartMock
    } as never);
    vi.mocked(getServiceFactory).mockReturnValue({
      getAssinaturaService: () => ({
        definirPlanoUsuario: definirPlanoUsuarioMock
      })
    } as never);
  });

  it('retorna 400 quando plano não é informado', async () => {
    const request = new Request('http://localhost/api/admin/users/u1/plano', {
      method: 'PUT',
      body: JSON.stringify({})
    });

    const response = await PUT(request as never, { params: Promise.resolve({ id: 'u1' }) } as never);

    expect(createErrorResponse).toHaveBeenCalledWith('planoId ou codigoPlano é obrigatório', 400);
    expect(response).toEqual({ ok: false, status: 400, error: 'planoId ou codigoPlano é obrigatório' });
  });

  it('aplica plano com sucesso quando planoId existe', async () => {
    findByIdMock.mockResolvedValue({ id: 'plano-1', nome: 'Básico', codigoHotmart: 'BASICO_MENSAL' });
    definirPlanoUsuarioMock.mockResolvedValue({ user: { id: 'u1' }, assinatura: { status: 'active' } });

    const request = new Request('http://localhost/api/admin/users/u1/plano', {
      method: 'PUT',
      body: JSON.stringify({ planoId: 'plano-1', status: 'active' })
    });

    const response = await PUT(request as never, { params: Promise.resolve({ id: 'u1' }) } as never);

    expect(definirPlanoUsuarioMock).toHaveBeenCalledWith(
      'u1',
      'plano-1',
      'active',
      expect.objectContaining({ adminId: 'admin-1' })
    );
    expect(createApiResponse).toHaveBeenCalled();
    expect(response).toEqual(expect.objectContaining({ ok: true, status: 200 }));
  });
});
