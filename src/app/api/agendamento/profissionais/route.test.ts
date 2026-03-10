import { GET, PATCH, POST } from './route';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody
} from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getAgendamentoProfissionais: vi.fn(),
    getAgendamentoProfissionaisAtivos: vi.fn(),
    createAgendamentoProfissional: vi.fn(),
    updateAgendamentoProfissional: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRequestBody: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/agendamento/profissionais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
  });

  it('lista profissionais ativos por padrão no GET', async () => {
    vi.mocked(dataService.getAgendamentoProfissionaisAtivos).mockResolvedValue([{ id: 'prof-1' }] as never);

    const response = await GET({
      url: 'http://localhost/api/agendamento/profissionais'
    } as never);

    expect(dataService.getAgendamentoProfissionaisAtivos).toHaveBeenCalledWith('user-1');
    expect(dataService.getAgendamentoProfissionais).not.toHaveBeenCalled();
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: [{ id: 'prof-1' }]
    });
  });

  it('retorna erro 400 no POST quando nome estiver vazio', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({ nome: '   ' } as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Nome do profissional é obrigatório', 400);
    expect(response).toEqual({
      ok: false,
      error: 'Nome do profissional é obrigatório',
      status: 400
    });
  });

  it('atualiza profissional no PATCH quando id for informado', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      id: 'prof-1',
      nome: 'Dra. Clarice'
    } as never);
    vi.mocked(dataService.updateAgendamentoProfissional).mockResolvedValue({
      id: 'prof-1',
      nome: 'Dra. Clarice'
    } as never);

    const response = await PATCH({} as never);

    expect(dataService.updateAgendamentoProfissional).toHaveBeenCalledWith('user-1', 'prof-1', {
      nome: 'Dra. Clarice',
      especialidade: undefined,
      observacoes: undefined,
      ativo: undefined
    });
    expect(createApiResponse).toHaveBeenCalledWith({ id: 'prof-1', nome: 'Dra. Clarice' });
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { id: 'prof-1', nome: 'Dra. Clarice' }
    });
  });
});

