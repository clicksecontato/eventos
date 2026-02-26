import { NextRequest } from 'next/server';
import { 
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { authService } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await getRequestBody(request);
    const { code, newPassword } = body;

    if (!code || typeof code !== 'string') {
      return createErrorResponse('Código de redefinição é obrigatório', 400);
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return createErrorResponse('Nova senha é obrigatória', 400);
    }

    // Validações de senha (mesmas do cadastro)
    if (newPassword.length < 6) {
      return createErrorResponse('A senha deve ter no mínimo 6 caracteres', 400);
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    const passwordStrength = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;

    if (passwordStrength < 3) {
      return createErrorResponse(
        'A senha deve atender aos critérios mínimos de segurança (mínimo 3 de 4: maiúscula, minúscula, número, caractere especial)',
        400
      );
    }

    const result = await authService.confirmPasswordReset(code, newPassword);

    if (result.success) {
      return createApiResponse({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } else {
      return createErrorResponse(result.error || 'Erro ao redefinir senha', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

