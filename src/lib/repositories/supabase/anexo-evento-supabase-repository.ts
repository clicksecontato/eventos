import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AnexoEvento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class AnexoEventoSupabaseRepository extends BaseSupabaseRepository<AnexoEvento> {
  constructor() {
    super('anexos_eventos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): AnexoEvento {
    const anexo: AnexoEvento = {
      id: row.id,
      eventoId: row.evento_id,
      nome: row.nome,
      tipo: row.tipo as 'PDF' | 'Imagem' | 'Documento' | 'Outro',
      url: row.url,
      tamanho: parseInt(row.tamanho) || 0,
      dataUpload: new Date(row.data_upload),
      // Relacionamentos serão carregados separadamente
      evento: {} as any,
    };
    
    // Adicionar s3Key se existir na tabela (campo opcional)
    if (row.s3_key) {
      (anexo as any).s3Key = row.s3_key;
    }
    
    return anexo;
  }

  protected convertToSupabase(entity: Partial<AnexoEvento & { s3Key?: string }>): any {
    const data: any = {};
    
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId;
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.tipo !== undefined) data.tipo = entity.tipo;
    if (entity.url !== undefined) data.url = entity.url;
    if (entity.tamanho !== undefined) data.tamanho = entity.tamanho;
    if (entity.dataUpload !== undefined) {
      data.data_upload = entity.dataUpload instanceof Date 
        ? entity.dataUpload.toISOString() 
        : entity.dataUpload;
    }
    // Adicionar s3_key se existir (pode não estar na tabela ainda)
    if ((entity as any).s3Key !== undefined) {
      data.s3_key = (entity as any).s3Key;
    }
    
    return data;
  }

  async findByEventoId(eventoId: string): Promise<AnexoEvento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('evento_id', eventoId)
      .order('data_upload', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar anexos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createAnexo(anexo: Omit<AnexoEvento, 'id' | 'evento'>): Promise<AnexoEvento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const anexoWithMeta = {
      ...anexo,
      dataUpload: anexo.dataUpload || new Date()
    } as Omit<AnexoEvento, 'id' | 'evento'>;

    const supabaseData = this.convertToSupabase(anexoWithMeta);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar anexo: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteAnexo(anexoId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', anexoId);

    if (error) {
      throw new Error(`Erro ao deletar anexo: ${error.message}`);
    }
  }

  async getAnexoById(anexoId: string): Promise<AnexoEvento | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', anexoId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar anexo: ${error.message}`);
    }

    if (!data) return null;

    return this.convertFromSupabase(data);
  }

  // Método auxiliar para obter s3Key de um anexo
  async getS3Key(anexoId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('s3_key')
      .eq('id', anexoId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar s3_key: ${error.message}`);
    }

    // Type assertion necessário porque o Supabase não infere o tipo corretamente para select específico
    const row = data as any;
    return row?.s3_key || null;
  }

  // Método para atualizar apenas o s3_key de um anexo
  async updateS3Key(anexoId: string, s3Key: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ s3_key: s3Key })
      .eq('id', anexoId);

    if (error) {
      throw new Error(`Erro ao atualizar s3_key: ${error.message}`);
    }
  }
}

