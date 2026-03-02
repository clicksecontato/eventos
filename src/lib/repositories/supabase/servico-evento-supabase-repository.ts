import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { HistoricoServicoEvento, ServicoEvento } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { getEmpresaIdPadrao } from '@/lib/tenant-config';

export class ServicoEventoSupabaseRepository extends BaseSupabaseRepository<ServicoEvento> {
  constructor() {
    super('servicos_evento', undefined, true); // Usar service role para bypassar RLS
  }

  protected convertFromSupabase(row: any): ServicoEvento {
    const quantidade = row.quantidade ?? 1;
    const valorUnitario = row.valor_unitario !== null && row.valor_unitario !== undefined
      ? parseFloat(row.valor_unitario)
      : 0;

    return {
      id: row.id,
      eventoId: row.evento_id,
      tipoServicoId: row.tipo_servico_id,
      quantidade,
      valorUnitario,
      valorTotalItem: row.valor_total_item !== null && row.valor_total_item !== undefined
        ? parseFloat(row.valor_total_item)
        : quantidade * valorUnitario,
      origemPreco: row.origem_preco || 'padrao',
      motivoAjuste: row.motivo_ajuste || undefined,
      observacoes: row.observacoes,
      removido: row.removido || false,
      dataRemocao: row.data_remocao ? new Date(row.data_remocao) : undefined,
      motivoRemocao: row.motivo_remocao,
      dataCadastro: new Date(row.data_cadastro),
      // Relacionamentos serão carregados separadamente
      tipoServico: {} as any,
    };
  }

  protected convertToSupabase(entity: Partial<ServicoEvento>): any {
    const data: any = {};
    
    if (entity.eventoId !== undefined) data.evento_id = entity.eventoId;
    if (entity.tipoServicoId !== undefined) data.tipo_servico_id = entity.tipoServicoId;
    if (entity.quantidade !== undefined) data.quantidade = entity.quantidade;
    if (entity.valorUnitario !== undefined) data.valor_unitario = entity.valorUnitario;
    if (entity.valorTotalItem !== undefined) data.valor_total_item = entity.valorTotalItem;
    if (entity.origemPreco !== undefined) data.origem_preco = entity.origemPreco;
    if (entity.motivoAjuste !== undefined) data.motivo_ajuste = entity.motivoAjuste || null;
    if (entity.observacoes !== undefined) data.observacoes = entity.observacoes || null;
    if (entity.removido !== undefined) data.removido = entity.removido;
    if (entity.dataRemocao !== undefined) data.data_remocao = entity.dataRemocao instanceof Date ? entity.dataRemocao.toISOString() : entity.dataRemocao || null;
    if (entity.motivoRemocao !== undefined) data.motivo_remocao = entity.motivoRemocao || null;
    if (entity.dataCadastro !== undefined) data.data_cadastro = entity.dataCadastro instanceof Date ? entity.dataCadastro.toISOString() : entity.dataCadastro;
    
    return data;
  }

