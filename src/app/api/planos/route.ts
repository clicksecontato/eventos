import { NextRequest } from 'next/server';
import { getServiceFactory } from '@/lib/factories/service-factory';
import { AdminPlanoRepository } from '@/lib/repositories/admin-plano-repository';
import { isFirebaseAdminInitialized, getFirebaseAdminInitializationError } from '@/lib/firebase-admin';
import { 
  getAuthenticatedUserOptional,
  requireAdmin,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getQueryParams
} from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verificar se Firebase Admin está inicializado
    if (!isFirebaseAdminInitialized()) {
      const initError = getFirebaseAdminInitializationError();
      console.error('[API /planos] Firebase Admin não está inicializado:', initError?.message);
      return createErrorResponse(
        'Firebase Admin não está inicializado. Verifique as credenciais do Firebase.',
        500
      );
    }

    // Planos podem ser vistos por todos (público para landing page)
    // Usar AdminPlanoRepository no servidor para bypassar regras de segurança do Firebase
    const queryParams = getQueryParams(request);
    const apenasAtivos = queryParams.get('ativos') === 'true';

    console.log('[API /planos] ===== INÍCIO DA BUSCA =====');
    console.log('[API /planos] Parâmetros da query:', { apenasAtivos });
    
    const planoRepo = new AdminPlanoRepository();
    console.log('[API /planos] AdminPlanoRepository criado com sucesso');
    
    console.log('[API /planos] Chamando método do repositório...');
    let planos: any[] = [];
    
    try {
      planos = apenasAtivos ? await planoRepo.findAtivos() : await planoRepo.findAll();
      console.log('[API /planos] Método do repositório executado com sucesso');
    } catch (repoError: any) {
      console.error('[API /planos] Erro ao chamar método do repositório:', repoError);
      throw repoError;
    }
    
    console.log('[API /planos] ===== RESULTADO DA BUSCA =====');
    console.log('[API /planos] Total de planos encontrados:', planos.length);
    console.log('[API /planos] Tipo de dados:', typeof planos, Array.isArray(planos));
    
    if (planos.length > 0) {
      console.log('[API /planos] Primeiros planos (resumo):', planos.slice(0, 3).map(p => ({
        id: p?.id,
        nome: p?.nome,
        ativo: p?.ativo,
        preco: p?.preco,
        destaque: p?.destaque
      })));
      // Log detalhado apenas do primeiro plano para não sobrecarregar
      console.log('[API /planos] Detalhes do primeiro plano:', JSON.stringify(planos[0], null, 2));
    } else {
      console.warn('[API /planos] ⚠️ NENHUM PLANO ENCONTRADO!');
      console.warn('[API /planos] Verificando se existem planos no Firestore...');
      
      try {
        const todosPlanos = await planoRepo.findAll();
        console.warn('[API /planos] Total de planos SEM filtro ativo:', todosPlanos.length);
        if (todosPlanos.length > 0) {
          console.warn('[API /planos] Planos encontrados (sem filtro ativo):', todosPlanos.map(p => ({
            id: p?.id,
            nome: p?.nome,
            ativo: p?.ativo,
            preco: p?.preco
          })));
        } else {
          console.warn('[API /planos] ⚠️ Nenhum plano encontrado no Firestore! Verifique se os planos foram criados.');
        }
      } catch (checkError: any) {
        console.error('[API /planos] Erro ao verificar todos os planos:', checkError);
      }
    }
    
    const response = createApiResponse({ planos });
    console.log('[API /planos] Resposta sendo retornada:', {
      status: response.status,
      planosCount: planos.length,
      responseStructure: 'createApiResponse({ planos }) retorna { data: { planos: [...] } }'
    });
    console.log('[API /planos] ===== FIM DA BUSCA =====');
    
    return response;
  } catch (error: any) {
    console.error('[API /planos] ===== ERRO NA BUSCA =====');
    console.error('[API /planos] Erro ao buscar planos:', error);
    console.error('[API /planos] Tipo do erro:', error.constructor?.name);
    console.error('[API /planos] Stack:', error.stack);
    console.error('[API /planos] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      cause: error.cause
    });
    console.error('[API /planos] ===== FIM DO ERRO =====');
    
    // Se for erro de Firebase Admin não inicializado, retornar erro específico
    if (error.message?.includes('Firebase Admin não está inicializado')) {
      return createErrorResponse(error.message, 500);
    }
    
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const data = await getRequestBody(request);
    // Usar AdminPlanoRepository no servidor para bypassar regras de segurança do Firebase
    const planoRepo = new AdminPlanoRepository();
    
    const plano = await planoRepo.create({
      ...data,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    });

    return createApiResponse({ plano }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

