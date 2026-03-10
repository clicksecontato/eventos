import { BaseSupabaseRepository } from './base-supabase-repository';
import { AgendamentoAlocacao, StatusAgendamentoAlocacao } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

export class AgendamentoConflitoHorarioError extends Error {
  constructor(message: string = 'Horário já ocupado para este profissional') {
    super(message);
    this.name = 'AgendamentoConflitoHorarioError';
  }
}

export class AgendamentoAlocacaoSupabaseRepository extends BaseSupabaseRepository<AgendamentoAlocacao> {
  constructor() {
    super('agendamento_alocacoes', undefined, true);
  }

  protected convertFromSupabase(row: any): AgendamentoAlocacao {
    return {
      id: row.id,
      userId: row.user_id,
      empresaId: row.empresa_id,
      eventoId: row.evento_id,
      servicoEventoId: row.servico_evento_id || undefined,
      profissionalId: row.profissional_id,
      inicioTs: new Date(row.inicio_ts),
      fimTs: new Date(row.fim_ts),
      status: row.status,
      observacoes: row.observacoes || undefined,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao)
    };
  }

  protected convertToSupabase(entity: Partial<AgendamentoAlocacao>): any {
    const data: any = {};
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.empresaId !== undefined) data.empresa_id = entity.empresaId;
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId;
    if (entity.servicoEventoId !== undefined) data.servico_evento_id = entity.servicoEventoId || null;
    if (entity.profissionalId !== undefined) data.profissional_id = entity.profissionalId;
    if (entity.inicioTs !== undefined) data.inicio_ts = entity.inicioTs.toISOString();
    if (entity.fimTs !== undefined) data.fim_ts = entity.fimTs.toISOString();
    if (entity.status !== undefined) data.status = entity.status;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao.toISOString();
    return data;
  }

  async findByProfissionalPeriodo(
    userId: string,
    profissionalId: string,
    inicio: Date,
    fim: Date
  ): Promise<AgendamentoAlocacao[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('profissional_id', profissionalId)
      .neq('status', 'cancelado')
      .lt('inicio_ts', fim.toISOString())
      .gt('fim_ts', inicio.toISOString())
      .order('inicio_ts', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar alocações do profissional: ${error.message}`);
    }

    return (data || []).map((row) => this.convertFromSupabase(row));
  }

  async findByEvento(userId: string, eventoId: string): Promise<AgendamentoAlocacao[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .order('inicio_ts', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar alocações do evento: ${error.message}`);
    }

    return (data || []).map((row) => this.convertFromSupabase(row));
  }

  async hasConflito(
    userId: string,
    profissionalId: string,
    inicio: Date,
    fim: Date,
    ignorarAlocacaoId?: string
  ): Promise<boolean> {
    const empresaId = getEmpresaIdPadrao();
    let query = this.supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('profissional_id', profissionalId)
      .neq('status', 'cancelado')
      .lt('inicio_ts', fim.toISOString())
      .gt('fim_ts', inicio.toISOString());

    if (ignorarAlocacaoId) {
      query = query.neq('id', ignorarAlocacaoId);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Erro ao validar conflito de horário: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  async createAlocacao(
    userId: string,
    payload: Omit<AgendamentoAlocacao, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoAlocacao> {
    const agora = new Date();
    const id = generateUUID();
    const supabaseData = this.convertToSupabase({
      ...payload,
      userId,
      empresaId: getEmpresaIdPadrao(),
      dataCadastro: agora,
      dataAtualizacao: agora
    });
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23P01' || `${error.message}`.includes('agendamento_alocacoes_profissional_intervalo_excl')) {
        throw new AgendamentoConflitoHorarioError();
      }
      throw new Error(`Erro ao criar alocação: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateStatusAlocacao(
    id: string,
    userId: string,
    status: StatusAgendamentoAlocacao
  ): Promise<AgendamentoAlocacao> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        status,
        data_atualizacao: new Date().toISOString()
      })
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar status da alocação: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateAlocacao(
    id: string,
    userId: string,
    payload: Partial<Pick<AgendamentoAlocacao, 'profissionalId' | 'inicioTs' | 'fimTs' | 'status' | 'observacoes' | 'servicoEventoId'>>
  ): Promise<AgendamentoAlocacao> {
    const empresaId = getEmpresaIdPadrao();
    const supabaseData = this.convertToSupabase({
      ...payload,
      dataAtualizacao: new Date()
    });

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23P01' || `${error.message}`.includes('agendamento_alocacoes_profissional_intervalo_excl')) {
        throw new AgendamentoConflitoHorarioError();
      }
      throw new Error(`Erro ao atualizar alocação: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }
}
