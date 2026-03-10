import {
  AgendamentoAlocacao,
  AgendamentoBloqueio,
  AgendamentoDisponibilidade,
  AgendamentoProfissional,
  StatusAgendamentoAlocacao
} from '@/types';
import {
  AgendamentoAlocacaoSupabaseRepository,
  AgendamentoConflitoHorarioError
} from '@/lib/repositories/supabase/agendamento-alocacao-supabase-repository';
import { AgendamentoBloqueioSupabaseRepository } from '@/lib/repositories/supabase/agendamento-bloqueio-supabase-repository';
import { AgendamentoDisponibilidadeSupabaseRepository } from '@/lib/repositories/supabase/agendamento-disponibilidade-supabase-repository';
import { AgendamentoProfissionalSupabaseRepository } from '@/lib/repositories/supabase/agendamento-profissional-supabase-repository';

interface DependenciasAgendamentoService {
  profissionalRepo: AgendamentoProfissionalSupabaseRepository;
  disponibilidadeRepo: AgendamentoDisponibilidadeSupabaseRepository;
  bloqueioRepo: AgendamentoBloqueioSupabaseRepository;
  alocacaoRepo: AgendamentoAlocacaoSupabaseRepository;
}

export class AgendamentoService {
  private profissionalRepo: AgendamentoProfissionalSupabaseRepository;
  private disponibilidadeRepo: AgendamentoDisponibilidadeSupabaseRepository;
  private bloqueioRepo: AgendamentoBloqueioSupabaseRepository;
  private alocacaoRepo: AgendamentoAlocacaoSupabaseRepository;

  constructor(deps: DependenciasAgendamentoService) {
    this.profissionalRepo = deps.profissionalRepo;
    this.disponibilidadeRepo = deps.disponibilidadeRepo;
    this.bloqueioRepo = deps.bloqueioRepo;
    this.alocacaoRepo = deps.alocacaoRepo;
  }

  async listarProfissionaisAtivos(userId: string): Promise<AgendamentoProfissional[]> {
    return this.profissionalRepo.getAtivos(userId);
  }

  async listarProfissionais(userId: string): Promise<AgendamentoProfissional[]> {
    return this.profissionalRepo.findAll(userId);
  }

