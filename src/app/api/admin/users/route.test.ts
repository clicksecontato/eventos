import { GET } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { createApiResponse, requireAdminOrPremium } from '@/lib/api/route-helpers';

const findAllMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getUserRepository: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  requireAdminOrPremium: vi.fn(),
  getQueryParams: vi.fn((request: Request) => new URL(request.url).searchParams),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminOrPremium).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(repositoryFactory.getUserRepository).mockReturnValue({
      findAll: findAllMock
    } as never);
  });

  it('retorna usuários ordenados por data de cadastro', async () => {
    findAllMock.mockResolvedValue([
      { id: 'u1', role: 'user', dataCadastro: '2026-01-01T00:00:00.000Z', ativo: true },
      { id: 'u2', role: 'user', dataCadastro: '2026-02-01T00:00:00.000Z', ativo: true }
    ]);

    const response = await GET(new Request('http://localhost/api/admin/users') as never);

    expect(createApiResponse).toHaveBeenCalledWith({
      users: [
        { id: 'u2', role: 'user', dataCadastro: '2026-02-01T00:00:00.000Z', ativo: true },
        { id: 'u1', role: 'user', dataCadastro: '2026-01-01T00:00:00.000Z', ativo: true }
      ]
    });
    expect(response).toEqual(expect.objectContaining({ ok: true, status: 200 }));
  });

  it('filtra por role e ativos via query', async () => {
    findAllMock.mockResolvedValue([
      { id: 'u1', role: 'user', ativo: true },
      { id: 'u2', role: 'admin', ativo: true },
      { id: 'u3', role: 'user', ativo: false }
    ]);

    await GET(new Request('http://localhost/api/admin/users?role=user&ativos=true') as never);

    expect(createApiResponse).toHaveBeenCalledWith({
      users: [{ id: 'u1', role: 'user', ativo: true }]
    });
  });
});