  async findByEventoId(userId: string, eventoId: string): Promise<ServicoEvento[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_servicos(*)')
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .eq('removido', false)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar serviços: ${error.message}`);
    }

    return (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      // Popular tipo de serviço se disponível
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.tipo_servicos) {
        servico.tipoServico = {
          id: rowData.tipo_servicos.id,
          nome: rowData.tipo_servicos.nome,
          descricao: rowData.tipo_servicos.descricao,
          valorPadrao: rowData.tipo_servicos.valor_padrao !== null && rowData.tipo_servicos.valor_padrao !== undefined
            ? parseFloat(rowData.tipo_servicos.valor_padrao)
            : 0,
          ativo: rowData.tipo_servicos.ativo,
          dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
        };
      }
      
      return servico;
    });
  }

  async createServicoEvento(userId: string, eventoId: string, servico: Omit<ServicoEvento, 'id' | 'dataCadastro'>): Promise<ServicoEvento> {
    // Gerar ID único - necessário porque Supabase não gera IDs automaticamente
    const id = generateUUID();

    const servicoWithMeta = {
      ...servico,
      eventoId,
      dataCadastro: new Date()
    } as Omit<ServicoEvento, 'id'>;

    const supabaseData = this.convertToSupabase(servicoWithMeta);
    supabaseData.id = id;
    supabaseData.user_id = userId;
    supabaseData.empresa_id = getEmpresaIdPadrao();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(supabaseData)
      .select('*, tipo_servicos(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao criar serviço: ${error.message}`);
    }

    const servicoCriado = this.convertFromSupabase(data);
    
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.tipo_servicos) {
      servicoCriado.tipoServico = {
        id: dataRow.tipo_servicos.id,
        nome: dataRow.tipo_servicos.nome,
        descricao: dataRow.tipo_servicos.descricao,
        valorPadrao: dataRow.tipo_servicos.valor_padrao !== null && dataRow.tipo_servicos.valor_padrao !== undefined
          ? parseFloat(dataRow.tipo_servicos.valor_padrao)
          : 0,
        ativo: dataRow.tipo_servicos.ativo,
        dataCadastro: new Date(dataRow.tipo_servicos.data_cadastro),
      };
    }

    return servicoCriado;
  }

  async updateServicoEvento(userId: string, eventoId: string, servicoId: string, servico: Partial<ServicoEvento>): Promise<ServicoEvento> {
    const empresaId = getEmpresaIdPadrao();
    const supabaseData = this.convertToSupabase(servico);
    const { data: anteriorData } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', servicoId)
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .maybeSingle();
    const anterior = anteriorData as any;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(supabaseData)
      .eq('id', servicoId)
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .select('*, tipo_servicos(*)')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar serviço: ${error.message}`);
    }

    const servicoAtualizado = this.convertFromSupabase(data);
    
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.tipo_servicos) {
      servicoAtualizado.tipoServico = {
        id: dataRow.tipo_servicos.id,
        nome: dataRow.tipo_servicos.nome,
        descricao: dataRow.tipo_servicos.descricao,
        valorPadrao: dataRow.tipo_servicos.valor_padrao !== null && dataRow.tipo_servicos.valor_padrao !== undefined
          ? parseFloat(dataRow.tipo_servicos.valor_padrao)
          : 0,
        ativo: dataRow.tipo_servicos.ativo,
        dataCadastro: new Date(dataRow.tipo_servicos.data_cadastro),
      };
    }

    if (anterior) {
      const quantidadeAnterior = anterior.quantidade ?? 1;
      const quantidadeNova = dataRow.quantidade ?? quantidadeAnterior;
      const valorUnitarioAnterior = anterior.valor_unitario !== null && anterior.valor_unitario !== undefined
        ? parseFloat(anterior.valor_unitario)
        : 0;
      const valorUnitarioNovo = dataRow.valor_unitario !== null && dataRow.valor_unitario !== undefined
        ? parseFloat(dataRow.valor_unitario)
        : valorUnitarioAnterior;
      const totalAnterior = anterior.valor_total_item !== null && anterior.valor_total_item !== undefined
        ? parseFloat(anterior.valor_total_item)
        : quantidadeAnterior * valorUnitarioAnterior;
      const totalNovo = dataRow.valor_total_item !== null && dataRow.valor_total_item !== undefined
        ? parseFloat(dataRow.valor_total_item)
        : quantidadeNova * valorUnitarioNovo;

      const houveMudancaFinanceira =
        quantidadeAnterior !== quantidadeNova ||
        valorUnitarioAnterior !== valorUnitarioNovo ||
        totalAnterior !== totalNovo;

      if (houveMudancaFinanceira) {
        try {
          await this.supabase.from('servicos_evento_historico').insert({
            empresa_id: empresaId,
            evento_id: eventoId,
            servico_evento_id: servicoId,
            user_id: userId,
            valor_unitario_anterior: valorUnitarioAnterior,
            valor_unitario_novo: valorUnitarioNovo,
            quantidade_anterior: quantidadeAnterior,
            quantidade_nova: quantidadeNova,
            valor_total_item_anterior: totalAnterior,
            valor_total_item_novo: totalNovo,
            motivo_ajuste: dataRow.motivo_ajuste || anterior.motivo_ajuste || null
          });
        } catch {
          // Histórico é complementar; não deve bloquear o fluxo principal.
        }
      }
    }

    return servicoAtualizado;
  }

  async deleteServicoEvento(userId: string, eventoId: string, servicoId: string): Promise<void> {
    await this.updateServicoEvento(userId, eventoId, servicoId, {
      removido: true,
      dataRemocao: new Date()
    });
  }

  async findAll(userId?: string): Promise<ServicoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar serviços');
    }
    
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_servicos(*)')
      .eq('empresa_id', empresaId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar serviços: ${error.message}`);
    }

    return (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.tipo_servicos) {
        servico.tipoServico = {
          id: rowData.tipo_servicos.id,
          nome: rowData.tipo_servicos.nome,
          descricao: rowData.tipo_servicos.descricao,
          valorPadrao: rowData.tipo_servicos.valor_padrao !== null && rowData.tipo_servicos.valor_padrao !== undefined
            ? parseFloat(rowData.tipo_servicos.valor_padrao)
            : 0,
          ativo: rowData.tipo_servicos.ativo,
          dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
        };
      }
      
      return servico;
    });
  }

  async findById(id: string, userId?: string): Promise<ServicoEvento | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar serviço');
    }
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_servicos(*)')
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar serviço: ${error.message}`);
    }

    if (!data) return null;

    const servico = this.convertFromSupabase(data);
    
    // Type assertion para resolver problema de inferência de tipos do Supabase
    const dataRow = data as any;
    if (dataRow.tipo_servicos) {
      servico.tipoServico = {
        id: dataRow.tipo_servicos.id,
        nome: dataRow.tipo_servicos.nome,
        descricao: dataRow.tipo_servicos.descricao,
        valorPadrao: dataRow.tipo_servicos.valor_padrao !== null && dataRow.tipo_servicos.valor_padrao !== undefined
          ? parseFloat(dataRow.tipo_servicos.valor_padrao)
          : 0,
        ativo: dataRow.tipo_servicos.ativo,
        dataCadastro: new Date(dataRow.tipo_servicos.data_cadastro),
      };
    }

    return servico;
  }

  async getResumoServicosPorEvento(userId: string, eventoId: string): Promise<{
    servicos: ServicoEvento[];
    quantidadeItens: number;
    porCategoria: Record<string, number>;
  }> {
    // Buscar todos os serviços (incluindo removidos) para manter consistência com Firebase
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, tipo_servicos(*)')
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .order('data_cadastro', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar serviços: ${error.message}`);
    }

    const servicos = (data || []).map(row => {
      const servico = this.convertFromSupabase(row);
      
      // Type assertion para resolver problema de inferência de tipos do Supabase
      const rowData = row as any;
      if (rowData.tipo_servicos) {
        servico.tipoServico = {
          id: rowData.tipo_servicos.id,
          nome: rowData.tipo_servicos.nome,
          descricao: rowData.tipo_servicos.descricao,
          valorPadrao: rowData.tipo_servicos.valor_padrao !== null && rowData.tipo_servicos.valor_padrao !== undefined
            ? parseFloat(rowData.tipo_servicos.valor_padrao)
            : 0,
          ativo: rowData.tipo_servicos.ativo,
          dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
        };
      }
      
      return servico;
    });
    
    // Filtrar serviços removidos apenas nos cálculos
    const servicosAtivos = servicos.filter(servico => !servico.removido);
    
    const porCategoria: Record<string, number> = {};
    servicosAtivos.forEach(servico => {
      const tipoNome = servico.tipoServico?.nome || 'Sem tipo';
      porCategoria[tipoNome] = (porCategoria[tipoNome] || 0) + 1;
    });

    return {
      servicos: servicos, // Retornar todos (incluindo removidos) para histórico, mas calcular apenas ativos
      quantidadeItens: servicosAtivos.length,
      porCategoria
    };
  }

  /**
   * Busca serviços de múltiplos eventos de uma vez (otimização para listagens)
   * Retorna um mapa de eventoId -> ServicoEvento[] para acesso rápido
   */
  async findByEventoIds(userId: string, eventoIds: string[]): Promise<Map<string, ServicoEvento[]>> {
    if (!eventoIds || eventoIds.length === 0) {
      return new Map();
    }

    // Supabase tem limite de 1000 itens no IN, então dividimos em chunks se necessário
    const CHUNK_SIZE = 1000;
    const chunks: string[][] = [];
    
    for (let i = 0; i < eventoIds.length; i += CHUNK_SIZE) {
      chunks.push(eventoIds.slice(i, i + CHUNK_SIZE));
    }

    const allServicos: ServicoEvento[] = [];

    // Processar cada chunk
    const empresaId = getEmpresaIdPadrao();
    for (const chunk of chunks) {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, tipo_servicos(*)')
        .eq('empresa_id', empresaId)
        .in('evento_id', chunk)
        .eq('removido', false)
        .order('data_cadastro', { ascending: false });

      if (error) {
        console.error('[ServicoEventoSupabaseRepository] Erro ao buscar serviços:', error);
        throw new Error(`Erro ao buscar serviços: ${error.message}`);
      }

      console.log(`[ServicoEventoSupabaseRepository] Buscou ${data?.length || 0} serviços para ${chunk.length} eventos`);

      const servicos = (data || []).map(row => {
        const servico = this.convertFromSupabase(row);
        
        // Type assertion para resolver problema de inferência de tipos do Supabase
        const rowData = row as any;
        if (rowData.tipo_servicos) {
          servico.tipoServico = {
            id: rowData.tipo_servicos.id,
            nome: rowData.tipo_servicos.nome,
            descricao: rowData.tipo_servicos.descricao,
            valorPadrao: rowData.tipo_servicos.valor_padrao !== null && rowData.tipo_servicos.valor_padrao !== undefined
              ? parseFloat(rowData.tipo_servicos.valor_padrao)
              : 0,
            ativo: rowData.tipo_servicos.ativo,
            dataCadastro: new Date(rowData.tipo_servicos.data_cadastro),
          };
        }
        
        return servico;
      });

      allServicos.push(...servicos);
    }

    // Agrupar por eventoId
    const servicosPorEvento = new Map<string, ServicoEvento[]>();
    
    allServicos.forEach(servico => {
      const existing = servicosPorEvento.get(servico.eventoId) || [];
      existing.push(servico);
      servicosPorEvento.set(servico.eventoId, existing);
    });

    // Garantir que todos os eventos tenham uma entrada (mesmo que vazia)
    eventoIds.forEach(eventoId => {
      if (!servicosPorEvento.has(eventoId)) {
        servicosPorEvento.set(eventoId, []);
      }
    });

    console.log(`[ServicoEventoSupabaseRepository] Total de eventos com serviços: ${Array.from(servicosPorEvento.values()).filter(s => s.length > 0).length} de ${eventoIds.length}`);

    return servicosPorEvento;
  }

  async getHistoricoServicosEvento(userId: string, eventoId: string): Promise<HistoricoServicoEvento[]> {
    const empresaId = getEmpresaIdPadrao();
    const { data, error } = await this.supabase
      .from('servicos_evento_historico')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('evento_id', eventoId)
      .order('data_alteracao', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar histórico de serviços: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      eventoId: row.evento_id,
      servicoEventoId: row.servico_evento_id,
      userId: row.user_id || undefined,
      valorUnitarioAnterior: row.valor_unitario_anterior !== null && row.valor_unitario_anterior !== undefined
        ? parseFloat(row.valor_unitario_anterior)
        : undefined,
      valorUnitarioNovo: row.valor_unitario_novo !== null && row.valor_unitario_novo !== undefined
        ? parseFloat(row.valor_unitario_novo)
        : undefined,
      quantidadeAnterior: row.quantidade_anterior ?? undefined,
      quantidadeNova: row.quantidade_nova ?? undefined,
      valorTotalItemAnterior: row.valor_total_item_anterior !== null && row.valor_total_item_anterior !== undefined
        ? parseFloat(row.valor_total_item_anterior)
        : undefined,
      valorTotalItemNovo: row.valor_total_item_novo !== null && row.valor_total_item_novo !== undefined
        ? parseFloat(row.valor_total_item_novo)
        : undefined,
      motivoAjuste: row.motivo_ajuste || undefined,
      dataAlteracao: new Date(row.data_alteracao)
    }));
  }
}

