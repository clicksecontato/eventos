import { GET } from './route';
import { dataService } from '@/lib/data-service';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRouteParams
} from '@/lib/api/route-helpers';

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getEventoById: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRouteParams: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/eventos/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
    vi.mocked(getRouteParams).mockResolvedValue({ id: 'ev-1' } as never);
  });

  it('retorna evento quando encontrado', async () => {
    vi.mocked(dataService.getEventoById).mockResolvedValue({
      id: 'ev-1',
      nomeEvento: 'Evento Principal'
    } as never);

    const response = await GET({} as never, { params: Promise.resolve({ id: 'ev-1' }) } as never);

    expect(dataService.getEventoById).toHaveBeenCalledWith('ev-1', 'user-1');
    expect(createApiResponse).toHaveBeenCalledWith({
      id: 'ev-1',
      nomeEvento: 'Evento Principal'
    });
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { id: 'ev-1', nomeEvento: 'Evento Principal' }
    });
  });

  it('retorna 404 quando evento não encontrado', async () => {
    vi.mocked(dataService.getEventoById).mockResolvedValue(null as never);

    const response = await GET({} as never, { params: Promise.resolve({ id: 'ev-404' }) } as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Evento não encontrado', 404);
    expect(response).toEqual({
      ok: false,
      error: 'Evento não encontrado',
      status: 404
    });
  });
});
