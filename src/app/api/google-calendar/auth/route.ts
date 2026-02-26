/**
 * API Route para iniciar o fluxo OAuth do Google Calendar
 * 
 * GET /api/google-calendar/auth
 * 
 * Esta rota é opcional e não quebra o sistema se não estiver configurada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createErrorResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { verificarAcessoGoogleCalendar } from '@/lib/utils/google-calendar-auth';

export async function GET(request: NextRequest) {
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

    // Verificar se variáveis de ambiente estão configuradas
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return createErrorResponse(
        'Google Calendar não está configurado. Contate o administrador.',
        500
      );
    }

    // Importar serviço (server-side apenas)
    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const googleService = serviceFactory.getGoogleCalendarService();

    // Verificar se há parâmetro para forçar nova autorização
    const queryParams = getQueryParams(request);
    const forcePrompt = queryParams.get('force') === 'true';

    // Gerar URL de autorização com state = userId para segurança
    // getAuthUrl já inclui prompt=consent, então se forcePrompt, apenas garantir que está na URL
    const authUrl = googleService.getAuthUrl(user.id);
    
    // Se forcePrompt, garantir que prompt=consent está presente (pode já estar)
    const finalAuthUrl = forcePrompt && !authUrl.includes('prompt=consent')
      ? `${authUrl}&prompt=consent`
      : authUrl;

    return NextResponse.redirect(finalAuthUrl);
  } catch (error) {
    return handleApiError(error);
  }
}

