import { NextRequest } from 'next/server';
import {
  getAuthenticatedUser,
  createApiResponse,
  createErrorResponse,
  handleApiError
} from '@/lib/api/route-helpers';
import { createContextoAssinaturaServidor } from '@/lib/composition/server-assinatura-context';

type TipoCriacao = 'eventos' | 'clientes';

function isTipoCriacao(value: string | null): value is TipoCriacao {
  return value === 'eventos' || value === 'clientes';
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const tipo = new URL(request.url).searchParams.get('tipo');

    if (!isTipoCriacao(tipo)) {
      return createErrorResponse('Parâmetro "tipo" inválido. Use "eventos" ou "clientes".', 400);
    }

    const { funcionalidadeService } = await createContextoAssinaturaServidor();
    const resultado = await funcionalidadeService.verificarPodeCriar(user.id, tipo);

    return createApiResponse({ resultado });
  } catch (error) {
    return handleApiError(error);
  }
}
