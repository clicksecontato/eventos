import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ModeloContrato, CampoContrato } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class ModeloContratoSupabaseRepository extends BaseSupabaseRepository<ModeloContrato> {
  constructor() {
    super('modelos_contrato', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): ModeloContrato {
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao || undefined,
      template: row.template,
      campos: (row.campos || []) as CampoContrato[],
      ativo: row.ativo || true,
      userId: row.user_id || undefined, // NULL = modelo global, preenchido = template privado
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao),
    };
  }

  protected convertToSupabase(entity: Partial<ModeloContrato>): any {
    const data: any = {};
    
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.descricao !== undefined) data.descricao = entity.descricao || null;
    if (entity.template !== undefined) data.template = entity.template;
    if (entity.campos !== undefined) data.campos = entity.campos || [];
    if (entity.ativo !== undefined) data.ativo = entity.ativo;
    if (entity.userId !== undefined) data.user_id = entity.userId || null; // NULL = global, preenchido = privado
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  /**
   * Busca modelos ativos: globais (user_id IS NULL) + modelos do usuário especificado
   * @param userId - ID do usuário. Se fornecido, retorna modelos globais + modelos do usuário
   */
  async findAtivos(userId?: string): Promise<ModeloContrato[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('ativo', true);

    if (userId) {
      // Retornar modelos globais (user_id IS NULL) + modelos do usuário
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      // Se não fornecer userId, retornar apenas modelos globais
      query = query.is('user_id', null);
    }

    query = query.order('nome', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar modelos de contrato ativos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  /**
   * Busca todos os modelos: globais (user_id IS NULL) + modelos do usuário especificado
   * @param userId - ID do usuário. Se fornecido, retorna modelos globais + modelos do usuário
   */
  async findAll(userId?: string): Promise<ModeloContrato[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*');

    if (userId) {
      // Retornar modelos globais (user_id IS NULL) + modelos do usuário
      query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
      // Se não fornecer userId, retornar apenas modelos globais
      query = query.is('user_id', null);
    }

    query = query.order('nome', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar modelos de contrato: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  /**
   * Busca apenas templates privados do usuário (não inclui globais)
   */
  async findByUserId(userId: string): Promise<ModeloContrato[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar templates do usuário: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string): Promise<ModeloContrato | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar modelo de contrato: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }

  async create(modelo: Omit<ModeloContrato, 'id'>): Promise<ModeloContrato> {
    const id = generateUUID();

    const modeloWithMeta = {
      ...modelo,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<ModeloContrato, 'id'>;

    const supabaseData = this.convertToSupabase(modeloWithMeta);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar modelo de contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async update(id: string, modelo: Partial<ModeloContrato>): Promise<ModeloContrato> {
    const supabaseData = this.convertToSupabase(modelo);
    // Sempre atualizar data_atualizacao
    supabaseData.data_atualizacao = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar modelo de contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar modelo de contrato: ${error.message}`);
    }
  }

  validarTemplate(template: string, campos: CampoContrato[]): { valido: boolean; erros: string[] } {
    const erros: string[] = [];
    const placeholders = template.match(/\{\{(\w+)\}\}/g) || [];
    const chavesCampos = new Set(campos.map(c => c.chave));
    
    placeholders.forEach(placeholder => {
      const chave = placeholder.replace(/\{\{|\}\}/g, '');
      if (!chavesCampos.has(chave)) {
        erros.push(`Placeholder '${chave}' não encontrado nos campos do modelo`);
      }
    });

    return {
      valido: erros.length === 0,
      erros
    };
  }
}
