import { getSupabaseClient } from '@/lib/supabase/client';
import { ValorAtrasado, ValoresAtrasadosFiltros } from '@/types';

export class ValoresAtrasadosSupabaseRepository {
  private tableName = 'eventos';
  private supabase = getSupabaseClient();

  /**
   * Busca valores atrasados para um usuário
   * Query otimizada com JOIN e agregação
   */
  async findValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<ValorAtrasado[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Usar service role para bypassar RLS
    const supabaseAdmin = getSupabaseClient(true);
    
    // Query base: eventos com valores atrasados
    let query = supabaseAdmin
      .from(this.tableName)
      .select(`
        id,
        nome_evento,
        data_evento,
        dia_final_pagamento,
        valor_total,
        cliente_id
      `)
      .eq('user_id', userId)
      .eq('arquivado', false)
      .gt('valor_total', 0)
      .not('dia_final_pagamento', 'is', null)
      .lt('dia_final_pagamento', hoje.toISOString());

    // Aplicar filtros
    if (filtros?.clienteId) {
      query = query.eq('cliente_id', filtros.clienteId);
    }

    if (filtros?.dataInicio) {
      query = query.gte('data_evento', filtros.dataInicio.toISOString());
    }

    if (filtros?.dataFim) {
      query = query.lte('data_evento', filtros.dataFim.toISOString());
    }

    if (filtros?.valorMin) {
      query = query.gte('valor_total', filtros.valorMin);
    }

    if (filtros?.valorMax) {
      query = query.lte('valor_total', filtros.valorMax);
    }

    // Ordenação
    const ordenarPor = filtros?.ordenarPor || 'diaFinalPagamento';
    const ordem = filtros?.ordem || 'asc';

    const orderByMap: Record<string, string> = {
      valorAtrasado: 'valor_total',
      diasAtraso: 'dia_final_pagamento',
      dataEvento: 'data_evento',
      diaFinalPagamento: 'dia_final_pagamento',
      clienteNome: 'clientes.nome'
    };

    if (orderByMap[ordenarPor]) {
      query = query.order(orderByMap[ordenarPor], { ascending: ordem === 'asc' });
    }

    // Limite e offset
    if (filtros?.limite) {
      query = query.limit(filtros.limite);
    }

    if (filtros?.offset) {
      query = query.range(filtros.offset, filtros.offset + (filtros.limite || 100) - 1);
    }

    const { data: eventos, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar valores atrasados: ${error.message}`);
    }

    if (!eventos || eventos.length === 0) {
      return [];
    }

    // Buscar clientes e pagamentos separadamente para melhor performance
    const clienteIds = [...new Set(eventos.map((e: any) => e.cliente_id))];
    const eventoIds = eventos.map((e: any) => e.id);

    // Buscar clientes
    const { data: clientes, error: clientesError } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, email, telefone')
      .in('id', clienteIds);

    if (clientesError) {
      throw new Error(`Erro ao buscar clientes: ${clientesError.message}`);
    }

    const clientesMap = new Map((clientes || []).map((c: any) => [c.id, c]));

    // Buscar pagamentos
    const { data: pagamentos, error: pagamentosError } = await supabaseAdmin
      .from('pagamentos')
      .select('evento_id, valor, status, cancelado')
      .in('evento_id', eventoIds)
      .eq('cancelado', false);

    if (pagamentosError) {
      throw new Error(`Erro ao buscar pagamentos: ${pagamentosError.message}`);
    }

    // Agrupar pagamentos por evento
    const pagamentosPorEvento = new Map<string, any[]>();
    (pagamentos || []).forEach((p: any) => {
      if (!pagamentosPorEvento.has(p.evento_id)) {
        pagamentosPorEvento.set(p.evento_id, []);
      }
      pagamentosPorEvento.get(p.evento_id)!.push(p);
    });

    // Processar resultados: calcular valores atrasados
    const valoresAtrasados: ValorAtrasado[] = eventos
      .map((row: any) => {
        const pagamentosEvento = pagamentosPorEvento.get(row.id) || [];
        const totalPago = pagamentosEvento
          .filter((p: any) => p.status === 'Pago')
          .reduce((sum: number, p: any) => sum + Number(p.valor), 0);

        const valorAtrasado = Number(row.valor_total) - totalPago;

        // Filtrar apenas eventos com valor atrasado > 0
        if (valorAtrasado <= 0) {
          return null;
        }

        const diaFinalPagamento = new Date(row.dia_final_pagamento);
        const diasAtraso = Math.floor((hoje.getTime() - diaFinalPagamento.getTime()) / (1000 * 60 * 60 * 24));

        // Aplicar filtro de dias de atraso se especificado
        if (filtros?.diasAtrasoMin !== undefined && diasAtraso < filtros.diasAtrasoMin) {
          return null;
        }

        if (filtros?.diasAtrasoMax !== undefined && diasAtraso > filtros.diasAtrasoMax) {
          return null;
        }

        return {
          eventoId: row.id,
          nomeEvento: row.nome_evento,
          dataEvento: new Date(row.data_evento),
          diaFinalPagamento: diaFinalPagamento,
          valorTotal: Number(row.valor_total),
          totalPago,
          valorAtrasado,
          diasAtraso,
          cliente: {
            id: row.cliente_id,
            nome: clientesMap.get(row.cliente_id)?.nome || '',
            email: clientesMap.get(row.cliente_id)?.email,
            telefone: clientesMap.get(row.cliente_id)?.telefone
          }
        };
      })
      .filter((v: ValorAtrasado | null) => v !== null) as ValorAtrasado[];

    // Ordenação final (se necessário, após cálculos)
    if (ordenarPor === 'valorAtrasado' || ordenarPor === 'diasAtraso') {
      valoresAtrasados.sort((a, b) => {
        const aVal = ordenarPor === 'valorAtrasado' ? a.valorAtrasado : a.diasAtraso;
        const bVal = ordenarPor === 'valorAtrasado' ? b.valorAtrasado : b.diasAtraso;
        return ordem === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return valoresAtrasados;
  }

  /**
   * Conta total de valores atrasados (para paginação)
   */
  async countValoresAtrasados(
    userId: string,
    filtros?: ValoresAtrasadosFiltros
  ): Promise<number> {
    const valores = await this.findValoresAtrasados(userId, filtros);
    return valores.length;
  }
}
