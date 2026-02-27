import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ModeloContrato, CampoContrato } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

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
      userId: row.user_id || undefined, // Mantido para auditoria de criação
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
    if (entity.userId !== undefined) data.user_id = entity.userId || null; // Auditoria de criação
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  /**
   * Busca modelos ativos do sistema (escopo por empresa)
   */
  async findAtivos(): Promise<ModeloContrato[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', getEmpresaIdPadrao())
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar modelos de contrato ativos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  /**
   * Busca todos os modelos do sistema (escopo por empresa)
   */
  async findAll(): Promise<ModeloContrato[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', getEmpresaIdPadrao())
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar modelos de contrato: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string): Promise<ModeloContrato | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('empresa_id', getEmpresaIdPadrao())
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
    supabaseData.empresa_id = getEmpresaIdPadrao();

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
      .eq('empresa_id', getEmpresaIdPadrao())
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
      .eq('id', id)
      .eq('empresa_id', getEmpresaIdPadrao());

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
