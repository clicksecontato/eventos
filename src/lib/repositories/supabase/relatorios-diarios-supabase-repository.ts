import { BaseSupabaseRepository } from './base-supabase-repository';
import { getSupabaseClient } from '@/lib/supabase/client';
import { generateUUID } from '@/lib/utils/uuid';

export interface DashboardRelatorioPersistido {
  data: Record<string, any>;
  meta?: {
    totalEventos: number;
    totalPagamentos: number;
    geradoEm: string;
  };
}

export interface RelatorioPersistido {
  data: Record<string, any>;
  meta?: {
    geradoEm: string;
    [key: string]: any;
  };
}

export interface RelatorioDiario {
  id: string;
  dateKey: string;
  dataGeracao: Date;
  dashboard?: DashboardRelatorioPersistido;
  detalhamentoReceber?: RelatorioPersistido;
  receitaMensal?: RelatorioPersistido;
  performanceEventos?: RelatorioPersistido;
  fluxoCaixa?: RelatorioPersistido;
  servicos?: RelatorioPersistido;
  canaisEntrada?: RelatorioPersistido;
  impressoes?: RelatorioPersistido;
}

export class RelatoriosDiariosSupabaseRepository {
  private tableName = 'relatorios_diarios';
  private supabase = getSupabaseClient(true); // Usar service role para bypassar RLS

  private getDocId(userId: string, dateKey: string): string {
    // Usar dateKey como ID para garantir unicidade
    return `${userId}_${dateKey}`;
  }

