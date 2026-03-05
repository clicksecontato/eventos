import { NextRequest } from 'next/server';
import {
  getAuthenticatedUser,
  createApiResponse,
  createErrorResponse,
  handleApiError
} from '@/lib/api/route-helpers';
import { createContextoAssinaturaServidor } from '@/lib/composition/server-assinatura-context';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const codigo = new URL(request.url).searchParams.get('codigo');

    if (!codigo) {
      return createErrorResponse('Parâmetro "codigo" é obrigatório', 400);
    }

    const { funcionalidadeService } = await createContextoAssinaturaServidor();
    const permitido = await funcionalidadeService.verificarPermissao(user.id, codigo);

    return createApiResponse({ permitido });
  } catch (error) {
    return handleApiError(error);
  }
}
