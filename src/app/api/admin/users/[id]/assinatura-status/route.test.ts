import { PUT } from './route';
import { createApiResponse, createErrorResponse, requireAdminOrPremium } from '@/lib/api/route-helpers';
import { getServiceFactory } from '@/lib/factories/service-factory';

const atualizarStatusAssinaturaUsuarioMock = vi.fn();

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

describe('API /api/admin/users/[id]/assinatura-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminOrPremium).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(getServiceFactory).mockReturnValue({
      getAssinaturaService: () => ({
        atualizarStatusAssinaturaUsuario: atualizarStatusAssinaturaUsuarioMock
      })
    } as never);
  });

  it('retorna 400 quando status não é enviado', async () => {
    const request = new Request('http://localhost/api/admin/users/u1/assinatura-status', {
      method: 'PUT',
      body: JSON.stringify({})
    });

    const response = await PUT(request as never, { params: Promise.resolve({ id: 'u1' }) } as never);

    expect(createErrorResponse).toHaveBeenCalledWith('status é obrigatório', 400);
    expect(response).toEqual({ ok: false, status: 400, error: 'status é obrigatório' });
  });

  it('atualiza status da assinatura com sucesso', async () => {
    atualizarStatusAssinaturaUsuarioMock.mockResolvedValue({
      user: { id: 'u1' },
      assinatura: { status: 'suspended' }
    });

    const request = new Request('http://localhost/api/admin/users/u1/assinatura-status', {
      method: 'PUT',
      body: JSON.stringify({ status: 'suspended', motivo: 'Teste' })
    });

    const response = await PUT(request as never, { params: Promise.resolve({ id: 'u1' }) } as never);

    expect(atualizarStatusAssinaturaUsuarioMock).toHaveBeenCalledWith(
      'u1',
      'suspended',
      expect.objectContaining({ adminId: 'admin-1', motivo: 'Teste' })
    );
    expect(createApiResponse).toHaveBeenCalled();
    expect(response).toEqual(expect.objectContaining({ ok: true, status: 200 }));
  });
});
