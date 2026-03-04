import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { isFirebaseAdminInitialized, getFirebaseAdminInitializationError } from '@/lib/firebase-admin';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API /funcionalidades/por-ids] ===== INÍCIO DA BUSCA =====');
    
    // Verificar se Firebase Admin está inicializado
    if (!isFirebaseAdminInitialized()) {
      const initError = getFirebaseAdminInitializationError();
      console.error('[API /funcionalidades/por-ids] Firebase Admin não está inicializado:', initError?.message);
      return createErrorResponse(
        'Firebase Admin não está inicializado. Verifique as credenciais do Firebase.',
        500
      );
    }
    
    await getAuthenticatedUser();

    const { ids } = await getRequestBody<{ ids: string[] }>(request);
    
    if (!Array.isArray(ids)) {
      return createErrorResponse('IDs deve ser um array', 400);
    }

    console.log('[API /funcionalidades/por-ids] Buscando funcionalidades para IDs:', ids);
    
    // Usar AdminFuncionalidadeRepository no servidor para bypassar regras de segurança do Firebase
    const repo = repositoryFactory.getAdminFuncionalidadeRepository();
    console.log('[API /funcionalidades/por-ids] AdminFuncionalidadeRepository criado com sucesso');
    
    const funcionalidades = [];
    
    for (const id of ids) {
      try {
        const func = await repo.findById(id);
        if (func && func.ativo) {
          funcionalidades.push(func);
        }
      } catch (error: unknown) {
        console.error(`[API /funcionalidades/por-ids] Erro ao buscar funcionalidade ${id}:`, getErrorMessage(error));
        // Continuar com as outras funcionalidades mesmo se uma falhar
      }
    }

    console.log('[API /funcionalidades/por-ids] Funcionalidades encontradas:', funcionalidades.length);
    if (funcionalidades.length > 0) {
      console.log('[API /funcionalidades/por-ids] Primeiras funcionalidades:', funcionalidades.slice(0, 3).map(f => ({
        id: f.id,
        nome: f.nome,
        codigo: f.codigo,
        ativo: f.ativo
      })));
    } else {
      console.warn('[API /funcionalidades/por-ids] ⚠️ NENHUMA FUNCIONALIDADE ENCONTRADA!');
    }
    
    console.log('[API /funcionalidades/por-ids] ===== FIM DA BUSCA =====');
    
    return createApiResponse({ funcionalidades });
  } catch (error: unknown) {
    console.error('[API /funcionalidades/por-ids] ===== ERRO NA BUSCA =====');
    console.error('[API /funcionalidades/por-ids] Erro ao buscar funcionalidades:', error);
    console.error('[API /funcionalidades/por-ids] Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[API /funcionalidades/por-ids] Stack:', error instanceof Error ? error.stack : undefined);
    console.error('[API /funcionalidades/por-ids] Error details:', {
      message: getErrorMessage(error),
      name: error instanceof Error ? error.name : undefined,
      code: error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined,
      cause: error instanceof Error ? error.cause : undefined
    });
    console.error('[API /funcionalidades/por-ids] ===== FIM DO ERRO =====');
    return handleApiError(error);
  }
}

