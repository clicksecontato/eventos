import { BaseSupabaseRepository } from './base-supabase-repository';
import { AgendamentoBloqueio } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

export class AgendamentoBloqueioSupabaseRepository extends BaseSupabaseRepository<AgendamentoBloqueio> {
  constructor() {
    super('agendamento_bloqueios', undefined, true);
  }

  protected convertFromSupabase(row: any): AgendamentoBloqueio {
    return {
      id: row.id,
      userId: row.user_id,
      empresaId: row.empresa_id,
      profissionalId: row.profissional_id,
      inicioTs: new Date(row.inicio_ts),
      fimTs: new Date(row.fim_ts),
      motivo: row.motivo || undefined,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao)
    };
  }

  protected convertToSupabase(entity: Partial<AgendamentoBloqueio>): any {
    const data: any = {};
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.empresaId !== undefined) data.empresa_id = entity.empresaId;
    if (entity.profissionalId !== undefined) data.profissional_id = entity.profissionalId;
    if (entity.inicioTs !== undefined) data.inicio_ts = entity.inicioTs.toISOString();
    if (entity.fimTs !== undefined) data.fim_ts = entity.fimTs.toISOString();
    if (entity.motivo !== undefined) data.motivo = entity.motivo || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao.toISOString();
    return data;
  }

  async findByProfissionalPeriodo(
    userId: string,
    profissionalId: string,
    inicio: Date,
    fim: Date
  ): Promise<AgendamentoBloqueio[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('profissional_id', profissionalId)
      .lt('inicio_ts', fim.toISOString())
      .gt('fim_ts', inicio.toISOString())
      .order('inicio_ts', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar bloqueios do profissional: ${error.message}`);
    }

    return (data || []).map((row) => this.convertFromSupabase(row));
  }

  async createBloqueio(
    userId: string,
    payload: Omit<AgendamentoBloqueio, 'id' | 'empresaId' | 'userId' | 'dataCadastro' | 'dataAtualizacao'>
  ): Promise<AgendamentoBloqueio> {
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
      throw new Error(`Erro ao criar bloqueio: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateBloqueio(
    id: string,
    userId: string,
    payload: Partial<Pick<AgendamentoBloqueio, 'inicioTs' | 'fimTs' | 'motivo'>>
  ): Promise<AgendamentoBloqueio> {
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
      throw new Error(`Erro ao atualizar bloqueio: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async removeBloqueio(id: string, userId: string): Promise<void> {
    const empresaId = getEmpresaIdPadrao();
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) {
      throw new Error(`Erro ao remover bloqueio: ${error.message}`);
    }
  }
}
