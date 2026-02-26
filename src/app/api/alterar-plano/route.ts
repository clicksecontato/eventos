import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUserOptional,
  requireAdmin,
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
    const { email, codigoHotmart } = body;

    if (!email || !codigoHotmart) {
      return createErrorResponse('email e codigoHotmart são obrigatórios', 400);
    }

    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const userRepo = repositoryFactory.getUserRepository();
    const planoRepo = repositoryFactory.getPlanoRepository();
    const assinaturaService = serviceFactory.getAssinaturaService();
    const assinaturaRepo = repositoryFactory.getAssinaturaRepository();

    // Buscar usuário pelo email
    const user = await userRepo.findByEmail(email);
    if (!user) {
      return createErrorResponse('Usuário não encontrado com o email fornecido', 404);
    }

    // Buscar plano pelo codigoHotmart
    const plano = await planoRepo.findByCodigoHotmart(codigoHotmart);
    if (!plano) {
      return createErrorResponse('Plano não encontrado com o codigoHotmart fornecido', 404);
    }

    // Verificar se usuário já tem assinatura (buscar todas para verificar)
    const todasAssinaturas = await assinaturaRepo.findAllByUserId(user.id);
    const assinaturaAtiva = todasAssinaturas.find(a => a.status === 'active' || a.status === 'trial');
    const assinaturaExistente = assinaturaAtiva || (todasAssinaturas.length > 0 ? todasAssinaturas[0] : null);

    let assinatura: any;
    let acao: string;

    if (!assinaturaExistente) {
      // Criar nova assinatura
      assinatura = await assinaturaService.criarAssinaturaUsuario(
        user.id,
        plano.id,
        'active'
      );
      acao = 'criada';
    } else {
      // Atualizar assinatura existente
      const agora = new Date();
      let dataRenovacao: Date | undefined;
      
      if (plano.intervalo === 'mensal') {
        dataRenovacao = new Date(agora);
        dataRenovacao.setMonth(dataRenovacao.getMonth() + 1);
      } else if (plano.intervalo === 'anual') {
        dataRenovacao = new Date(agora);
        dataRenovacao.setFullYear(dataRenovacao.getFullYear() + 1);
      }

      // Adicionar ao histórico
      await assinaturaRepo.addHistorico(assinaturaExistente.id, {
        data: agora,
        acao: `Plano alterado para ${plano.nome}`,
        detalhes: {
          planoAnterior: assinaturaExistente.planoId,
          planoNovo: plano.id,
          codigoHotmart
        }
      });

      // Atualizar assinatura
      assinatura = await assinaturaRepo.update(assinaturaExistente.id, {
        ...assinaturaExistente,
        planoId: plano.id,
        status: 'active' as StatusAssinatura,
        dataInicio: agora,
        dataFim: undefined,
        dataRenovacao,
        funcionalidadesHabilitadas: plano.funcionalidades || [],
        dataAtualizacao: agora
      });

      acao = 'atualizada';
    }

    // Sincronizar plano no usuário
    const userAtualizado = await assinaturaService.sincronizarPlanoUsuario(user.id);

    return createApiResponse({
      success: true,
      message: `Assinatura ${acao} com sucesso`,
      dados: {
        usuario: {
          id: userAtualizado.id,
          email: userAtualizado.email,
          nome: userAtualizado.nome
        },
        plano: {
          id: plano.id,
          nome: plano.nome,
          codigoHotmart: plano.codigoHotmart
        },
        assinatura: {
          id: assinatura.id,
          status: assinatura.status,
          dataInicio: assinatura.dataInicio,
          dataRenovacao: assinatura.dataRenovacao
        },
        acao
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

