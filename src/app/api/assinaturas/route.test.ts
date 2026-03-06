import { GET } from './route';
import { createContextoAssinaturaServidor } from '@/lib/composition/server-assinatura-context';
import { getAuthenticatedUser } from '@/lib/api/route-helpers';
import { getFirebaseAdminInitializationError, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

const findByUserIdMock = vi.fn();
const findAllByUserIdMock = vi.fn();

vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: vi.fn(),
  getFirebaseAdminInitializationError: vi.fn()
}));

vi.mock('@/lib/composition/server-assinatura-context', () => ({
  createContextoAssinaturaServidor: vi.fn()
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getQueryParams: vi.fn((request: Request) => new URL(request.url).searchParams),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, status, error })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/assinaturas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFirebaseAdminInitialized).mockReturnValue(true);
    vi.mocked(getFirebaseAdminInitializationError).mockReturnValue(undefined);
    vi.mocked(createContextoAssinaturaServidor).mockResolvedValue({
      assinaturaRepo: {
        findByUserId: findByUserIdMock,
        findAllByUserId: findAllByUserIdMock
      }
    } as never);
  });

  it('retorna erro quando Firebase Admin não está inicializado', async () => {
    vi.mocked(isFirebaseAdminInitialized).mockReturnValue(false);
    vi.mocked(getFirebaseAdminInitializationError).mockReturnValue(new Error('init fail'));

    const response = await GET(new Request('http://localhost/api/assinaturas') as never);

    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        status: 500
      })
    );
  });

  it('admin com userId retorna assinaturas do usuário informado', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    findAllByUserIdMock.mockResolvedValue([{ id: 'ass-1', userId: 'u-2' }]);

    const response = await GET(new Request('http://localhost/api/assinaturas?userId=u-2') as never);

    expect(findAllByUserIdMock).toHaveBeenCalledWith('u-2');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { assinaturas: [{ id: 'ass-1', userId: 'u-2' }] }
    });
  });

  it('usuário comum retorna assinatura ativa e histórico', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
      email: 'user@teste.com'
    } as never);
    findByUserIdMock.mockResolvedValue({ id: 'ass-ativa' });
    findAllByUserIdMock.mockResolvedValue([{ id: 'ass-ativa' }, { id: 'ass-antiga' }]);

    const response = await GET(new Request('http://localhost/api/assinaturas') as never);

    expect(findByUserIdMock).toHaveBeenCalledWith('user-1');
    expect(findAllByUserIdMock).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: {
        assinatura: { id: 'ass-ativa' },
        todasAssinaturas: [{ id: 'ass-ativa' }, { id: 'ass-antiga' }]
      }
    });
  });
});
