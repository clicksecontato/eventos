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
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return createErrorResponse('Código de redefinição é obrigatório', 400);
    }

    const result = await authService.verifyResetCode(code);

    if (result.success) {
      return createApiResponse({
        success: true,
        email: result.email
      });
    } else {
      return createErrorResponse(result.error || 'Código inválido', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

