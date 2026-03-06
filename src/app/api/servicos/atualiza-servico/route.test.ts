import { POST } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  createApiResponse,
  createErrorResponse,
  getQueryParams,
  getRequestBody,
  getUserIdWithApiKeyOrDev
} from '@/lib/api/route-helpers';

const findEventosMock = vi.fn();
const findServicosEventoMock = vi.fn();
const findServicoGlobalMock = vi.fn();
const createServicoGlobalMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getEventoRepository: vi.fn(),
    getServicoEventoRepository: vi.fn(),
    getServicoGlobalRepository: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getUserIdWithApiKeyOrDev: vi.fn(),
  getRequestBody: vi.fn(),
  getQueryParams: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/servicos/atualiza-servico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestBody).mockResolvedValue({} as never);
    vi.mocked(getQueryParams).mockReturnValue(new URLSearchParams() as never);
    vi.mocked(repositoryFactory.getEventoRepository).mockReturnValue({
      findAll: findEventosMock
    } as never);
    vi.mocked(repositoryFactory.getServicoEventoRepository).mockReturnValue({
      findByEventoId: findServicosEventoMock
    } as never);
    vi.mocked(repositoryFactory.getServicoGlobalRepository).mockReturnValue({
      findById: findServicoGlobalMock,
      createServico: createServicoGlobalMock
    } as never);
  });

  it('normaliza serviços para coleção global', async () => {
    vi.mocked(getUserIdWithApiKeyOrDev).mockResolvedValue('user-1');
    findEventosMock.mockResolvedValue([{ id: 'ev-1' }]);
    findServicosEventoMock.mockResolvedValue([
      {
        id: 'sev-1',
        servicoId: 'cat-1',
        observacoes: 'teste',
        removido: false,
        dataCadastro: new Date('2026-02-26')
      }
    ]);
    findServicoGlobalMock.mockResolvedValue(null);

    const response = await POST({} as never);

    expect(findEventosMock).toHaveBeenCalledWith('user-1');
    expect(createServicoGlobalMock).toHaveBeenCalledTimes(1);
    expect(createApiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        estatisticas: expect.objectContaining({
          totalProcessados: 1,
          totalCriados: 1,
          totalErros: 0,
          totalEventos: 1
        })
      })
    );
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200
      })
    );
  });

  it('retorna 401 quando userId não é resolvido', async () => {
    vi.mocked(getUserIdWithApiKeyOrDev).mockResolvedValue(null);
    vi.mocked(getRequestBody).mockResolvedValue({} as never);
    vi.mocked(getQueryParams).mockReturnValue(new URLSearchParams() as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith(
      'Não autorizado. Use autenticação via sessão ou forneça x-api-key header com userId no body ou query param',
      401
    );
    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        status: 401
      })
    );
  });

  it('ignora serviço sem servicoId e não cria registro global', async () => {
    vi.mocked(getUserIdWithApiKeyOrDev).mockResolvedValue('user-1');
    findEventosMock.mockResolvedValue([{ id: 'ev-1' }]);
    findServicosEventoMock.mockResolvedValue([
      {
        id: 'sev-1',
        servicoId: undefined,
        observacoes: 'sem vínculo',
        removido: false,
        dataCadastro: new Date('2026-02-26')
      }
    ]);

    await POST({} as never);

    expect(createServicoGlobalMock).not.toHaveBeenCalled();
    expect(findServicoGlobalMock).not.toHaveBeenCalled();
  });
});
