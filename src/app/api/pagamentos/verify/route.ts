import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * API route para verificar se pagamentos estão sendo salvos no Supabase
 * Útil para debug
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const queryParams = getQueryParams(request);
    const eventoId = queryParams.get('eventoId');

    const supabaseAdmin = getSupabaseClient(true);

    // Buscar todos os pagamentos do usuário
    let query = supabaseAdmin
      .from('pagamentos')
      .select('*')
      .eq('user_id', user.id);

    if (eventoId) {
      query = query.eq('evento_id', eventoId);
    }

    const { data: pagamentos, error } = await query.order('data_cadastro', { ascending: false }).limit(10);

    if (error) {
      return createApiResponse({
        error: `Erro ao buscar pagamentos: ${error.message}`,
        details: error.toString()
      }, 500);
    }

    return createApiResponse({
      totalEncontrado: pagamentos?.length || 0,
      pagamentos: pagamentos || [],
      eventoId: eventoId || 'todos'
    });
  } catch (error) {
    return handleApiError(error);
  }
}