  async criarProfissional(
    userId: string,
    payload: Omit<AgendamentoProfissional, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoProfissional> {
    if (!payload.nome?.trim()) {
      throw new Error('Nome do profissional é obrigatório');
    }

    return this.profissionalRepo.createProfissional(userId, {
      ...payload,
      nome: payload.nome.trim()
    });
  }

  async atualizarProfissional(
    userId: string,
    id: string,
    payload: Partial<Pick<AgendamentoProfissional, 'nome' | 'especialidade' | 'observacoes' | 'ativo'>>
  ): Promise<AgendamentoProfissional> {
    if (payload.nome !== undefined && !payload.nome.trim()) {
      throw new Error('Nome do profissional não pode ficar vazio');
    }

    const sanitized = {
      ...payload,
      ...(payload.nome !== undefined ? { nome: payload.nome.trim() } : {})
    };
    return this.profissionalRepo.updateProfissional(id, userId, sanitized);
  }

  async criarDisponibilidade(
    userId: string,
    payload: Omit<AgendamentoDisponibilidade, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoDisponibilidade> {
    this.validarIntervaloHorario(payload.horaInicio, payload.horaFim);
    if (payload.diaSemana < 0 || payload.diaSemana > 6) {
      throw new Error('Dia da semana inválido');
    }
    return this.disponibilidadeRepo.createDisponibilidade(userId, payload);
  }

  async criarBloqueio(
    userId: string,
    payload: Omit<AgendamentoBloqueio, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoBloqueio> {
    this.validarIntervaloData(payload.inicioTs, payload.fimTs);
    return this.bloqueioRepo.createBloqueio(userId, payload);
  }

  async atualizarDisponibilidade(
    userId: string,
    id: string,
    payload: Partial<Pick<AgendamentoDisponibilidade, 'diaSemana' | 'horaInicio' | 'horaFim' | 'ativo'>>
  ): Promise<AgendamentoDisponibilidade> {
    if (payload.horaInicio && payload.horaFim) {
      this.validarIntervaloHorario(payload.horaInicio, payload.horaFim);
    }
    if (payload.diaSemana !== undefined && (payload.diaSemana < 0 || payload.diaSemana > 6)) {
      throw new Error('Dia da semana inválido');
    }
    return this.disponibilidadeRepo.updateDisponibilidade(id, userId, payload);
  }

  async removerDisponibilidade(userId: string, id: string): Promise<void> {
    return this.disponibilidadeRepo.removeDisponibilidade(id, userId);
  }

  async atualizarBloqueio(
    userId: string,
    id: string,
    payload: Partial<Pick<AgendamentoBloqueio, 'inicioTs' | 'fimTs' | 'motivo'>>
  ): Promise<AgendamentoBloqueio> {
    if (payload.inicioTs && payload.fimTs) {
      this.validarIntervaloData(payload.inicioTs, payload.fimTs);
    }
    return this.bloqueioRepo.updateBloqueio(id, userId, payload);
  }

  async removerBloqueio(userId: string, id: string): Promise<void> {
    return this.bloqueioRepo.removeBloqueio(id, userId);
  }

  async validarConflitoHorario(
    userId: string,
    profissionalId: string,
    inicio: Date,
    fim: Date,
    ignorarAlocacaoId?: string
  ): Promise<{ temConflito: boolean; motivo?: string }> {
    this.validarIntervaloData(inicio, fim);

    const [bloqueios, conflitoAlocacao] = await Promise.all([
      this.bloqueioRepo.findByProfissionalPeriodo(userId, profissionalId, inicio, fim),
      this.alocacaoRepo.hasConflito(userId, profissionalId, inicio, fim, ignorarAlocacaoId)
    ]);

    if (bloqueios.length > 0) {
      return { temConflito: true, motivo: 'Profissional possui bloqueio no período informado' };
    }

    if (conflitoAlocacao) {
      return { temConflito: true, motivo: 'Profissional já possui agendamento no período informado' };
    }

    return { temConflito: false };
  }

  async criarAlocacao(
    userId: string,
    payload: Omit<AgendamentoAlocacao, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoAlocacao> {
    this.validarIntervaloData(payload.inicioTs, payload.fimTs);

    const conflito = await this.validarConflitoHorario(
      userId,
      payload.profissionalId,
      payload.inicioTs,
      payload.fimTs
    );

    if (conflito.temConflito) {
      throw new AgendamentoConflitoHorarioError(conflito.motivo);
    }

    return this.alocacaoRepo.createAlocacao(userId, payload);
  }

  async listarAlocacoesPorEvento(userId: string, eventoId: string): Promise<AgendamentoAlocacao[]> {
    return this.alocacaoRepo.findByEvento(userId, eventoId);
  }

  async atualizarStatusAlocacao(
    userId: string,
    id: string,
    status: StatusAgendamentoAlocacao
  ): Promise<AgendamentoAlocacao> {
    return this.alocacaoRepo.updateStatusAlocacao(id, userId, status);
  }

  async atualizarAlocacao(
    userId: string,
    id: string,
    payload: Partial<Pick<AgendamentoAlocacao, 'profissionalId' | 'inicioTs' | 'fimTs' | 'status' | 'observacoes' | 'servicoEventoId'>>
  ): Promise<AgendamentoAlocacao> {
    if (payload.inicioTs && payload.fimTs) {
      this.validarIntervaloData(payload.inicioTs, payload.fimTs);
    }

    if (payload.profissionalId && payload.inicioTs && payload.fimTs) {
      const conflito = await this.validarConflitoHorario(
        userId,
        payload.profissionalId,
        payload.inicioTs,
        payload.fimTs,
        id
      );

      if (conflito.temConflito) {
        throw new AgendamentoConflitoHorarioError(conflito.motivo);
      }
    }

    return this.alocacaoRepo.updateAlocacao(id, userId, payload);
  }

  async obterDisponibilidadeProfissional(
    userId: string,
    profissionalId: string,
    inicio: Date,
    fim: Date
  ): Promise<{
    alocacoes: AgendamentoAlocacao[];
    bloqueios: AgendamentoBloqueio[];
    disponibilidades: AgendamentoDisponibilidade[];
    disponibilidadesDia: AgendamentoDisponibilidade[];
  }> {
    this.validarIntervaloData(inicio, fim);

    const [alocacoes, bloqueios, disponibilidades] = await Promise.all([
      this.alocacaoRepo.findByProfissionalPeriodo(userId, profissionalId, inicio, fim),
      this.bloqueioRepo.findByProfissionalPeriodo(userId, profissionalId, inicio, fim),
      this.disponibilidadeRepo.findByProfissional(userId, profissionalId)
    ]);

    const diaSemana = inicio.getUTCDay();
    const disponibilidadesDia = disponibilidades.filter((d) => d.diaSemana === diaSemana);

    return {
      alocacoes,
      bloqueios,
      disponibilidades,
      disponibilidadesDia
    };
  }

  private validarIntervaloData(inicio: Date, fim: Date): void {
    if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) {
      throw new Error('Data de início inválida');
    }
    if (!(fim instanceof Date) || Number.isNaN(fim.getTime())) {
      throw new Error('Data de fim inválida');
    }
    if (inicio >= fim) {
      throw new Error('Período inválido: início deve ser menor que fim');
    }
  }

  private validarIntervaloHorario(horaInicio: string, horaFim: string): void {
    if (!horaInicio || !horaFim) {
      throw new Error('Hora de início e fim são obrigatórias');
    }
    if (horaInicio >= horaFim) {
      throw new Error('Intervalo de horário inválido');
    }
  }
}
