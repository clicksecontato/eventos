import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Contrato } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class ContratoSupabaseRepository extends BaseSupabaseRepository<Contrato> {
  constructor() {
    super('contratos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): Contrato {
    // Função auxiliar para converter data de forma segura
    const parseDate = (dateValue: any): Date => {
      if (!dateValue) return new Date();
      if (dateValue instanceof Date) return dateValue;
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    return {
      id: row.id,
      userId: row.user_id,
      eventoId: row.evento_id || undefined,
      modeloContratoId: row.modelo_contrato_id,
      dadosPreenchidos: row.dados_preenchidos || {},
      conteudoHtml: row.conteudo_html || undefined,
      status: row.status as Contrato['status'],
      pdfUrl: row.pdf_url || undefined,
      pdfPath: row.pdf_path || undefined,
      numeroContrato: row.numero_contrato || undefined,
      dataGeracao: row.data_geracao ? parseDate(row.data_geracao) : new Date(),
      dataAssinatura: row.data_assinatura ? parseDate(row.data_assinatura) : undefined,
      assinadoPor: row.assinado_por || undefined,
      observacoes: row.observacoes || undefined,
      dataCadastro: parseDate(row.data_cadastro),
      dataAtualizacao: parseDate(row.data_atualizacao),
      criadoPor: row.criado_por,
    };
  }

  protected convertToSupabase(entity: Partial<Contrato>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId || null;
    if (entity.modeloContratoId !== undefined) data.modelo_contrato_id = entity.modeloContratoId;
    if (entity.dadosPreenchidos !== undefined) data.dados_preenchidos = entity.dadosPreenchidos || {};
    if (entity.conteudoHtml !== undefined) data.conteudo_html = entity.conteudoHtml || null;
    if (entity.status !== undefined) data.status = entity.status;
    if (entity.pdfUrl !== undefined) data.pdf_url = entity.pdfUrl || null;
    if (entity.pdfPath !== undefined) data.pdf_path = entity.pdfPath || null;
    if (entity.numeroContrato !== undefined) data.numero_contrato = entity.numeroContrato || null;
    if (entity.dataGeracao !== undefined) data.data_geracao = entity.dataGeracao instanceof Date ? entity.dataGeracao.toISOString() : entity.dataGeracao;
    if (entity.dataAssinatura !== undefined) data.data_assinatura = entity.dataAssinatura instanceof Date ? entity.dataAssinatura.toISOString() : entity.dataAssinatura || null;
    if (entity.assinadoPor !== undefined) data.assinado_por = entity.assinadoPor || null;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    if (entity.criadoPor !== undefined) data.criado_por = entity.criadoPor;
    
    return data;
  }

  async create(contrato: Omit<Contrato, 'id'>): Promise<Contrato> {
    // Extrair userId do objeto contrato (já está incluído)
    if (!contrato.userId) {
      throw new Error('userId é obrigatório para criar contrato');
    }

    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const contratoWithMeta = {
      ...contrato,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<Contrato, 'id'>;

    const supabaseData = this.convertToSupabase(contratoWithMeta);
    supabaseData.id = id; // Assign generated ID

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async findAll(userId?: string): Promise<Contrato[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar contratos');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar contratos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findByEventoId(eventoId: string, userId: string): Promise<Contrato[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar contratos por evento: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async gerarNumeroContrato(userId: string): Promise<string> {
    const ano = new Date().getFullYear();
    
    // Buscar contratos do ano atual ordenados por número
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('numero_contrato')
      .eq('user_id', userId)
      .like('numero_contrato', `CON-${ano}-%`)
      .order('numero_contrato', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Erro ao buscar último número de contrato:', error);
      // Continuar mesmo com erro
    }

    let proximoNumero = 1;
    if (data && data.length > 0) {
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const row = data[0] as any;
      if (row.numero_contrato) {
        const ultimoNumero = row.numero_contrato;
        const partes = ultimoNumero.split('-');
        if (partes.length === 3) {
          proximoNumero = parseInt(partes[2]) + 1;
        }
      }
    }

    return `CON-${ano}-${proximoNumero.toString().padStart(3, '0')}`;
  }

  async contarPorStatus(userId: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao contar contratos por status: ${error.message}`);
    }

    const contagem: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const status = row.status || 'rascunho';
      contagem[status] = (contagem[status] || 0) + 1;
    });

    return contagem;
  }

  async update(id: string, contrato: Partial<Contrato>): Promise<Contrato> {
    // Extrair userId do objeto contrato ou buscar do banco
    let userId: string | undefined = contrato.userId;
    
    // Se não tiver userId no objeto, buscar do registro existente
    if (!userId) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Contrato não encontrado');
      }
      userId = existing.userId;
    }

    if (!userId) {
      throw new Error('userId é obrigatório para atualizar contrato');
    }

    const supabaseData = this.convertToSupabase(contrato);
    // Sempre atualizar data_atualizacao
    supabaseData.data_atualizacao = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar contrato: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async findById(id: string, userId?: string): Promise<Contrato | null> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar contrato: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }
}


