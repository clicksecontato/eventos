import { GET } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { getAuthenticatedUser } from '@/lib/api/route-helpers';

const getRelatorioDiarioMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getRelatoriosDiariosRepository: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/relatorios/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
      email: 'user@teste.com'
    } as never);
    vi.mocked(repositoryFactory.getRelatoriosDiariosRepository).mockReturnValue({
      getRelatorioDiario: getRelatorioDiarioMock
    } as never);
  });

  it('retorna dateKey e ultimaAtualizacao quando há cache', async () => {
    getRelatorioDiarioMock.mockResolvedValue({
      dataGeracao: '2026-03-06T12:00:00.000Z'
    });

    const response = await GET();

    expect(getRelatorioDiarioMock).toHaveBeenCalledWith('user-1', expect.any(String));
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: expect.objectContaining({
        dateKey: expect.any(String),
        ultimaAtualizacao: '2026-03-06T12:00:00.000Z'
      })
    });
  });
});
