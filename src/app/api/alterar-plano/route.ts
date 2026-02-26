import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUserOptional,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { StatusAssinatura } from '@/types/funcionalidades';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';

    // Verificar autorização
    let isAuthorized = false;
    const authenticatedUser = await getAuthenticatedUserOptional();
    
    if (authenticatedUser?.role === 'admin') {
      isAuthorized = true;
    } else if (apiKey) {
      const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
      if (apiKey === validApiKey || apiKey.includes(validApiKey)) {
        isAuthorized = true;
      }
    } else if (isDevMode) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return createErrorResponse('Não autorizado. Use autenticação admin, x-api-key header ou modo desenvolvimento', 401);
    }

    const body = await getRequestBody(request);
    const { email, userId: userIdBody, codigoHotmart, codigoPlano, planoId, status } = body;

    if (!email && !userIdBody) {
      return createErrorResponse('email ou userId é obrigatório', 400);
    }

    if (!planoId && !codigoHotmart && !codigoPlano) {
      return createErrorResponse('planoId, codigoHotmart ou codigoPlano é obrigatório', 400);
    }

    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const userRepo = repositoryFactory.getUserRepository();
    const planoRepo = repositoryFactory.getPlanoRepository();
    const assinaturaService = serviceFactory.getAssinaturaService();

    // Buscar usuário pelo id ou email
    const user = userIdBody
      ? await userRepo.findById(userIdBody)
      : await userRepo.findByEmail(email);
    if (!user) {
      return createErrorResponse('Usuário não encontrado', 404);
    }

    const codigo = codigoPlano || codigoHotmart;
    const plano = planoId
      ? await planoRepo.findById(planoId)
      : await planoRepo.findByCodigoHotmart(codigo);
    if (!plano) {
      return createErrorResponse('Plano não encontrado', 404);
    }

    const resultado = await assinaturaService.definirPlanoUsuario(
      user.id,
      plano.id,
      (status || 'active') as StatusAssinatura,
      {
        origem: 'endpoint_alterar_plano',
        codigoInformado: codigo || null
      }
    );

    return createApiResponse({
      success: true,
      message: 'Plano do usuário atualizado com sucesso',
      dados: {
        usuario: {
          id: resultado.user.id,
          email: resultado.user.email,
          nome: resultado.user.nome
        },
        plano: {
          id: plano.id,
          nome: plano.nome,
          codigoHotmart: plano.codigoHotmart
        },
        assinatura: {
          id: resultado.assinatura.id,
          status: resultado.assinatura.status,
          dataInicio: resultado.assinatura.dataInicio,
          dataRenovacao: resultado.assinatura.dataRenovacao
        },
        acao: 'definir_plano_manual'
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

