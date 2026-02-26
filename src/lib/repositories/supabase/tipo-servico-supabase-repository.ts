import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TipoServico } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class TipoServicoSupabaseRepository extends BaseSupabaseRepository<TipoServico> {
  constructor() {
    super('tipo_servicos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): TipoServico {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      ativo: row.ativo,
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  protected convertToSupabase(entity: Partial<TipoServico>): any {
    const data: any = {};
    
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.descricao !== undefined) data.descricao = entity.descricao || null;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    
    return data;
  }

  async getAtivos(userId: string): Promise<TipoServico[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de serviço ativos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getInativos(userId: string): Promise<TipoServico[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', false)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de serviço inativos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async searchByName(name: string, userId: string): Promise<TipoServico[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .or(`nome.ilike.%${name}%,descricao.ilike.%${name}%`);

    if (error) {
      throw new Error(`Erro ao buscar tipos de serviço: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createTipoServico(tipoServico: Omit<TipoServico, 'id' | 'dataCadastro'>, userId: string): Promise<TipoServico> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const tipoWithMeta = {
      ...tipoServico,
      dataCadastro: new Date()
    } as Omit<TipoServico, 'id'>;

    const supabaseData = this.convertToSupabase(tipoWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar tipo de serviço: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async findAll(userId?: string): Promise<TipoServico[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de serviço');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de serviço: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<TipoServico | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipo de serviço');
    }
    return this.getTipoServicoById(id, userId);
  }

  async getTipoServicoById(id: string, userId: string): Promise<TipoServico | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar tipo de serviço: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async updateTipoServico(id: string, tipoServico: Partial<TipoServico>, userId: string): Promise<TipoServico> {
    const supabaseData = this.convertToSupabase(tipoServico);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar tipo de serviço: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteTipoServico(id: string, userId: string): Promise<void> {
    // Inativação ao invés de exclusão física
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao inativar tipo de serviço: ${error.message}`);
    }
  }

  async reativarTipoServico(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ ativo: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao reativar tipo de serviço: ${error.message}`);
    }
  }
}

