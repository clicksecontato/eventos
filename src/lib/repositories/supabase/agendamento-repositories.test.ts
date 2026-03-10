import { AgendamentoAlocacaoSupabaseRepository, AgendamentoConflitoHorarioError } from './agendamento-alocacao-supabase-repository';
import { AgendamentoBloqueioSupabaseRepository } from './agendamento-bloqueio-supabase-repository';
import { AgendamentoDisponibilidadeSupabaseRepository } from './agendamento-disponibilidade-supabase-repository';
import { AgendamentoProfissionalSupabaseRepository } from './agendamento-profissional-supabase-repository';

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn()
}));

vi.mock('@/lib/tenant-config', () => ({
  getEmpresaIdPadrao: vi.fn(() => 'empresa-1')
}));

vi.mock('@/lib/utils/uuid', () => ({
  generateUUID: vi.fn(() => 'uuid-fixo')
}));

function createSupabaseMock(result: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    order: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: any) => void) => resolve(result)
  };

  return {
    from: vi.fn(() => chain),
    chain
  };
}

describe('Repositórios de agendamento (Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('profissionalRepo.getAtivos retorna dados convertidos', async () => {
    const supabaseMock = createSupabaseMock({
      data: [{
        id: 'prof-1',
        user_id: 'user-1',
        empresa_id: 'empresa-1',
        nome: 'Dra. Clarice',
        especialidade: 'Dermato',
        observacoes: null,
        ativo: true,
        data_cadastro: '2026-01-01T10:00:00.000Z',
        data_atualizacao: '2026-01-01T10:00:00.000Z'
      }],
      error: null
    });
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValue(supabaseMock as never);

    const repo = new AgendamentoProfissionalSupabaseRepository();
    const resultado = await repo.getAtivos('user-1');

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(expect.objectContaining({
      id: 'prof-1',
      nome: 'Dra. Clarice'
    }));
  });

  it('disponibilidadeRepo.findByProfissional aplica filtros e retorna itens', async () => {
    const supabaseMock = createSupabaseMock({
      data: [{
        id: 'disp-1',
        user_id: 'user-1',
        empresa_id: 'empresa-1',
        profissional_id: 'prof-1',
        dia_semana: 1,
        hora_inicio: '09:00',
        hora_fim: '12:00',
        ativo: true,
        data_cadastro: '2026-01-01T10:00:00.000Z',
        data_atualizacao: '2026-01-01T10:00:00.000Z'
      }],
      error: null
    });
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValue(supabaseMock as never);

    const repo = new AgendamentoDisponibilidadeSupabaseRepository();
    const resultado = await repo.findByProfissional('user-1', 'prof-1');

    expect(resultado).toHaveLength(1);
    expect(supabaseMock.chain.eq).toHaveBeenCalledWith('profissional_id', 'prof-1');
    expect(supabaseMock.chain.eq).toHaveBeenCalledWith('ativo', true);
  });

  it('bloqueioRepo.findByProfissionalPeriodo filtra por interseção de período', async () => {
    const supabaseMock = createSupabaseMock({
      data: [{
        id: 'bloq-1',
        user_id: 'user-1',
        empresa_id: 'empresa-1',
        profissional_id: 'prof-1',
        inicio_ts: '2026-10-25T13:30:00.000Z',
        fim_ts: '2026-10-25T15:30:00.000Z',
        motivo: 'Almoço',
        data_cadastro: '2026-01-01T10:00:00.000Z',
        data_atualizacao: '2026-01-01T10:00:00.000Z'
      }],
      error: null
    });
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValue(supabaseMock as never);

    const repo = new AgendamentoBloqueioSupabaseRepository();
    const resultado = await repo.findByProfissionalPeriodo(
      'user-1',
      'prof-1',
      new Date('2026-10-25T13:00:00.000Z'),
      new Date('2026-10-25T16:00:00.000Z')
    );

    expect(resultado).toHaveLength(1);
    expect(supabaseMock.chain.lt).toHaveBeenCalled();
    expect(supabaseMock.chain.gt).toHaveBeenCalled();
  });

  it('alocacaoRepo.createAlocacao converte erro de exclusão para AgendamentoConflitoHorarioError', async () => {
    const supabaseMock = createSupabaseMock({
      data: null,
      error: {
        code: '23P01',
        message: 'agendamento_alocacoes_profissional_intervalo_excl'
      }
    });
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    vi.mocked(getSupabaseClient).mockReturnValue(supabaseMock as never);

    const repo = new AgendamentoAlocacaoSupabaseRepository();

    await expect(
      repo.createAlocacao('user-1', {
        eventoId: 'ev-1',
        profissionalId: 'prof-1',
        inicioTs: new Date('2026-10-25T13:30:00.000Z'),
        fimTs: new Date('2026-10-25T15:30:00.000Z'),
        status: 'agendado',
        observacoes: undefined,
        servicoEventoId: undefined
      })
    ).rejects.toBeInstanceOf(AgendamentoConflitoHorarioError);
  });
});

