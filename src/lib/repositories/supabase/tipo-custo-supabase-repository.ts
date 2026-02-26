import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TipoCusto } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class TipoCustoSupabaseRepository extends BaseSupabaseRepository<TipoCusto> {
  constructor() {
    super('tipo_custos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): TipoCusto {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      ativo: row.ativo,
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  protected convertToSupabase(entity: Partial<TipoCusto>): any {
    const data: any = {};
    
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.descricao !== undefined) data.descricao = entity.descricao || null;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    
    return data;
  }

  async getAtivos(userId: string): Promise<TipoCusto[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de custo ativos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getInativos(userId: string): Promise<TipoCusto[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', false)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de custo inativos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async searchByName(name: string, userId: string): Promise<TipoCusto[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .or(`nome.ilike.%${name}%,descricao.ilike.%${name}%`);

    if (error) {
      throw new Error(`Erro ao buscar tipos de custo: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createTipoCusto(tipoCusto: Omit<TipoCusto, 'id' | 'dataCadastro'>, userId: string): Promise<TipoCusto> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const tipoWithMeta = {
      ...tipoCusto,
      dataCadastro: new Date()
    } as Omit<TipoCusto, 'id'>;

    const supabaseData = this.convertToSupabase(tipoWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar tipo de custo: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async findAll(userId?: string): Promise<TipoCusto[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de custo');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de custo: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<TipoCusto | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipo de custo');
    }
    return this.getTipoCustoById(id, userId);
  }

  async getTipoCustoById(id: string, userId: string): Promise<TipoCusto | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar tipo de custo: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async updateTipoCusto(id: string, tipoCusto: Partial<TipoCusto>, userId: string): Promise<TipoCusto> {
    const supabaseData = this.convertToSupabase(tipoCusto);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar tipo de custo: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteTipoCusto(id: string, userId: string): Promise<void> {
    // Inativação ao invés de exclusão física
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao inativar tipo de custo: ${error.message}`);
    }
  }

  async reativarTipoCusto(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ ativo: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao reativar tipo de custo: ${error.message}`);
    }
  }
}

