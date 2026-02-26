import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { CanalEntrada } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class CanalEntradaSupabaseRepository extends BaseSupabaseRepository<CanalEntrada> {
  constructor() {
    super('canais_entrada', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): CanalEntrada {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      ativo: row.ativo,
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  protected convertToSupabase(entity: Partial<CanalEntrada>): any {
    const data: any = {};
    
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.descricao !== undefined) data.descricao = entity.descricao || null;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro.toISOString();
    
    return data;
  }

  async getAtivos(userId: string): Promise<CanalEntrada[]> {
    console.log(`[CanalEntradaSupabaseRepository] Buscando canais ativos para userId: ${userId}`);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      console.error(`[CanalEntradaSupabaseRepository] Erro ao buscar canais ativos:`, error);
      throw new Error(`Erro ao buscar canais de entrada ativos: ${error.message}`);
    }

    console.log(`[CanalEntradaSupabaseRepository] Encontrados ${data?.length || 0} canais ativos`);
    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async getInativos(userId: string): Promise<CanalEntrada[]> {
    console.log(`[CanalEntradaSupabaseRepository] Buscando canais inativos para userId: ${userId}`);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', false)
      .order('nome', { ascending: true });

    if (error) {
      console.error(`[CanalEntradaSupabaseRepository] Erro ao buscar canais inativos:`, error);
      throw new Error(`Erro ao buscar canais de entrada inativos: ${error.message}`);
    }

    console.log(`[CanalEntradaSupabaseRepository] Encontrados ${data?.length || 0} canais inativos`);
    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async searchByName(userId: string, searchTerm: string): Promise<CanalEntrada[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .ilike('nome', `%${searchTerm}%`);

    if (error) {
      throw new Error(`Erro ao buscar canais de entrada: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createCanalEntrada(userId: string, canal: Omit<CanalEntrada, 'id'>): Promise<CanalEntrada> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const canalWithMeta = {
      ...canal,
      dataCadastro: new Date()
    } as Omit<CanalEntrada, 'id'>;

    const supabaseData = this.convertToSupabase(canalWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar canal de entrada: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async getCanalEntradaById(userId: string, id: string): Promise<CanalEntrada | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar canal de entrada: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async findAll(userId?: string): Promise<CanalEntrada[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar canais de entrada');
    }
    
    console.log(`[CanalEntradaSupabaseRepository] Buscando todos os canais para userId: ${userId}`);
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    if (error) {
      console.error(`[CanalEntradaSupabaseRepository] Erro ao buscar todos os canais:`, error);
      throw new Error(`Erro ao buscar canais de entrada: ${error.message}`);
    }

    console.log(`[CanalEntradaSupabaseRepository] Encontrados ${data?.length || 0} canais no total`);
    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<CanalEntrada | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar canal de entrada');
    }
    return this.getCanalEntradaById(userId, id);
  }

  async updateCanalEntrada(userId: string, canalId: string, canal: Partial<CanalEntrada>): Promise<CanalEntrada> {
    const supabaseData = this.convertToSupabase(canal);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', canalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar canal de entrada: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteCanalEntrada(userId: string, canalId: string): Promise<void> {
    // Inativação ao invés de exclusão física
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ ativo: false })
      .eq('id', canalId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao inativar canal de entrada: ${error.message}`);
    }
  }

  async reativarCanalEntrada(userId: string, canalId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ ativo: true })
      .eq('id', canalId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao reativar canal de entrada: ${error.message}`);
    }
  }
}

