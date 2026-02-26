/**
 * API Route para desconectar conta do Google Calendar
 * 
 * POST /api/google-calendar/disconnect
 * 
 * Esta rota é opcional e não quebra o sistema se não estiver configurada.
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse
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

    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
    const token = await tokenRepo.findByUserId(user.id);

    if (!token) {
      return createErrorResponse('Token não encontrado', 404);
    }

    // Deletar token
    await tokenRepo.delete(token.id);

    return createApiResponse({ 
      success: true,
      message: 'Conta desconectada com sucesso'
    });
  } catch (error) {
    return handleApiError(error);
  }
}

