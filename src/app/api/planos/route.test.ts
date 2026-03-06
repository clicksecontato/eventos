import { GET } from './route';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { createApiResponse, createErrorResponse } from '@/lib/api/route-helpers';

const findAllMock = vi.fn();
const findAtivosMock = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: vi.fn(),
  getFirebaseAdminInitializationError: vi.fn(() => null)
}));

vi.mock('@/lib/repositories/admin-plano-repository', () => ({
  AdminPlanoRepository: class {
    findAll = findAllMock;
    findAtivos = findAtivosMock;
  }
}));

vi.mock('@/lib/api/route-helpers', async () => {
  return {
    requireAdminOrPremium: vi.fn(),
    handleApiError: vi.fn((error: unknown) => ({ ok: false, error })),
    getRequestBody: vi.fn(async (request: Request) => request.json()),
    getQueryParams: vi.fn((request: Request) => new URL(request.url).searchParams),
    createApiResponse: vi.fn((data: unknown) => ({ ok: true, data })),
    createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status }))
  };
});

describe('API /api/planos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFirebaseAdminInitialized).mockReturnValue(true);
  });

  it('retorna lista de planos sem filtro por padrão', async () => {
    findAllMock.mockResolvedValue([{ id: 'p1', nome: 'Plano 1' }]);
    const request = { url: 'http://localhost/api/planos' } as unknown as Request;

    const response = await GET(request as never);

    expect(findAllMock).toHaveBeenCalledTimes(1);
    expect(findAtivosMock).not.toHaveBeenCalled();
    expect(createApiResponse).toHaveBeenCalledWith({ planos: [{ id: 'p1', nome: 'Plano 1' }] });
    expect(response).toEqual({ ok: true, data: { planos: [{ id: 'p1', nome: 'Plano 1' }] } });
  });

  it('retorna apenas planos ativos quando query ativos=true', async () => {
    findAtivosMock.mockResolvedValue([{ id: 'p2', nome: 'Plano Ativo' }]);
    const request = { url: 'http://localhost/api/planos?ativos=true' } as unknown as Request;

    await GET(request as never);

    expect(findAtivosMock).toHaveBeenCalledTimes(1);
    expect(findAllMock).not.toHaveBeenCalled();
  });

  it('retorna erro quando Firebase Admin não está inicializado', async () => {
    vi.mocked(isFirebaseAdminInitialized).mockReturnValue(false);
    const request = { url: 'http://localhost/api/planos' } as unknown as Request;

    const response = await GET(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith(
      'Firebase Admin não está inicializado. Verifique as credenciais do Firebase.',
      500
    );
    expect(response).toEqual({
      ok: false,
      error: 'Firebase Admin não está inicializado. Verifique as credenciais do Firebase.',
      status: 500
    });
  });
});

