import { AgendamentoService } from './agendamento-service';
import { AgendamentoConflitoHorarioError } from '@/lib/repositories/supabase/agendamento-alocacao-supabase-repository';

describe('AgendamentoService', () => {
  const profissionalRepo = {
    getAtivos: vi.fn(),
    findAll: vi.fn(),
    createProfissional: vi.fn(),
    updateProfissional: vi.fn()
  };

  const disponibilidadeRepo = {
    createDisponibilidade: vi.fn(),
    findByProfissional: vi.fn()
  };

  const bloqueioRepo = {
    createBloqueio: vi.fn(),
    findByProfissionalPeriodo: vi.fn()
  };

  const alocacaoRepo = {
    hasConflito: vi.fn(),
    createAlocacao: vi.fn(),
    findByEvento: vi.fn(),
    updateStatusAlocacao: vi.fn(),
    updateAlocacao: vi.fn(),
    findByProfissionalPeriodo: vi.fn()
  };

  const criarService = () =>
    new AgendamentoService({
      profissionalRepo: profissionalRepo as never,
      disponibilidadeRepo: disponibilidadeRepo as never,
      bloqueioRepo: bloqueioRepo as never,
      alocacaoRepo: alocacaoRepo as never
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria profissional com nome trimado', async () => {
    const service = criarService();
    profissionalRepo.createProfissional.mockResolvedValue({ id: 'prof-1', nome: 'Dra. Clarice' });

    await service.criarProfissional('user-1', {
      nome: '  Dra. Clarice  ',
      especialidade: 'Dermato',
      observacoes: undefined,
      ativo: true
    });

    expect(profissionalRepo.createProfissional).toHaveBeenCalledWith('user-1', expect.objectContaining({
      nome: 'Dra. Clarice'
    }));
  });

  it('retorna conflito quando existe bloqueio no período', async () => {
    const service = criarService();
    bloqueioRepo.findByProfissionalPeriodo.mockResolvedValue([{ id: 'bloq-1' }]);
    alocacaoRepo.hasConflito.mockResolvedValue(false);

    const resultado = await service.validarConflitoHorario(
      'user-1',
      'prof-1',
      new Date('2026-10-25T13:30:00Z'),
      new Date('2026-10-25T15:30:00Z')
    );

    expect(resultado).toEqual({
      temConflito: true,
      motivo: 'Profissional possui bloqueio no período informado'
    });
  });

  it('lança erro de conflito ao criar alocação com horário ocupado', async () => {
    const service = criarService();
    bloqueioRepo.findByProfissionalPeriodo.mockResolvedValue([]);
    alocacaoRepo.hasConflito.mockResolvedValue(true);

    await expect(
      service.criarAlocacao('user-1', {
        eventoId: 'ev-1',
        profissionalId: 'prof-1',
        inicioTs: new Date('2026-10-25T13:30:00Z'),
        fimTs: new Date('2026-10-25T15:30:00Z'),
        status: 'agendado',
        observacoes: undefined,
        servicoEventoId: undefined
      })
    ).rejects.toBeInstanceOf(AgendamentoConflitoHorarioError);
  });

  it('obterDisponibilidadeProfissional filtra disponibilidades pelo dia da semana', async () => {
    const service = criarService();
    alocacaoRepo.findByProfissionalPeriodo.mockResolvedValue([{ id: 'aloc-1' }]);
    bloqueioRepo.findByProfissionalPeriodo.mockResolvedValue([{ id: 'bloq-1' }]);
    disponibilidadeRepo.findByProfissional.mockResolvedValue([
      { id: 'd1', diaSemana: 0, horaInicio: '09:00', horaFim: '12:00' },
      { id: 'd2', diaSemana: 1, horaInicio: '09:00', horaFim: '12:00' }
    ]);

    const resultado = await service.obterDisponibilidadeProfissional(
      'user-1',
      'prof-1',
      new Date('2026-10-25T00:00:00Z'),
      new Date('2026-10-25T23:59:59Z')
    );

    expect(resultado.alocacoes).toHaveLength(1);
    expect(resultado.bloqueios).toHaveLength(1);
    expect(resultado.disponibilidadesDia).toEqual([
      expect.objectContaining({ id: 'd1', diaSemana: 0 })
    ]);
  });
});

