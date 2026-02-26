/**
 * API Route para alternar status de sincronização
 * 
 * POST /api/google-calendar/toggle-sync
 * 
 * Esta rota é opcional e não quebra o sistema se não estiver configurada.
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { verificarAcessoGoogleCalendar } from '@/lib/utils/google-calendar-auth';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    // Verificar se usuário tem plano permitido
    const temAcesso = await verificarAcessoGoogleCalendar(user.id);
    if (!temAcesso) {
      return createErrorResponse(
        'Esta funcionalidade está disponível apenas para planos Profissional e Premium.',
        403
      );
    }

    const body = await getRequestBody<{ syncEnabled: boolean }>(request);
    const { syncEnabled } = body;

    if (typeof syncEnabled !== 'boolean') {
      return createErrorResponse('syncEnabled deve ser um boolean', 400);
    }

    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
    await tokenRepo.updateSyncStatus(user.id, syncEnabled);

    return createApiResponse({ 
      success: true,
      syncEnabled
    });
  } catch (error) {
    return handleApiError(error);
  }
}

