import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { ContratoEventoAuditoria, TipoEventoContratoAuditoria } from '@/types';

export type InserirContratoEventoAuditoriaInput = {
  id: string;
  contratoId: string;
  userId: string;
  actorUserId?: string | null;
  tipoEvento: TipoEventoContratoAuditoria;
  payload: Record<string, unknown>;
};

/**
 * Repositório apenas INSERT + listagem por contrato (auditoria append-only).
 */
export class ContratoEventoAuditoriaSupabaseRepository {
  private readonly supabase = getSupabaseClient(true) as any;

  constructor() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado.');
    }
  }

  async inserir(input: InserirContratoEventoAuditoriaInput): Promise<void> {
    const { error } = await this.supabase.from('contrato_eventos_auditoria').insert({
      id: input.id,
      contrato_id: input.contratoId,
      user_id: input.userId,
      actor_user_id: input.actorUserId ?? null,
      tipo_evento: input.tipoEvento,
      payload: input.payload,
    });
    if (error) {
      throw new Error(`Erro ao registrar evento de auditoria: ${error.message}`);
    }
  }

  async listarPorContrato(contratoId: string, userId: string): Promise<ContratoEventoAuditoria[]> {
    const { data, error } = await this.supabase
      .from('contrato_eventos_auditoria')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('user_id', userId)
      .order('criado_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar eventos de auditoria: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map((row: Record<string, unknown>) => this.mapRow(row));
  }

  private mapRow(row: Record<string, unknown>): ContratoEventoAuditoria {
    const parseDate = (v: unknown): Date => {
      if (v instanceof Date) return v;
      if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? new Date() : d;
      }
      return new Date();
    };
    return {
      id: String(row.id),
      contratoId: String(row.contrato_id),
      userId: String(row.user_id),
      actorUserId: row.actor_user_id != null ? String(row.actor_user_id) : null,
      tipoEvento: row.tipo_evento as TipoEventoContratoAuditoria,
      payload: (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<
        string,
        unknown
      >,
      criadoEm: parseDate(row.criado_em),
    };
  }
}
