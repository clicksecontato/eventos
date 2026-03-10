import { DELETE, GET, PATCH, POST } from './route';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody
} from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getDisponibilidadeAgendamentoProfissional: vi.fn(),
    createAgendamentoDisponibilidade: vi.fn(),
    createAgendamentoBloqueio: vi.fn(),
    updateAgendamentoDisponibilidade: vi.fn(),
    updateAgendamentoBloqueio: vi.fn(),
    deleteAgendamentoDisponibilidade: vi.fn(),
    deleteAgendamentoBloqueio: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRequestBody: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/agendamento/disponibilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
  });

  it('retorna 400 no GET quando faltar parâmetros obrigatórios', async () => {
    const response = await GET({
      url: 'http://localhost/api/agendamento/disponibilidade?profissionalId=prof-1'
    } as never);

    expect(createErrorResponse).toHaveBeenCalledWith('profissionalId, inicio e fim são obrigatórios', 400);
    expect(response).toEqual({
      ok: false,
      error: 'profissionalId, inicio e fim são obrigatórios',
      status: 400
    });
  });

  it('cria disponibilidade no POST quando tipo=disponibilidade', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      tipo: 'disponibilidade',
      profissionalId: 'prof-1',
      diaSemana: '2',
      horaInicio: '09:00',
      horaFim: '12:00'
    } as never);
    vi.mocked(dataService.createAgendamentoDisponibilidade).mockResolvedValue({
      id: 'disp-1',
      profissionalId: 'prof-1'
    } as never);

    const response = await POST({} as never);

    expect(dataService.createAgendamentoDisponibilidade).toHaveBeenCalledWith('user-1', {
      profissionalId: 'prof-1',
      diaSemana: 2,
      horaInicio: '09:00',
      horaFim: '12:00',
      ativo: true
    });
    expect(response).toEqual({
      ok: true,
      status: 201,
      data: { id: 'disp-1', profissionalId: 'prof-1' }
    });
  });

  it('retorna 400 quando tipo for inválido no POST', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      tipo: 'qualquer-coisa'
    } as never);

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('tipo inválido. Use "disponibilidade" ou "bloqueio"', 400);
    expect(response).toEqual({
      ok: false,
      error: 'tipo inválido. Use "disponibilidade" ou "bloqueio"',
      status: 400
    });
  });

  it('atualiza disponibilidade no PATCH', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      tipo: 'disponibilidade',
      id: 'disp-1',
      diaSemana: 3,
      horaInicio: '10:00',
      horaFim: '12:00',
      ativo: true
    } as never);
    vi.mocked(dataService.updateAgendamentoDisponibilidade).mockResolvedValue({ id: 'disp-1' } as never);

    const response = await PATCH({} as never);

    expect(dataService.updateAgendamentoDisponibilidade).toHaveBeenCalledWith('user-1', 'disp-1', {
      diaSemana: 3,
      horaInicio: '10:00',
      horaFim: '12:00',
      ativo: true
    });
    expect(response).toEqual({ ok: true, status: 200, data: { id: 'disp-1' } });
  });

  it('remove bloqueio no DELETE', async () => {
    vi.mocked(dataService.deleteAgendamentoBloqueio).mockResolvedValue(undefined as never);

    const response = await DELETE({
      url: 'http://localhost/api/agendamento/disponibilidade?tipo=bloqueio&id=bloq-1'
    } as never);

    expect(dataService.deleteAgendamentoBloqueio).toHaveBeenCalledWith('user-1', 'bloq-1');
    expect(response).toEqual({ ok: true, status: 200, data: { sucesso: true } });
  });
});

