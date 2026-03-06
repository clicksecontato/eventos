import { POST } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody
} from '@/lib/api/route-helpers';
import { getServiceFactory } from '@/lib/factories/service-factory';

const verificarPermissaoMock = vi.fn();
const createPagamentoMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getPagamentoRepository: vi.fn()
  }
}));

vi.mock('@/lib/factories/service-factory', () => ({
  getServiceFactory: vi.fn()
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRequestBody: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/pagamentos/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(getServiceFactory).mockReturnValue({
      getFuncionalidadeService: () => ({
        verificarPermissao: verificarPermissaoMock
      })
    } as never);
    vi.mocked(repositoryFactory.getPagamentoRepository).mockReturnValue({
      createPagamento: createPagamentoMock
    } as never);
  });

  it('cria pagamento quando payload e permissão são válidos', async () => {
    verificarPermissaoMock.mockResolvedValue(true);
    vi.mocked(getRequestBody).mockResolvedValue({
      eventoId: 'evento-1',
      valor: '250.50',
      dataPagamento: '2026-02-25',
      formaPagamento: 'pix',
      status: 'pago',
      observacoes: 'ok'
    } as never);
    createPagamentoMock.mockResolvedValue({ id: 'pag-1' });

    const response = await POST({} as never);

    expect(createPagamentoMock).toHaveBeenCalledTimes(1);
    expect(createPagamentoMock).toHaveBeenCalledWith(
      'user-1',
      'evento-1',
      expect.objectContaining({
        valor: 250.5,
        formaPagamento: 'pix',
        status: 'pago'
      })
    );
    expect(createApiResponse).toHaveBeenCalledWith({ id: 'pag-1' }, 201);
    expect(response).toEqual({ ok: true, status: 201, data: { id: 'pag-1' } });
  });

  it('retorna 403 quando não há permissão de registrar pagamento', async () => {
    verificarPermissaoMock.mockResolvedValue(false);
    vi.mocked(getRequestBody).mockResolvedValue({} as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Seu plano não permite registrar pagamentos', 403);
    expect(response).toEqual({
      ok: false,
      error: 'Seu plano não permite registrar pagamentos',
      status: 403
    });
    expect(createPagamentoMock).not.toHaveBeenCalled();
  });

  it('retorna 400 quando dataPagamento é inválida', async () => {
    verificarPermissaoMock.mockResolvedValue(true);
    vi.mocked(getRequestBody).mockResolvedValue({
      eventoId: 'evento-1',
      valor: 100,
      dataPagamento: 'data-invalida',
      formaPagamento: 'pix',
      status: 'pago'
    } as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Formato de data inválido', 400);
    expect(response).toEqual({ ok: false, error: 'Formato de data inválido', status: 400 });
  });
});
