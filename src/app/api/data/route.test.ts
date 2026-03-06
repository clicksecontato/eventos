import { GET } from './route';
import { dataService } from '@/lib/data-service';
import { createApiResponse, createErrorResponse, getAuthenticatedUser } from '@/lib/api/route-helpers';

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getAllClientes: vi.fn(),
    getServicosPorEventos: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  createApiResponse: vi.fn((data: unknown) => ({ ok: true, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    });
  });

  it('retorna clientes-all via dataService', async () => {
    vi.mocked(dataService.getAllClientes).mockResolvedValue([{ id: 'c1', nome: 'Cliente 1' }] as never);
    const request = { url: 'http://localhost/api/data?recurso=clientes-all' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllClientes).toHaveBeenCalledWith('user-1');
    expect(createApiResponse).toHaveBeenCalled();
    expect(response).toEqual({ ok: true, data: [{ id: 'c1', nome: 'Cliente 1' }] });
  });

  it('serializa map de servicos-eventos para objeto', async () => {
    const map = new Map<string, Array<{ id: string }>>([
      ['ev-1', [{ id: 's1' }]],
      ['ev-2', [{ id: 's2' }]]
    ]);
    vi.mocked(dataService.getServicosPorEventos).mockResolvedValue(map as never);
    const request = {
      url: 'http://localhost/api/data?recurso=servicos-eventos&eventoIds=ev-1,ev-2'
    } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getServicosPorEventos).toHaveBeenCalledWith('user-1', ['ev-1', 'ev-2']);
    expect(response).toEqual({
      ok: true,
      data: {
        'ev-1': [{ id: 's1' }],
        'ev-2': [{ id: 's2' }]
      }
    });
  });

  it('retorna erro quando recurso é inválido', async () => {
    const request = { url: 'http://localhost/api/data?recurso=nao-existe' } as unknown as Request;

    const response = await GET(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Parâmetro "recurso" inválido', 400);
    expect(response).toEqual({ ok: false, error: 'Parâmetro "recurso" inválido', status: 400 });
  });
});

