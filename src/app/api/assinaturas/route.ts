import { NextRequest } from 'next/server';
import { AdminAssinaturaRepository } from '@/lib/repositories/admin-assinatura-repository';
import { isFirebaseAdminInitialized, getFirebaseAdminInitializationError } from '@/lib/firebase-admin';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getQueryParams
} from '@/lib/api/route-helpers';

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
    const repo = new AdminAssinaturaRepository();
    console.log('[API /assinaturas] AdminAssinaturaRepository criado com sucesso');
    
    // Admin pode ver todas, usuário apenas a sua
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
      
      console.log('[API /assinaturas] Admin buscando todas as assinaturas ativas');
      const assinaturas = await repo.findAtivas();
      console.log('[API /assinaturas] Assinaturas ativas encontradas (admin):', assinaturas.length);
      
      const response = createApiResponse({ assinaturas });
      console.log('[API /assinaturas] ===== FIM DA BUSCA (ADMIN) =====');
      return response;
    }

    // Usuário comum: retornar assinatura ativa e todas as assinaturas (para histórico)
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
  } catch (error: any) {
    console.error('[API /assinaturas] ===== ERRO NA BUSCA =====');
    console.error('[API /assinaturas] Erro ao buscar assinaturas:', error);
    console.error('[API /assinaturas] Tipo do erro:', error.constructor?.name);
    console.error('[API /assinaturas] Stack:', error.stack);
    console.error('[API /assinaturas] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      cause: error.cause
    });
    console.error('[API /assinaturas] ===== FIM DO ERRO =====');
    
    return handleApiError(error);
  }
}