  async getRelatorioDiario(userId: string, dateKey: string): Promise<RelatorioDiario | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para acessar relatórios diários');
    }
    if (!dateKey) {
      throw new Error('dateKey é obrigatório para acessar relatórios diários');
    }

    const id = this.getDocId(userId, dateKey);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar relatório diário: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Type assertion para resolver problema de inferência de tipos do Supabase
    const rowData = data as any;

    return {
      id: rowData.id,
      dateKey: rowData.date_key,
      dataGeracao: new Date(rowData.data_geracao),
      dashboard: rowData.dashboard || undefined,
      detalhamentoReceber: rowData.detalhamento_receber || undefined,
      receitaMensal: rowData.receita_mensal || undefined,
      performanceEventos: rowData.performance_eventos || undefined,
      fluxoCaixa: rowData.fluxo_caixa || undefined,
      servicos: rowData.servicos || undefined,
      canaisEntrada: rowData.canais_entrada || undefined,
      impressoes: rowData.impressoes || undefined
    };
  }

  async salvarDashboard(
    userId: string,
    dateKey: string,
    payload: DashboardRelatorioPersistido,
    dataGeracao: Date
  ): Promise<void> {
    if (!userId) {
      throw new Error('userId é obrigatório para salvar relatório diário');
    }
    if (!dateKey) {
      throw new Error('dateKey é obrigatório para salvar relatório diário');
    }

    const id = this.getDocId(userId, dateKey);

    const { error } = await this.supabase
      .from(this.tableName)
      .upsert({
        id,
        user_id: userId,
        date_key: dateKey,
        data_geracao: dataGeracao.toISOString(),
        dashboard: payload
      }, {
        onConflict: 'id'
      });

    if (error) {
      throw new Error(`Erro ao salvar dashboard: ${error.message}`);
    }
  }

  async salvarRelatorio(
    userId: string,
    dateKey: string,
    tipoRelatorio: 'detalhamentoReceber' | 'receitaMensal' | 'performanceEventos' | 'fluxoCaixa' | 'servicos' | 'canaisEntrada' | 'impressoes',
    payload: RelatorioPersistido,
    dataGeracao: Date
  ): Promise<void> {
    if (!userId) {
      throw new Error('userId é obrigatório para salvar relatório diário');
    }
    if (!dateKey) {
      throw new Error('dateKey é obrigatório para salvar relatório diário');
    }

    const id = this.getDocId(userId, dateKey);

    // Mapear nome do campo para snake_case
    const campoMap: Record<string, string> = {
      detalhamentoReceber: 'detalhamento_receber',
      receitaMensal: 'receita_mensal',
      performanceEventos: 'performance_eventos',
      fluxoCaixa: 'fluxo_caixa',
      servicos: 'servicos',
      canaisEntrada: 'canais_entrada',
      impressoes: 'impressoes'
    };

    const campoSupabase = campoMap[tipoRelatorio];

    // Buscar registro existente
    const { data: existing } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const updateData: any = {
      id,
      user_id: userId,
      date_key: dateKey,
      data_geracao: dataGeracao.toISOString(),
      [campoSupabase]: payload
    };

    // Se já existe, fazer merge dos dados
    // Type assertion para resolver problema de inferência de tipos do Supabase
    if (existing) {
      const existingData = existing as any;
      updateData.dashboard = existingData.dashboard;
    }

    const { error } = await this.supabase
      .from(this.tableName)
      .upsert(updateData, {
        onConflict: 'id'
      });

    if (error) {
      throw new Error(`Erro ao salvar relatório ${tipoRelatorio}: ${error.message}`);
    }
  }

  async salvarMultiplosRelatorios(
    userId: string,
    dateKey: string,
    relatorios: Partial<Record<'detalhamentoReceber' | 'receitaMensal' | 'performanceEventos' | 'fluxoCaixa' | 'servicos' | 'canaisEntrada' | 'impressoes', RelatorioPersistido>>,
    dataGeracao: Date
  ): Promise<void> {
    if (!userId) {
      throw new Error('userId é obrigatório para salvar relatórios diários');
    }
    if (!dateKey) {
      throw new Error('dateKey é obrigatório para salvar relatórios diários');
    }

    const id = this.getDocId(userId, dateKey);

    // Mapear nomes dos campos para snake_case
    const campoMap: Record<string, string> = {
      detalhamentoReceber: 'detalhamento_receber',
      receitaMensal: 'receita_mensal',
      performanceEventos: 'performance_eventos',
      fluxoCaixa: 'fluxo_caixa',
      servicos: 'servicos',
      canaisEntrada: 'canais_entrada',
      impressoes: 'impressoes'
    };

    // Buscar registro existente
    const { data: existing } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const updateData: any = {
      id,
      user_id: userId,
      date_key: dateKey,
      data_geracao: dataGeracao.toISOString()
    };

    // Adicionar campos existentes
    // Type assertion para resolver problema de inferência de tipos do Supabase
    if (existing) {
      const existingData = existing as any;
      updateData.dashboard = existingData.dashboard;
    }

    // Adicionar novos relatórios apenas se o campo existir no mapeamento
    Object.entries(relatorios).forEach(([key, value]) => {
      const campoSupabase = campoMap[key];
      if (campoSupabase && value) {
        // Verificar se o campo está no mapeamento antes de adicionar
        updateData[campoSupabase] = value;
      }
    });

    // Tentar salvar apenas os campos que existem
    // Se houver erro de coluna não encontrada, tentar salvar sem as colunas problemáticas
    let error = null;
    let tentativas = 0;
    const maxTentativas = 10; // Aumentado para lidar com múltiplas colunas faltando
    const colunasRemovidas: string[] = [];
    
    while (tentativas < maxTentativas) {
      const { error: upsertError } = await this.supabase
        .from(this.tableName)
        .upsert(updateData, {
          onConflict: 'id'
        });

      error = upsertError;
      
      // Se não houver erro, sucesso!
      if (!error) {
        if (colunasRemovidas.length > 0) {
          console.warn(`Relatórios salvos com sucesso, mas as seguintes colunas foram removidas por não existirem: ${colunasRemovidas.join(', ')}`);
        }
        break;
      }
      
      // Se o erro não for relacionado a coluna não encontrada, sair do loop
      if (!error.message?.includes('Could not find') || !error.message?.includes('column')) {
        break;
      }

      // Se o erro for sobre coluna não encontrada, remover a coluna problemática e tentar novamente
      const colunaNaoEncontrada = error.message.match(/Could not find the '([^']+)' column/);
      if (colunaNaoEncontrada && colunaNaoEncontrada[1]) {
        const colunaProblema = colunaNaoEncontrada[1];
        console.warn(`Coluna ${colunaProblema} não encontrada na tabela. Removendo do updateData e tentando novamente.`);
        delete updateData[colunaProblema];
        colunasRemovidas.push(colunaProblema);
        tentativas++;
      } else {
        break;
      }
    }

    if (error) {
      const mensagemErro = colunasRemovidas.length > 0 
        ? `Erro ao salvar múltiplos relatórios: ${error.message}. Colunas removidas: ${colunasRemovidas.join(', ')}`
        : `Erro ao salvar múltiplos relatórios: ${error.message}`;
      throw new Error(mensagemErro);
    }
  }
}
