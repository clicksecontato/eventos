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
const findPagamentosEventoMock = vi.fn();
const findPagamentoGlobalMock = vi.fn();
const createPagamentoGlobalMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getEventoRepository: vi.fn(),
    getPagamentoRepository: vi.fn(),
    getPagamentoGlobalRepository: vi.fn()
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

describe('API /api/pagamentos/atualiza-pagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestBody).mockResolvedValue({} as never);
    vi.mocked(getQueryParams).mockReturnValue(new URLSearchParams() as never);
    vi.mocked(repositoryFactory.getEventoRepository).mockReturnValue({
      findAll: findEventosMock
    } as never);
    vi.mocked(repositoryFactory.getPagamentoRepository).mockReturnValue({
      findByEventoId: findPagamentosEventoMock
    } as never);
    vi.mocked(repositoryFactory.getPagamentoGlobalRepository).mockReturnValue({
      findById: findPagamentoGlobalMock,
      createPagamento: createPagamentoGlobalMock
    } as never);
  });

  it('normaliza pagamentos para coleção global', async () => {
    vi.mocked(getUserIdWithApiKeyOrDev).mockResolvedValue('user-1');
    findEventosMock.mockResolvedValue([{ id: 'ev-1' }]);
    findPagamentosEventoMock.mockResolvedValue([
      {
        id: 'pag-1',
        userId: 'user-1',
        valor: 300,
        dataPagamento: new Date('2026-02-26'),
        formaPagamento: 'pix',
        status: 'pago',
        cancelado: false,
        dataCadastro: new Date('2026-02-26'),
        dataAtualizacao: new Date('2026-02-26')
      }
    ]);
    findPagamentoGlobalMock.mockResolvedValue(null);

    const response = await POST({} as never);

    expect(findEventosMock).toHaveBeenCalledWith('user-1');
    expect(createPagamentoGlobalMock).toHaveBeenCalledTimes(1);
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
});
