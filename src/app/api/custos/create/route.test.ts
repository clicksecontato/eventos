import { POST } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody
} from '@/lib/api/route-helpers';

const createCustoEventoMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getCustoEventoRepository: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRequestBody: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/custos/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(repositoryFactory.getCustoEventoRepository).mockReturnValue({
      createCustoEvento: createCustoEventoMock
    } as never);
  });

  it('cria custo com payload válido', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      eventoId: 'evento-1',
      tipoCustoId: 'tipo-1',
      valor: '120.90',
      quantidade: 2,
      observacoes: 'deslocamento'
    } as never);
    createCustoEventoMock.mockResolvedValue({ id: 'custo-1' });

    const response = await POST({} as never);

    expect(createCustoEventoMock).toHaveBeenCalledWith(
      'user-1',
      'evento-1',
      expect.objectContaining({
        tipoCustoId: 'tipo-1',
        valor: 120.9,
        quantidade: 2
      })
    );
    expect(createApiResponse).toHaveBeenCalledWith({ id: 'custo-1' }, 201);
    expect(response).toEqual({ ok: true, status: 201, data: { id: 'custo-1' } });
  });

  it('retorna erro quando campos obrigatórios não são enviados', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      eventoId: 'evento-1'
    } as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('eventoId, tipoCustoId e valor são obrigatórios', 400);
    expect(response).toEqual({
      ok: false,
      error: 'eventoId, tipoCustoId e valor são obrigatórios',
      status: 400
    });
    expect(createCustoEventoMock).not.toHaveBeenCalled();
  });
});
