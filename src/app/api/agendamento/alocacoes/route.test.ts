import { GET, POST, PATCH } from './route';
import {
  createApiResponse,
  createErrorResponse,
  getAuthenticatedUser,
  getRequestBody
} from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';
import { AgendamentoConflitoHorarioError } from '@/lib/repositories/supabase/agendamento-alocacao-supabase-repository';

vi.mock('@/lib/data-service', () => ({
  dataService: {
    validarConflitoAgendamento: vi.fn(),
    getAgendamentoAlocacoesPorEvento: vi.fn(),
    createAgendamentoAlocacao: vi.fn(),
    updateAgendamentoAlocacaoStatus: vi.fn(),
    updateAgendamentoAlocacao: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getRequestBody: vi.fn(),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/agendamento/alocacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    } as never);
  });

  it('retorna validação de conflito quando validarConflito=true', async () => {
    vi.mocked(dataService.validarConflitoAgendamento).mockResolvedValue({
      temConflito: true,
      motivo: 'Profissional já possui agendamento no período informado'
    });

    const response = await GET({
      url: 'http://localhost/api/agendamento/alocacoes?validarConflito=true&profissionalId=prof-1&inicio=2026-10-25T13:30:00.000Z&fim=2026-10-25T15:30:00.000Z'
    } as never);

    expect(dataService.validarConflitoAgendamento).toHaveBeenCalledTimes(1);
    expect(createApiResponse).toHaveBeenCalledWith({
      temConflito: true,
      motivo: 'Profissional já possui agendamento no período informado'
    });
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: {
        temConflito: true,
        motivo: 'Profissional já possui agendamento no período informado'
      }
    });
  });

  it('retorna 409 quando cria alocação com conflito de horário', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      eventoId: 'ev-1',
      profissionalId: 'prof-1',
      inicioTs: '2026-10-25T13:30:00.000Z',
      fimTs: '2026-10-25T15:30:00.000Z'
    } as never);
    vi.mocked(dataService.createAgendamentoAlocacao).mockRejectedValue(new AgendamentoConflitoHorarioError());

    const response = await POST({} as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Horário já ocupado para este profissional', 409);
    expect(response).toEqual({
      ok: false,
      error: 'Horário já ocupado para este profissional',
      status: 409
    });
  });

  it('atualiza status da alocação via PATCH simplificado', async () => {
    vi.mocked(getRequestBody).mockResolvedValue({
      id: 'aloc-1',
      status: 'confirmado'
    } as never);
    vi.mocked(dataService.updateAgendamentoAlocacaoStatus).mockResolvedValue({ id: 'aloc-1', status: 'confirmado' } as never);

    const response = await PATCH({} as never);

    expect(dataService.updateAgendamentoAlocacaoStatus).toHaveBeenCalledWith('user-1', 'aloc-1', 'confirmado');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { id: 'aloc-1', status: 'confirmado' }
    });
  });
});
