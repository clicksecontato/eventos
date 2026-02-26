import { NextRequest } from 'next/server';
import { AdminPasswordResetTokenRepository } from '@/lib/repositories/admin-password-reset-token-repository';
import { 
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await getRequestBody<{ token: string }>(request);
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return createErrorResponse('Token é obrigatório', 400);
    }

    const tokenRepo = new AdminPasswordResetTokenRepository();
    const tokenData = await tokenRepo.findByToken(token);

    if (!tokenData) {
      return createErrorResponse('Token inválido ou expirado', 400);
    }

    // Verificar se o token expirou
    const expiresAt = tokenData.expiresAt instanceof Date 
      ? tokenData.expiresAt 
      : new Date(tokenData.expiresAt);
    
    if (expiresAt < new Date()) {
      return createErrorResponse('Token expirado', 400);
    }

    // Retornar o código do Firebase
    return createApiResponse({
      success: true,
      code: tokenData.firebaseCode,
      email: tokenData.email
    });

  } catch (error) {
    return handleApiError(error);
  }
}

