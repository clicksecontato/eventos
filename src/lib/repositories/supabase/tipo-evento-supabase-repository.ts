import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { TipoEvento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class TipoEventoSupabaseRepository extends BaseSupabaseRepository<TipoEvento> {
  constructor() {
    super('tipo_eventos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): TipoEvento {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      ativo: row.ativo,
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  protected convertToSupabase(entity: Partial<TipoEvento>): any {
    const data: any = {};
    
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.descricao !== undefined) data.descricao = entity.descricao || null;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    
    return data;
  }

  async findByNome(nome: string, userId: string): Promise<TipoEvento | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('nome', nome)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar tipo de evento: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async getAtivos(userId: string): Promise<TipoEvento[]> {
    return this.query(
      [{ field: 'user_id', operator: '==', value: userId }, { field: 'ativo', operator: '==', value: true }],
      { field: 'nome', direction: 'asc' }
    );
  }

  async searchByName(name: string, userId: string): Promise<TipoEvento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .or(`nome.ilike.%${name}%,descricao.ilike.%${name}%`);

    if (error) {
      throw new Error(`Erro ao buscar tipos de evento: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createTipoEvento(tipoEvento: Omit<TipoEvento, 'id'>, userId: string): Promise<TipoEvento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const tipoWithMeta = {
      ...tipoEvento,
      dataCadastro: new Date()
    } as Omit<TipoEvento, 'id'>;

    const supabaseData = this.convertToSupabase(tipoWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar tipo de evento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updateTipoEvento(id: string, tipoEvento: Partial<TipoEvento>, userId: string): Promise<TipoEvento> {
    const supabaseData = this.convertToSupabase(tipoEvento);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar tipo de evento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteTipoEvento(id: string, userId: string): Promise<void> {
    await this.updateTipoEvento(id, { ativo: false }, userId);
  }

  async reativarTipoEvento(id: string, userId: string): Promise<void> {
    await this.updateTipoEvento(id, { ativo: true }, userId);
  }

  async getInativos(userId: string): Promise<TipoEvento[]> {
    return this.query(
      [{ field: 'user_id', operator: '==', value: userId }, { field: 'ativo', operator: '==', value: false }],
      { field: 'nome', direction: 'asc' }
    );
  }

  async getTipoEventoById(id: string, userId: string): Promise<TipoEvento | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar tipo de evento: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async findAll(userId?: string): Promise<TipoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de evento');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar tipos de evento: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<TipoEvento | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipo de evento');
    }
    return this.getTipoEventoById(id, userId);
  }
}

