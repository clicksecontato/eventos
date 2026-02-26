import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { CustoEvento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class CustoSupabaseRepository extends BaseSupabaseRepository<CustoEvento> {
  constructor() {
    super('custos', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): CustoEvento {
    return {
      id: row.id,
      eventoId: row.evento_id,
      tipoCustoId: row.tipo_custo_id,
      valor: parseFloat(row.valor) || 0,
      quantidade: row.quantidade || 1,
      observacoes: row.observacoes,
      removido: row.removido || false,
      dataRemocao: row.data_remocao ? new Date(row.data_remocao) : undefined,
      motivoRemocao: row.motivo_remocao,
      dataCadastro: new Date(row.data_cadastro),
      // Relacionamentos serão carregados separadamente
      evento: {} as any,
      tipoCusto: {} as any,
    };
  }

  protected convertToSupabase(entity: Partial<CustoEvento>): any {
    const data: any = {};
    
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId;
    if (entity.tipoCustoId !== undefined) data.tipo_custo_id = entity.tipoCustoId;
    if (entity.valor !== undefined) data.valor = entity.valor;
    if (entity.quantidade !== undefined) data.quantidade = entity.quantidade || 1;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.removido !== undefined) data.removido = entity.removido;
    if (entity.dataRemocao !== undefined) data.data_remocao = entity.dataRemocao instanceof Date ? entity.dataRemocao.toISOString() : entity.dataRemocao || null;
    if (entity.motivoRemocao !== undefined) data.motivo_remocao = entity.motivoRemocao || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    
    return data;
  }

  async findByEventoId(userId: string, eventoId: string): Promise<CustoEvento[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_custos(*)')
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .eq('removido', false) // Filtrar apenas custos não removidos
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar custos: ${error.message}`);
    }

    return (data || []).map(row => {
      const custo = this.convertFromSupabase(row);
      
      // Popular tipo de custo se disponível
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.tipo_custos) {
        custo.tipoCusto = {
          id: rowData.tipo_custos.id,
          nome: rowData.tipo_custos.nome,
          descricao: rowData.tipo_custos.descricao,
          ativo: rowData.tipo_custos.ativo,
          dataCadastro: new Date(rowData.tipo_custos.data_cadastro),
        };
      }
      
      return custo;
    });
  }

  async createCusto(userId: string, eventoId: string, custo: Omit<CustoEvento, 'id' | 'dataCadastro'>): Promise<CustoEvento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const custoWithMeta = {
      ...custo,
      eventoId,
      dataCadastro: new Date()
    } as Omit<CustoEvento, 'id'>;

    const supabaseData = this.convertToSupabase(custoWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select('*, tipo_custos(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar custo: ${error.message}`);
    }

    const custoCriado = this.convertFromSupabase(data);
    
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.tipo_custos) {
      custoCriado.tipoCusto = {
        id: dataRow.tipo_custos.id,
        nome: dataRow.tipo_custos.nome,
        descricao: dataRow.tipo_custos.descricao,
        ativo: dataRow.tipo_custos.ativo,
        dataCadastro: new Date(dataRow.tipo_custos.data_cadastro),
      };
    }

    return custoCriado;
  }

  async updateCusto(userId: string, eventoId: string, custoId: string, custo: Partial<CustoEvento>): Promise<CustoEvento> {
    const supabaseData = this.convertToSupabase(custo);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', custoId)
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .select('*, tipo_custos(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar custo: ${error.message}`);
    }

    const custoAtualizado = this.convertFromSupabase(data);
    
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.tipo_custos) {
      custoAtualizado.tipoCusto = {
        id: dataRow.tipo_custos.id,
        nome: dataRow.tipo_custos.nome,
        descricao: dataRow.tipo_custos.descricao,
        ativo: dataRow.tipo_custos.ativo,
        dataCadastro: new Date(dataRow.tipo_custos.data_cadastro),
      };
    }

    return custoAtualizado;
  }

  async deleteCusto(userId: string, eventoId: string, custoId: string): Promise<void> {
    console.log('[CustoSupabaseRepository] Excluindo custo:', { userId, eventoId, custoId });
    
    const updateData = {
      removido: true,
      dataRemocao: new Date()
    };
    
    console.log('[CustoSupabaseRepository] Dados de atualização:', updateData);
    
    const supabaseData = this.convertToSupabase(updateData);
    console.log('[CustoSupabaseRepository] Dados convertidos para Supabase:', supabaseData);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', custoId)
      .eq('user_id', userId)
      .eq('evento_id', eventoId)
      .select()
      .single();

    if (error) {
      console.error('[CustoSupabaseRepository] Erro ao excluir custo:', error);
      throw new Error(`Erro ao excluir custo: ${error.message}`);
    }

    console.log('[CustoSupabaseRepository] Custo excluído com sucesso:', data);
  }

  async findAll(userId?: string): Promise<CustoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar custos');
    }
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_custos(*)')
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar custos: ${error.message}`);
    }

    return (data || []).map(row => {
      const custo = this.convertFromSupabase(row);
      
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.tipo_custos) {
        custo.tipoCusto = {
          id: rowData.tipo_custos.id,
          nome: rowData.tipo_custos.nome,
          descricao: rowData.tipo_custos.descricao,
          ativo: rowData.tipo_custos.ativo,
          dataCadastro: new Date(rowData.tipo_custos.data_cadastro),
        };
      }
      
      return custo;
    });
  }

  async findById(id: string, userId?: string): Promise<CustoEvento | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar custo');
    }
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_custos(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar custo: ${error.message}`);
    }

    if (!data) return null;

    const custo = this.convertFromSupabase(data);
    
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.tipo_custos) {
      custo.tipoCusto = {
        id: dataRow.tipo_custos.id,
        nome: dataRow.tipo_custos.nome,
        descricao: dataRow.tipo_custos.descricao,
        ativo: dataRow.tipo_custos.ativo,
        dataCadastro: new Date(dataRow.tipo_custos.data_cadastro),
      };
    }

    return custo;
  }

  // Métodos de compatibilidade com a interface do Firebase
  async createCustoEvento(userId: string, eventoId: string, custo: Omit<CustoEvento, 'id'>): Promise<CustoEvento> {
    // Remove dataCadastro do custo se existir, pois será adicionado automaticamente
    const { dataCadastro, ...custoWithoutDataCadastro } = custo as any;
    return this.createCusto(userId, eventoId, custoWithoutDataCadastro);
  }

  async updateCustoEvento(userId: string, eventoId: string, custoId: string, custo: Partial<CustoEvento>): Promise<CustoEvento> {
    return this.updateCusto(userId, eventoId, custoId, custo);
  }

  async deleteCustoEvento(userId: string, eventoId: string, custoId: string): Promise<void> {
    return this.deleteCusto(userId, eventoId, custoId);
  }

  async getTotalCustosPorEvento(userId: string, eventoId: string): Promise<number> {
    const custos = await this.findByEventoId(userId, eventoId);
    // Filtrar custos removidos nos cálculos
    return custos
      .filter(custo => !custo.removido)
      .reduce((total, custo) => total + (custo.valor * (custo.quantidade || 1)), 0);
  }

  async getResumoCustosPorEvento(userId: string, eventoId: string): Promise<{
    custos: CustoEvento[];
    total: number;
    porCategoria: Record<string, number>;
    quantidadeItens: number;
  }> {
    const custos = await this.findByEventoId(userId, eventoId);
    // Filtrar custos removidos nos cálculos
    const custosAtivos = custos.filter(custo => !custo.removido);
    const total = custosAtivos.reduce((sum, custo) => sum + (custo.valor * (custo.quantidade || 1)), 0);
    
    const porCategoria: Record<string, number> = {};
    custosAtivos.forEach(custo => {
      const tipoNome = custo.tipoCusto?.nome || 'Sem tipo';
      porCategoria[tipoNome] = (porCategoria[tipoNome] || 0) + (custo.valor * (custo.quantidade || 1));
    });

    return {
      custos: custos, // Retornar todos (incluindo removidos) para histórico, mas calcular apenas ativos
      total,
      porCategoria,
      quantidadeItens: custosAtivos.length
    };
  }
}

