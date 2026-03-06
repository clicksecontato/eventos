import { GET, POST } from './route';
import { createRepositoriosAdminBasicos } from '@/lib/composition/server-assinatura-context';
import { createApiResponse, requireAdminOrPremium } from '@/lib/api/route-helpers';

const findAllOrderedMock = vi.fn();
const findAllMock = vi.fn();
const createMock = vi.fn();

vi.mock('@/lib/composition/server-assinatura-context', () => ({
  createRepositoriosAdminBasicos: vi.fn()
}));

vi.mock('@/lib/api/route-helpers', async () => {
  return {
    requireAdminOrPremium: vi.fn(),
    createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
    handleApiError: vi.fn((error: unknown) => ({ ok: false, error })),
    getRequestBody: vi.fn(async (request: Request) => request.json())
  };
});

describe('API /api/funcionalidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminOrPremium).mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(createRepositoriosAdminBasicos).mockResolvedValue({
      funcionalidadeRepo: {
        findAllOrdered: findAllOrderedMock,
        findAll: findAllMock,
        create: createMock
      }
    } as never);
  });

  it('usa findAllOrdered no GET quando disponível', async () => {
    findAllOrderedMock.mockResolvedValue([{ id: 'f1', nome: 'Func 1' }]);

    const response = await GET();

    expect(findAllOrderedMock).toHaveBeenCalledTimes(1);
    expect(findAllMock).not.toHaveBeenCalled();
    expect(createApiResponse).toHaveBeenCalledWith({
      funcionalidades: [{ id: 'f1', nome: 'Func 1' }],
      count: 1
    });
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { funcionalidades: [{ id: 'f1', nome: 'Func 1' }], count: 1 }
    });
  });

  it('faz fallback para findAll quando findAllOrdered falha', async () => {
    findAllOrderedMock.mockRejectedValue(new Error('sem índice'));
    findAllMock.mockResolvedValue([{ id: 'f2', nome: 'Func 2' }]);

    await GET();

    expect(findAllOrderedMock).toHaveBeenCalledTimes(1);
    expect(findAllMock).toHaveBeenCalledTimes(1);
  });

  it('cria funcionalidade no POST com dataCadastro', async () => {
    createMock.mockImplementation(async (payload: Record<string, unknown>) => payload);
    const request = new Request('http://localhost/api/funcionalidades', {
      method: 'POST',
      body: JSON.stringify({
        codigo: 'RELATORIOS_FULL',
        nome: 'Relatórios Full',
        descricao: 'desc',
        categoria: 'RELATORIOS',
        ativo: true,
        ordem: 22
      }),
      headers: { 'content-type': 'application/json' }
    });

    const response = await POST(request as never);

    expect(createMock).toHaveBeenCalledTimes(1);
    const payload = createMock.mock.calls[0][0] as { dataCadastro?: unknown; codigo?: string };
    expect(payload.codigo).toBe('RELATORIOS_FULL');
    expect(payload.dataCadastro).toBeInstanceOf(Date);
    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        status: 201
      })
    );
  });
});

