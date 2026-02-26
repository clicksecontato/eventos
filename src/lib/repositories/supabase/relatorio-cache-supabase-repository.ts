import { getSupabaseClient } from '@/lib/supabase/client';
import { RelatorioSnapshot } from '@/types/relatorios';

export class RelatorioCacheSupabaseRepository {
  private tableName = 'relatorios_cache';
  private supabase = getSupabaseClient(true); // Usar service role para bypassar RLS

  /**
   * Busca o snapshot mais recente de relatórios para um usuário
   */
  async getLatestSnapshot(userId: string): Promise<RelatorioSnapshot | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar snapshot de relatórios');
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_geracao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar snapshot mais recente: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Cria ou atualiza um snapshot de relatórios
   * Usa o ID do snapshot baseado na data (yyyy-MM-dd) para garantir um único snapshot por dia
   */
  async createOrUpdateSnapshot(userId: string, snapshot: RelatorioSnapshot): Promise<RelatorioSnapshot> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar snapshot de relatórios');
    }

    // Gerar ID baseado na data (yyyy-MM-dd) para garantir um snapshot por dia
    const dataSnapshot = new Date(snapshot.dataGeracao);
    const snapshotId = snapshot.id || dataSnapshot.toISOString().split('T')[0]; // yyyy-MM-dd

    const supabaseData = this.convertToSupabase(snapshot, userId, snapshotId);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .upsert(supabaseData, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar/atualizar snapshot: ${error.message}`);
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Busca um snapshot específico por ID (data yyyy-MM-dd)
   */
  async getSnapshotById(userId: string, snapshotId: string): Promise<RelatorioSnapshot | null> {
    if (!userId || !snapshotId) {
      throw new Error('userId e snapshotId são obrigatórios');
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', snapshotId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar snapshot: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.convertFromSupabase(data);
  }

  /**
   * Lista todos os snapshots disponíveis para um usuário (últimos N dias)
   */
  async listSnapshots(userId: string, limit: number = 30): Promise<RelatorioSnapshot[]> {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('data_geracao', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao listar snapshots: ${error.message}`);
    }

    return (data || []).map(row => this.convertFromSupabase(row));
  }

  /**
   * Remove snapshots antigos (mantém apenas os últimos N dias)
   */
  async cleanupOldSnapshots(userId: string, keepDays: number = 30): Promise<void> {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId)
        .lt('data_geracao', cutoffDate.toISOString());

      if (error) {
        console.error('Erro ao limpar snapshots antigos:', error);
        // Não lançar erro para não bloquear o processo principal
      }
    } catch (error) {
      console.error('Erro ao limpar snapshots antigos:', error);
      // Não lançar erro para não bloquear o processo principal
    }
  }

  /**
   * Converte dados do Supabase para formato da aplicação
   */
  private convertFromSupabase(row: any): RelatorioSnapshot {
    return {
      id: row.id,
      userId: row.user_id,
      dataGeracao: new Date(row.data_geracao),
      periodo: {
        inicio: new Date(row.periodo_inicio),
        fim: new Date(row.periodo_fim)
      },
      resumoGeral: row.resumo_geral || undefined,
      receitaMensal: row.receita_mensal || undefined,
      eventosResumo: row.eventos_resumo || undefined,
      fluxoCaixa: row.fluxo_caixa || undefined,
      servicosResumo: row.servicos_resumo || undefined,
      canaisEntradaResumo: row.canais_entrada_resumo || undefined,
      impressoesResumo: row.impressoes_resumo || undefined,
      performanceEventos: row.performance_eventos || undefined
    };
  }

  /**
   * Converte dados da aplicação para formato do Supabase
   */
  private convertToSupabase(snapshot: RelatorioSnapshot, userId: string, id: string): any {
    return {
      id,
      user_id: userId,
      data_geracao: snapshot.dataGeracao.toISOString(),
      periodo_inicio: snapshot.periodo.inicio.toISOString(),
      periodo_fim: snapshot.periodo.fim.toISOString(),
      resumo_geral: snapshot.resumoGeral || null,
      receita_mensal: snapshot.receitaMensal || null,
      eventos_resumo: snapshot.eventosResumo || null,
      fluxo_caixa: snapshot.fluxoCaixa || null,
      servicos_resumo: snapshot.servicosResumo || null,
      canais_entrada_resumo: snapshot.canaisEntradaResumo || null,
      impressoes_resumo: snapshot.impressoesResumo || null,
      performance_eventos: snapshot.performanceEventos || null
    };
  }
}
