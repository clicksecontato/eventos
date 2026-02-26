import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { VariavelContrato } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class VariavelContratoSupabaseRepository extends BaseSupabaseRepository<VariavelContrato> {
  constructor() {
    super('variaveis_contrato', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): VariavelContrato {
    return {
      id: row.id,
      userId: row.user_id,
      chave: row.chave,
      label: row.label,
      tipo: row.tipo as 'unica' | 'multipla',
      valorPadrao: row.valor_padrao || undefined,
      descricao: row.descricao || undefined,
      ordem: row.ordem || 0,
      ativo: row.ativo || true,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao),
    };
  }

  protected convertToSupabase(entity: Partial<VariavelContrato>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.chave !== undefined) data.chave = entity.chave;
    if (entity.label !== undefined) data.label = entity.label;
    if (entity.tipo !== undefined) data.tipo = entity.tipo;
    if (entity.valorPadrao !== undefined) data.valor_padrao = entity.valorPadrao || null;
    if (entity.descricao !== undefined) data.descricao = entity.descricao || null;
    if (entity.ordem !== undefined) data.ordem = entity.ordem;
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  async findByUserId(userId: string): Promise<VariavelContrato[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('ordem', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar variáveis de contrato: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findAtivasByUserId(userId: string): Promise<VariavelContrato[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar variáveis ativas de contrato: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findByChave(userId: string, chave: string): Promise<VariavelContrato | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('chave', chave)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar variável por chave: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async create(variavel: Omit<VariavelContrato, 'id'>): Promise<VariavelContrato> {
    const id = generateUUID();

    const variavelWithMeta = {
      ...variavel,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<VariavelContrato, 'id'>;

    const supabaseData = this.convertToSupabase(variavelWithMeta);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar variável de contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async update(id: string, variavel: Partial<VariavelContrato>): Promise<VariavelContrato> {
    const supabaseData = this.convertToSupabase(variavel);
    // Sempre atualizar data_atualizacao
    supabaseData.data_atualizacao = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar variável de contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar variável de contrato: ${error.message}`);
    }
  }
}
