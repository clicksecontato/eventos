import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Contrato } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

/** Colunas que podem não existir em bancos antigos; PostgREST acusa "schema cache" se faltarem. */
const COLUNAS_CONTRATOS_OPCIONAIS_SCHEMA = new Set([
  'assinatura_auditoria',
  'pdf_path_original',
  'conteudo_html',
]);

function colunaContratosAusenteNoSchemaCache(mensagem: string): string | null {
  const m = /Could not find the '([^']+)' column of 'contratos'/i.exec(mensagem);
  return m?.[1] ?? null;
}

function removerColunaOpcionalDoPayload(
  payload: Record<string, unknown>,
  colunaDb: string
): boolean {
  if (!COLUNAS_CONTRATOS_OPCIONAIS_SCHEMA.has(colunaDb)) {
    return false;
  }
  if (!(colunaDb in payload)) {
    return false;
  }
  delete payload[colunaDb];
  return true;
}

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
      pdfPathOriginal: row.pdf_path_original || undefined,
      assinaturaAuditoria: row.assinatura_auditoria || undefined,
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
    // Importante: não enviar a coluna quando vier undefined.
    // Se o schema do Supabase ainda não tiver a coluna (ou cache estiver desatualizado),
    // enviar `conteudo_html: null` causa erro "Could not find the 'conteudo_html' column".
    if (typeof entity.conteudoHtml === 'string') {
      const v = entity.conteudoHtml.trim();
      data.conteudo_html = v ? v : null;
    }
    if (entity.status !== undefined) data.status = entity.status;
    if (entity.pdfUrl !== undefined) data.pdf_url = entity.pdfUrl || null;
    if (entity.pdfPath !== undefined) data.pdf_path = entity.pdfPath || null;
    if (typeof entity.pdfPathOriginal === 'string') data.pdf_path_original = entity.pdfPathOriginal || null;
    if (entity.assinaturaAuditoria !== undefined && entity.assinaturaAuditoria !== null) {
      data.assinatura_auditoria = entity.assinaturaAuditoria;
    }
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
    supabaseData.empresa_id = getEmpresaIdPadrao();

    let payloadInsert: Record<string, unknown> = supabaseData;
    const maxTentativas = 6;
    for (let t = 0; t < maxTentativas; t++) {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(payloadInsert)
        .select()
        .single();

      if (!error) {
        return this.convertFromSupabase(data);
      }

      const col = colunaContratosAusenteNoSchemaCache(error.message);
      if (col && removerColunaOpcionalDoPayload(payloadInsert, col)) {
        console.warn(
          `[ContratoSupabaseRepository] insert: coluna '${col}' ausente no schema/cache; repetindo sem ela. ` +
            'Aplique as migrations em supabase/migrations e execute NOTIFY pgrst, \'reload schema\'; no SQL editor.'
        );
        continue;
      }

      throw new Error(`Erro ao criar contrato: ${error.message}`);
    }

    throw new Error('Erro ao criar contrato: excedeu tentativas ao contornar colunas opcionais.');
  }

  async findAll(userId?: string): Promise<Contrato[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar contratos');
    }
    
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar contratos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findByEventoId(eventoId: string, userId: string): Promise<Contrato[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar contratos por evento: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async gerarNumeroContrato(userId: string): Promise<string> {
    const ano = new Date().getFullYear();
    const empresaId = getEmpresaIdPadrao();
    
    // Buscar contratos do ano atual ordenados por número
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('numero_contrato')
      .eq('empresa_id', empresaId)
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
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('status')
      .eq('empresa_id', empresaId);

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

    let supabaseData: Record<string, unknown> = this.convertToSupabase(contrato);
    // Sempre atualizar data_atualizacao
    supabaseData.data_atualizacao = new Date().toISOString();

    const empresaId = getEmpresaIdPadrao();
    const maxTentativas = 6;
    for (let t = 0; t < maxTentativas; t++) {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(supabaseData)
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select()
        .single();

      if (!error) {
        return this.convertFromSupabase(data);
      }

      const col = colunaContratosAusenteNoSchemaCache(error.message);
      if (col && removerColunaOpcionalDoPayload(supabaseData, col)) {
        console.warn(
          `[ContratoSupabaseRepository] update: coluna '${col}' ausente no schema/cache; repetindo sem ela. ` +
            'Aplique supabase/migrations (ex.: assinatura interna + conteudo_html) e NOTIFY pgrst, \'reload schema\';'
        );
        continue;
      }

      throw new Error(`Erro ao atualizar contrato: ${error.message}`);
    }

    throw new Error('Erro ao atualizar contrato: excedeu tentativas ao contornar colunas opcionais.');
  }

  async findById(id: string, userId?: string): Promise<Contrato | null> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    query = query.eq('empresa_id', getEmpresaIdPadrao());

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar contrato: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }
}


