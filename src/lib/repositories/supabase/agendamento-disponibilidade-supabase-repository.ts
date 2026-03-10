import { BaseSupabaseRepository } from './base-supabase-repository';
import { AgendamentoDisponibilidade } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

export class AgendamentoDisponibilidadeSupabaseRepository extends BaseSupabaseRepository<AgendamentoDisponibilidade> {
  constructor() {
    super('agendamento_disponibilidades', undefined, true);
  }

  protected convertFromSupabase(row: any): AgendamentoDisponibilidade {
    return {
      id: row.id,
      userId: row.user_id,
      empresaId: row.empresa_id,
      profissionalId: row.profissional_id,
      diaSemana: row.dia_semana,
      horaInicio: row.hora_inicio,
      horaFim: row.hora_fim,
      ativo: row.ativo,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao)
    };
  }

  protected convertToSupabase(entity: Partial<AgendamentoDisponibilidade>): any {
    const data: any = {};
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.empresaId !== undefined) data.empresa_id = entity.empresaId;
    if (entity.profissionalId !== undefined) data.profissional_id = entity.profissionalId;
    if (entity.diaSemana !== undefined) data.dia_semana = entity.diaSemana;
    if (entity.horaInicio !== undefined) data.hora_inicio = entity.horaInicio;
    if (entity.horaFim !== undefined) data.hora_fim = entity.horaFim;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao.toISOString();
    return data;
  }

  async findByProfissional(userId: string, profissionalId: string): Promise<AgendamentoDisponibilidade[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('profissional_id', profissionalId)
      .eq('ativo', true)
      .order('dia_semana', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar disponibilidades: ${error.message}`);
    }

    return (data || []).map((row) => this.convertFromSupabase(row));
  }

  async createDisponibilidade(
    userId: string,
    payload: Omit<AgendamentoDisponibilidade, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoDisponibilidade> {
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
      throw new Error(`Erro ao criar disponibilidade: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async removeDisponibilidade(id: string, userId: string): Promise<void> {
    const empresaId = getEmpresaIdPadrao();
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      throw new Error(`Erro ao remover disponibilidade: ${error.message}`);
    }
  }

  async updateDisponibilidade(
    id: string,
    userId: string,
    payload: Partial<Pick<AgendamentoDisponibilidade, 'diaSemana' | 'horaInicio' | 'horaFim' | 'ativo'>>
  ): Promise<AgendamentoDisponibilidade> {
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
      throw new Error(`Erro ao atualizar disponibilidade: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }
}
