import { POST } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { dataService } from '@/lib/data-service';
import { getAuthenticatedUser } from '@/lib/api/route-helpers';

const getRelatorioDiarioMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getRelatoriosDiariosRepository: vi.fn()
  }
}));

vi.mock('@/lib/data-service', () => ({
  dataService: {
    gerarTodosRelatorios: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/relatorios/atualizar', () => {
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

  it('gera relatórios e retorna atualizadoEm', async () => {
    vi.mocked(dataService.gerarTodosRelatorios).mockResolvedValue(undefined as never);
    getRelatorioDiarioMock.mockResolvedValue({
      dataGeracao: '2026-03-06T14:30:00.000Z'
    });

    const response = await POST();

    expect(dataService.gerarTodosRelatorios).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { atualizadoEm: '2026-03-06T14:30:00.000Z' }
    });
  });
});
