/**
 * API Route para forçar renovação do token do Google Calendar
 * 
 * POST /api/google-calendar/refresh-token
 * 
 * Esta rota força a renovação do access token usando o refresh token
 */

import { NextRequest } from 'next/server';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse
} from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function decrypt(encrypted: string, key: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const tokenRepo = repositoryFactory.getGoogleCalendarTokenRepository();
    const token = await tokenRepo.findByUserId(user.id);

    if (!token) {
      return createErrorResponse('Token não encontrado', 404);
    }

    // Descriptografar refresh token
    const refreshToken = decrypt(token.refreshToken, ENCRYPTION_KEY);

    // Importar serviço
    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const googleService = serviceFactory.getGoogleCalendarService();
    
    // Forçar renovação marcando token como expirado
    await tokenRepo.update(token.id, {
      expiresAt: new Date(0) // Data no passado para forçar renovação
    });

    // Tentar obter novo token (vai forçar renovação)
    try {
      // Usar método privado através de getCalendarInfo que vai renovar o token
      const calendarInfo = await googleService.getCalendarInfo(user.id);
      
      // Buscar token atualizado
      const updatedToken = await tokenRepo.findByUserId(user.id);
      
      return createApiResponse({
        success: true,
        message: 'Token renovado com sucesso',
        calendarInfo: calendarInfo
      });
    } catch (error: any) {
      console.error('Erro ao renovar token:', error);
      
      // Se o refresh token é inválido, usuário precisa reconectar
      if (error.message?.includes('invalid_grant') || error.code === 'invalid_grant') {
        return createErrorResponse(
          'O refresh token é inválido ou foi revogado. Por favor, desconecte e conecte novamente sua conta do Google Calendar.',
          401,
          { requiresReconnect: true }
        );
      }
      
      return createErrorResponse(
        error.message || 'Erro desconhecido ao renovar token',
        500
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

