import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Pagamento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class PagamentoSupabaseRepository extends BaseSupabaseRepository<Pagamento> {
  constructor() {
    super('pagamentos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): Pagamento {
    return {
      id: row.id,
      userId: row.user_id,
      eventoId: row.evento_id,
      valor: parseFloat(row.valor) || 0,
      dataPagamento: new Date(row.data_pagamento),
      formaPagamento: row.forma_pagamento as Pagamento['formaPagamento'],
      status: row.status as Pagamento['status'],
      observacoes: row.observacoes,
      comprovante: row.comprovante,
      anexoId: row.anexo_id,
      cancelado: row.cancelado || false,
      dataCancelamento: row.data_cancelamento ? new Date(row.data_cancelamento) : undefined,
      motivoCancelamento: row.motivo_cancelamento,
      dataCadastro: new Date(row.data_cadastro),
      dataAtualizacao: new Date(row.data_atualizacao),
    };
  }

  protected convertToSupabase(entity: Partial<Pagamento>): any {
    const data: any = {};
    
    if (entity.userId !== undefined) data.user_id = entity.userId;
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId;
    if (entity.valor !== undefined) data.valor = entity.valor;
    if (entity.dataPagamento !== undefined) data.data_pagamento = entity.dataPagamento instanceof Date ? entity.dataPagamento.toISOString() : entity.dataPagamento;
    if (entity.formaPagamento !== undefined) data.forma_pagamento = entity.formaPagamento;
    if (entity.status !== undefined) data.status = entity.status;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.comprovante !== undefined) data.comprovante = entity.comprovante || null;
    if (entity.anexoId !== undefined) data.anexo_id = entity.anexoId || null;
    if (entity.cancelado !== undefined) data.cancelado = entity.cancelado;
    if (entity.dataCancelamento !== undefined) data.data_cancelamento = entity.dataCancelamento instanceof Date ? entity.dataCancelamento.toISOString() : entity.dataCancelamento || null;
    if (entity.motivoCancelamento !== undefined) data.motivo_cancelamento = entity.motivoCancelamento || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    if (entity.dataAtualizacao !== undefined) data.data_atualizacao = entity.dataAtualizacao instanceof Date ? entity.dataAtualizacao.toISOString() : entity.dataAtualizacao;
    
    return data;
  }

  async createPagamento(userId: string, eventoId: string, pagamento: Omit<Pagamento, 'id'>): Promise<Pagamento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const pagamentoWithMeta = {
      ...pagamento,
      userId,
      eventoId,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Omit<Pagamento, 'id'>;

    const supabaseData = this.convertToSupabase(pagamentoWithMeta);
    supabaseData.id = id;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar pagamento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async updatePagamento(userId: string, eventoId: string, pagamentoId: string, pagamento: Partial<Pagamento>): Promise<Pagamento> {
    const supabaseData = this.convertToSupabase(pagamento);
    // Sempre atualizar data_atualizacao
    supabaseData.data_atualizacao = new Date().toISOString();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', pagamentoId)
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar pagamento: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  async deletePagamento(userId: string, eventoId: string, pagamentoId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', pagamentoId)
      .eq('user_id', userId)
      .eq('evento_id', eventoId);

    if (error) {
      throw new Error(`Erro ao excluir pagamento: ${error.message}`);
    }
  }

  async findByEventoId(userId: string, eventoId: string): Promise<Pagamento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .order('data_pagamento', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findByStatus(userId: string, eventoId: string, status: string): Promise<Pagamento[]> {
    return this.query(
      [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'evento_id', operator: '==', value: eventoId },
        { field: 'status', operator: '==', value: status }
      ],
      { field: 'data_pagamento', direction: 'desc' }
    );
  }

  async findByFormaPagamento(userId: string, eventoId: string, formaPagamento: string): Promise<Pagamento[]> {
    return this.query(
      [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'evento_id', operator: '==', value: eventoId },
        { field: 'forma_pagamento', operator: '==', value: formaPagamento }
      ],
      { field: 'data_pagamento', direction: 'desc' }
    );
  }

  async findByDataPagamento(userId: string, eventoId: string, dataInicio: Date, dataFim: Date): Promise<Pagamento[]> {
    return this.query(
      [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'evento_id', operator: '==', value: eventoId },
        { field: 'data_pagamento', operator: '>=', value: dataInicio.toISOString() },
        { field: 'data_pagamento', operator: '<=', value: dataFim.toISOString() }
      ],
      { field: 'data_pagamento', direction: 'desc' }
    );
  }

  async getPagamentosPorMes(userId: string, eventoId: string, mes: number, ano: number): Promise<Pagamento[]> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
    
    return this.findByDataPagamento(userId, eventoId, inicioMes, fimMes);
  }

  async getPagamentosPendentes(userId: string, eventoId: string): Promise<Pagamento[]> {
    return this.query(
      [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'evento_id', operator: '==', value: eventoId },
        { field: 'status', operator: '!=', value: 'Pago' },
        { field: 'cancelado', operator: '==', value: false }
      ],
      { field: 'data_pagamento', direction: 'desc' }
    );
  }

  async getTotalRecebidoPorPeriodo(userId: string, eventoId: string, inicio: Date, fim: Date): Promise<number> {
    const pagamentos = await this.findByDataPagamento(userId, eventoId, inicio, fim);
    return pagamentos
      .filter(p => p.status === 'Pago' && !p.cancelado)
      .reduce((total, pagamento) => total + pagamento.valor, 0);
  }

  async getResumoFinanceiroPorEvento(
    userId: string,
    eventoId: string,
    valorTotalEvento: number,
    dataFinalPagamento?: Date
  ): Promise<{
    totalPago: number;
    valorPendente: number;
    valorAtrasado: number;
    quantidadePagamentos: number;
    isAtrasado: boolean;
  }> {
    const pagamentos = await this.findByEventoId(userId, eventoId);
    
    const totalPago = pagamentos
      .filter(p => p.status === 'Pago' && !p.cancelado)
      .reduce((total, p) => total + p.valor, 0);
    
    const valorPendente = valorTotalEvento - totalPago;
    const hoje = new Date();
    
    if (!dataFinalPagamento) {
      return {
        totalPago,
        valorPendente,
        valorAtrasado: 0,
        quantidadePagamentos: pagamentos.length,
        isAtrasado: false
      };
    }
    
    const isAtrasado = hoje > dataFinalPagamento && valorPendente > 0;
    const pagamentosAtivos = pagamentos.filter(p => !p.cancelado);
    
    return {
      totalPago,
      valorPendente: isAtrasado ? 0 : valorPendente,
      valorAtrasado: isAtrasado ? valorPendente : 0,
      quantidadePagamentos: pagamentosAtivos.length,
      isAtrasado
    };
  }

  async findAll(userId?: string): Promise<Pagamento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar pagamentos');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_pagamento', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  async findById(id: string, userId?: string): Promise<Pagamento | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar pagamento');
    }
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar pagamento: ${error.message}`);
    }

    return data ? this.convertFromSupabase(data) : null;
  }
}

