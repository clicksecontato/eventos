import { POST } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody
} from '@/lib/api/route-helpers';

const createTipoCustoMock = vi.fn();

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getTipoCustoRepository: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRequestBody: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/tipos-custo/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(repositoryFactory.getTipoCustoRepository).mockReturnValue({
      createTipoCusto: createTipoCustoMock
    } as never);
  });

  it('cria tipo de custo com nome normalizado', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      nome: '  Deslocamento  ',
      descricao: '  Transporte ',
      ativo: true
    } as never);
    createTipoCustoMock.mockResolvedValue({ id: 'tc-1' });

    const response = await POST({} as never);

    expect(createTipoCustoMock).toHaveBeenCalledWith(
      {
        nome: 'Deslocamento',
        descricao: 'Transporte',
        ativo: true
      },
      'user-1'
    );
    expect(createApiResponse).toHaveBeenCalledWith({ id: 'tc-1' }, 201);
    expect(response).toEqual({ ok: true, status: 201, data: { id: 'tc-1' } });
  });

  it('retorna 400 quando nome não é informado', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      nome: '   '
    } as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Nome é obrigatório', 400);
    expect(response).toEqual({ ok: false, error: 'Nome é obrigatório', status: 400 });
    expect(createTipoCustoMock).not.toHaveBeenCalled();
  });
});
