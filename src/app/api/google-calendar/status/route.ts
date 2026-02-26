/**
 * API Route para obter status da conexão com Google Calendar
 * 
 * GET /api/google-calendar/status
 * 
 * Esta rota é opcional e não quebra o sistema se não estiver configurada.
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse
} from '@/lib/api/route-helpers';
import { verificarAcessoGoogleCalendar } from '@/lib/utils/google-calendar-auth';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { GoogleCalendarSyncStatus } from '@/types/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    // Verificar se usuário tem plano permitido
    const planAllowed = await verificarAcessoGoogleCalendar(user.id);
    
    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
    const token = await tokenRepo.findByUserId(user.id);

    const status: GoogleCalendarSyncStatus = {
      connected: !!token,
      syncEnabled: token?.syncEnabled || false,
      planAllowed,
      lastSyncAt: token?.lastSyncAt,
      email: undefined
    };

    // Se conectado, obter email do calendário
    if (token && planAllowed) {
      try {
        const { getServiceFactory } = await import('@/lib/factories/service-factory');
        const serviceFactory = getServiceFactory();
        const googleService = serviceFactory.getGoogleCalendarService();
        const calendarInfo = await googleService.getCalendarInfo(user.id);
        status.email = calendarInfo.email;
      } catch (error) {
        // Não falhar se não conseguir obter email
      }
    }

    return createApiResponse(status);
  } catch (error) {
    return handleApiError(error);
  }
}

