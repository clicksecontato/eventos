import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRouteParams,
} from '@/lib/api/route-helpers';
import { registrarEventoAuditoriaContrato } from '@/lib/services/contrato-auditoria-service';

type BodyRevogar = {
  conviteId?: string;
};

/**
 * Cancela convites pendentes ou em acesso do contrato (revoga links públicos).
 * Se conviteId for omitido, revoga todos os convites ainda utilizáveis deste contrato.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id: contratoId } = await getRouteParams(params);
    const body = (await request.json().catch(() => ({}))) as BodyRevogar;
    const supabase = getSupabaseClient(true) as any;

    const base = supabase
      .from('contratos_assinatura_convites')
      .update({
        status: 'cancelado',
        data_atualizacao: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('contrato_id', contratoId)
      .in('status', ['pendente', 'acessado']);

    const query = body.conviteId?.trim()
      ? base.eq('id', body.conviteId.trim())
      : base;

    const { data, error } = await query.select('id');

    if (error) {
      return createErrorResponse(`Erro ao revogar convites: ${error.message}`, 500);
    }

    const revogados = Array.isArray(data) ? data.length : 0;
    if (revogados > 0) {
      await registrarEventoAuditoriaContrato({
        contratoId,
        userId: user.id,
        actorUserId: user.id,
        tipo: 'convites_revogados',
        payload: {
          quantidade: revogados,
          conviteIdEspecifico: body.conviteId?.trim() || null,
        },
      });
    }
    return createApiResponse({ revogados, mensagem: revogados > 0 ? 'Links revogados.' : 'Nenhum link ativo para revogar.' });
  } catch (error) {
    return handleApiError(error);
  }
}
