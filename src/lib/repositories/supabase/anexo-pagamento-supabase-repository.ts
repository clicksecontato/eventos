import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AnexoPagamento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class AnexoPagamentoSupabaseRepository extends BaseSupabaseRepository<AnexoPagamento> {
  constructor() {
    super('anexos_pagamento', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): AnexoPagamento {
    return {
      id: row.id,
      userId: row.user_id,
      eventoId: row.evento_id,
      pagamentoId: row.pagamento_id,
      nome: row.nome,
      tipo: row.tipo,
      tamanho: parseInt(row.tamanho) || 0,
      s3Key: row.s3_key,
      url: row.url,
      dataUpload: new Date(row.data_upload),
      dataCadastro: new Date(row.data_cadastro),
    };
  }

  protected convertToSupabase(entity: Partial<AnexoPagamento>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId;
    if (entity.pagamentoId !== undefined) data.pagamento_id = entity.pagamentoId;
    if (entity.nome !== undefined) data.nome = entity.nome;
    if (entity.tipo !== undefined) data.tipo = entity.tipo;
    if (entity.tamanho !== undefined) data.tamanho = entity.tamanho;
    if (entity.s3Key !== undefined) data.s3_key = entity.s3Key;
    if (entity.url !== undefined) data.url = entity.url;
    if (entity.dataUpload !== undefined) {
      data.data_upload = entity.dataUpload instanceof Date 
        ? entity.dataUpload.toISOString() 
        : entity.dataUpload;
    }
    if (entity.dataCadastro !== undefined) {
      data.data_cadastro = entity.dataCadastro instanceof Date 
        ? entity.dataCadastro.toISOString() 
        : entity.dataCadastro;
    }
    
    return data;
  }

  async findByPagamentoId(userId: string, eventoId: string, pagamentoId: string): Promise<AnexoPagamento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .eq('pagamento_id', pagamentoId)
      .order('data_upload', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar anexos de pagamento: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async createAnexo(
    userId: string,
    eventoId: string,
    pagamentoId: string,
    anexo: Omit<AnexoPagamento, 'id' | 'dataCadastro'>
  ): Promise<AnexoPagamento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const anexoWithMeta = {
      ...anexo,
      userId,
      eventoId,
      pagamentoId,
      dataCadastro: new Date(),
      dataUpload: anexo.dataUpload || new Date()
    } as Omit<AnexoPagamento, 'id'>;

    const supabaseData = this.convertToSupabase(anexoWithMeta);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar anexo de pagamento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deleteAnexo(userId: string, eventoId: string, pagamentoId: string, anexoId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', anexoId)
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .eq('pagamento_id', pagamentoId);

    if (error) {
      throw new Error(`Erro ao deletar anexo de pagamento: ${error.message}`);
    }
  }

  async getAnexoById(
    userId: string,
    eventoId: string,
    pagamentoId: string,
    anexoId: string
  ): Promise<AnexoPagamento | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', anexoId)
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .eq('pagamento_id', pagamentoId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar anexo de pagamento: ${error.message}`);
    }

    if (!data) return null;

    return this.convertFromSupabase(data);
  }
}

