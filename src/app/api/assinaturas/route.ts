import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { isFirebaseAdminInitialized, getFirebaseAdminInitializationError } from '@/lib/firebase-admin';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getQueryParams
} from '@/lib/api/route-helpers';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API /assinaturas] ===== INÍCIO DA BUSCA =====');
    
    // Verificar se Firebase Admin está inicializado
    if (!isFirebaseAdminInitialized()) {
      const initError = getFirebaseAdminInitializationError();
      console.error('[API /assinaturas] Firebase Admin não está inicializado:', initError?.message);
      return createErrorResponse(
        'Firebase Admin não está inicializado. Verifique as credenciais do Firebase.',
        500
      );
    }
    
    const user = await getAuthenticatedUser();
    console.log('[API /assinaturas] Usuário autenticado:', {
      id: user.id,
      role: user.role,
      email: user.email
    });
    
    // Usar AdminAssinaturaRepository no servidor para bypassar regras de segurança do Firebase
    const repo = repositoryFactory.getAdminAssinaturaRepository();
    console.log('[API /assinaturas] AdminAssinaturaRepository criado com sucesso');
    
    // Admin pode consultar por userId explícito; por padrão, retorna a própria assinatura.
    if (user.role === 'admin') {
      const queryParams = getQueryParams(request);
      const userId = queryParams.get('userId');
      
      if (userId) {
        console.log('[API /assinaturas] Admin buscando assinaturas do userId:', userId);
        const assinaturas = await repo.findAllByUserId(userId);
        console.log('[API /assinaturas] Assinaturas encontradas (admin):', assinaturas.length);
        
        if (assinaturas.length > 0) {
          console.log('[API /assinaturas] Primeiras assinaturas:', assinaturas.slice(0, 3).map(a => ({
            id: a.id,
            userId: a.userId,
            status: a.status,
            planoId: a.planoId
          })));
        }
        
        const response = createApiResponse({ assinaturas });
        console.log('[API /assinaturas] ===== FIM DA BUSCA (ADMIN) =====');
        return response;
      }
    }

    // Retornar assinatura ativa e todas as assinaturas do usuário autenticado (inclui admin)
    console.log('[API /assinaturas] Buscando assinatura ativa para userId:', user.id);
    const assinatura = await repo.findByUserId(user.id);
    console.log('[API /assinaturas] Assinatura ativa encontrada:', assinatura ? {
      id: assinatura.id,
      status: assinatura.status,
      planoId: assinatura.planoId,
      dataInicio: assinatura.dataInicio,
      dataFim: assinatura.dataFim
    } : 'null');
    
    console.log('[API /assinaturas] Buscando todas as assinaturas para userId:', user.id);
    const todasAssinaturas = await repo.findAllByUserId(user.id);
    console.log('[API /assinaturas] Total de assinaturas (histórico):', todasAssinaturas.length);
    
    if (todasAssinaturas.length > 0) {
      console.log('[API /assinaturas] Todas as assinaturas:', todasAssinaturas.map(a => ({
        id: a.id,
        status: a.status,
        planoId: a.planoId,
        dataInicio: a.dataInicio
      })));
    } else {
      console.warn('[API /assinaturas] ⚠️ NENHUMA ASSINATURA ENCONTRADA PARA O USUÁRIO!');
      console.warn('[API /assinaturas] Verifique se existem assinaturas no Firestore para userId:', user.id);
    }
    
    const response = createApiResponse({ 
      assinatura, // Assinatura ativa (ou null se não houver)
      todasAssinaturas // Todas as assinaturas do usuário (para histórico)
    });
    
    console.log('[API /assinaturas] Resposta sendo retornada:', {
      status: response.status,
      hasAssinatura: !!assinatura,
      todasAssinaturasCount: todasAssinaturas.length,
      responseStructure: 'createApiResponse({ assinatura, todasAssinaturas }) retorna { data: { assinatura, todasAssinaturas } }'
    });
    console.log('[API /assinaturas] ===== FIM DA BUSCA =====');
    
    return response;
  } catch (error: unknown) {
    console.error('[API /assinaturas] ===== ERRO NA BUSCA =====');
    console.error('[API /assinaturas] Erro ao buscar assinaturas:', error);
    console.error('[API /assinaturas] Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[API /assinaturas] Stack:', error instanceof Error ? error.stack : undefined);
    console.error('[API /assinaturas] Error details:', {
      message: getErrorMessage(error),
      name: error instanceof Error ? error.name : undefined,
      code: error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined,
      cause: error instanceof Error ? error.cause : undefined
    });
    console.error('[API /assinaturas] ===== FIM DO ERRO =====');
    
    return handleApiError(error);
  }
}

