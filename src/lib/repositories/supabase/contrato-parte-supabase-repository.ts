import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  ContratoParte,
  ContratoParteComSignatarios,
  ContratoParteSignatario,
  PapelContratoParte,
  StatusContratoParteSignatario,
} from '@/types';

function parseDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

export class ContratoParteSupabaseRepository {
  private readonly supabase = getSupabaseClient(true) as any;

  constructor() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado.');
    }
  }

  private mapParte(row: Record<string, unknown>): ContratoParte {
    return {
      id: String(row.id),
      contratoId: String(row.contrato_id),
      userId: String(row.user_id),
      papel: String(row.papel) as PapelContratoParte,
      ordemAssinatura: row.ordem_assinatura != null ? Number(row.ordem_assinatura) : null,
      obrigatoria: Boolean(row.obrigatoria),
      dataCadastro: parseDate(row.data_cadastro),
      dataAtualizacao: parseDate(row.data_atualizacao),
    };
  }

  private mapSignatario(row: Record<string, unknown>): ContratoParteSignatario {
    return {
      id: String(row.id),
      parteId: String(row.parte_id),
      contratoId: String(row.contrato_id),
      userId: String(row.user_id),
      nome: String(row.nome),
      email: String(row.email),
      documento: row.documento != null ? String(row.documento) : null,
      status: String(row.status) as StatusContratoParteSignatario,
      dataCadastro: parseDate(row.data_cadastro),
      dataAtualizacao: parseDate(row.data_atualizacao),
    };
  }

  async listarArvorePorContrato(contratoId: string, userId: string): Promise<ContratoParteComSignatarios[]> {
    const { data: partes, error: e1 } = await this.supabase
      .from('contrato_partes')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: true });

    if (e1) throw new Error(`Erro ao listar partes: ${e1.message}`);
    const listaPartes = Array.isArray(partes) ? partes : [];

    const { data: sigs, error: e2 } = await this.supabase
      .from('contrato_parte_signatarios')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('user_id', userId)
      .order('data_cadastro', { ascending: true });

    if (e2) throw new Error(`Erro ao listar signatários: ${e2.message}`);
    const listaSigs = Array.isArray(sigs) ? sigs : [];

    const porParte = new Map<string, ContratoParteSignatario[]>();
    for (const s of listaSigs) {
      const m = this.mapSignatario(s as Record<string, unknown>);
      const arr = porParte.get(m.parteId) ?? [];
      arr.push(m);
      porParte.set(m.parteId, arr);
    }

    return listaPartes.map((p) => {
      const parte = this.mapParte(p as Record<string, unknown>);
      return { ...parte, signatarios: porParte.get(parte.id) ?? [] };
    });
  }

  async criarParte(input: {
    id: string;
    contratoId: string;
    userId: string;
    papel: string;
    ordemAssinatura?: number | null;
    obrigatoria?: boolean;
  }): Promise<ContratoParte> {
    const agora = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('contrato_partes')
      .insert({
        id: input.id,
        contrato_id: input.contratoId,
        user_id: input.userId,
        papel: input.papel,
        ordem_assinatura: input.ordemAssinatura ?? null,
        obrigatoria: input.obrigatoria !== false,
        data_cadastro: agora,
        data_atualizacao: agora,
      })
      .select('*')
      .single();

    if (error) throw new Error(`Erro ao criar parte: ${error.message}`);
    return this.mapParte(data as Record<string, unknown>);
  }

  async atualizarParte(
    parteId: string,
    userId: string,
    patch: { papel?: string; ordemAssinatura?: number | null; obrigatoria?: boolean }
  ): Promise<ContratoParte> {
    const row: Record<string, unknown> = { data_atualizacao: new Date().toISOString() };
    if (patch.papel !== undefined) row.papel = patch.papel;
    if (patch.ordemAssinatura !== undefined) row.ordem_assinatura = patch.ordemAssinatura;
    if (patch.obrigatoria !== undefined) row.obrigatoria = patch.obrigatoria;

    const { data, error } = await this.supabase
      .from('contrato_partes')
      .update(row)
      .eq('id', parteId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw new Error(`Erro ao atualizar parte: ${error.message}`);
    return this.mapParte(data as Record<string, unknown>);
  }

  async excluirParte(parteId: string, userId: string): Promise<void> {
    const { error } = await this.supabase.from('contrato_partes').delete().eq('id', parteId).eq('user_id', userId);
    if (error) throw new Error(`Erro ao excluir parte: ${error.message}`);
  }

  async buscarSignatario(signatarioId: string, userId: string): Promise<ContratoParteSignatario | null> {
    const { data, error } = await this.supabase
      .from('contrato_parte_signatarios')
      .select('*')
      .eq('id', signatarioId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar signatário: ${error.message}`);
    if (!data) return null;
    return this.mapSignatario(data as Record<string, unknown>);
  }

  async criarSignatario(input: {
    id: string;
    parteId: string;
    contratoId: string;
    userId: string;
    nome: string;
    email: string;
    documento?: string | null;
  }): Promise<ContratoParteSignatario> {
    const agora = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('contrato_parte_signatarios')
      .insert({
        id: input.id,
        parte_id: input.parteId,
        contrato_id: input.contratoId,
        user_id: input.userId,
        nome: input.nome.trim(),
        email: input.email.trim().toLowerCase(),
        documento: input.documento?.trim() || null,
        status: 'pendente',
        data_cadastro: agora,
        data_atualizacao: agora,
      })
      .select('*')
      .single();

    if (error) throw new Error(`Erro ao criar signatário: ${error.message}`);
    return this.mapSignatario(data as Record<string, unknown>);
  }

  async atualizarSignatario(
    signatarioId: string,
    userId: string,
    patch: { nome?: string; email?: string; documento?: string | null; status?: StatusContratoParteSignatario }
  ): Promise<ContratoParteSignatario> {
    const row: Record<string, unknown> = { data_atualizacao: new Date().toISOString() };
    if (patch.nome !== undefined) row.nome = patch.nome.trim();
    if (patch.email !== undefined) row.email = patch.email.trim().toLowerCase();
    if (patch.documento !== undefined) row.documento = patch.documento?.trim() || null;
    if (patch.status !== undefined) row.status = patch.status;

    const { data, error } = await this.supabase
      .from('contrato_parte_signatarios')
      .update(row)
      .eq('id', signatarioId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw new Error(`Erro ao atualizar signatário: ${error.message}`);
    return this.mapSignatario(data as Record<string, unknown>);
  }

  async excluirSignatario(signatarioId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('contrato_parte_signatarios')
      .delete()
      .eq('id', signatarioId)
      .eq('user_id', userId);

    if (error) throw new Error(`Erro ao excluir signatário: ${error.message}`);
  }

  /** Garante que a parte pertence ao contrato e ao tenant. */
  async assertParteDoContrato(parteId: string, contratoId: string, userId: string): Promise<ContratoParte> {
    const { data, error } = await this.supabase
      .from('contrato_partes')
      .select('*')
      .eq('id', parteId)
      .eq('contrato_id', contratoId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao validar parte: ${error.message}`);
    if (!data) throw new Error('Parte não encontrada neste contrato.');
    return this.mapParte(data as Record<string, unknown>);
  }
}
