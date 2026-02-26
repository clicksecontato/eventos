import { NextRequest } from 'next/server';
import { 
  getUserIdWithApiKeyOrDev,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getQueryParams
} from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

export async function POST(request: NextRequest) {
  try {
    // Ler body uma vez
    const body = await getRequestBody(request).catch(() => ({}));
    
    // Obter userId com suporte a sessão, API key ou dev mode
    let userId = await getUserIdWithApiKeyOrDev(request, body);
    
    // Se não autenticado, tentar obter do body ou query params
    if (!userId) {
      const queryParams = getQueryParams(request);
      userId = body.userId || queryParams.get('userId') || null;
      
      if (!userId) {
        return createErrorResponse(
          'Não autorizado. Use autenticação via sessão ou forneça x-api-key header com userId no body ou query param',
          401
        );
      }
    }

    const eventoRepo = repositoryFactory.getEventoRepository();
    const servicoRepo = repositoryFactory.getServicoEventoRepository();
    const servicoGlobalRepo = repositoryFactory.getServicoGlobalRepository();

    const eventos = await eventoRepo.findAll(userId);

    let totalProcessados = 0;
    let totalCriados = 0;
    let totalErros = 0;
    const erros: string[] = [];

    for (const evento of eventos) {
      try {
        const servicos = await servicoRepo.findByEventoId(userId, evento.id);

        for (const servico of servicos) {
          totalProcessados++;

          try {
            const servicoExistente = await servicoGlobalRepo.findById(
              userId,
              evento.id,
              servico.id
            );

            if (!servicoExistente) {
              await servicoGlobalRepo.createServico(
                userId,
                evento.id,
                servico.id,
                {
                  eventoId: evento.id,
                  tipoServicoId: servico.tipoServicoId,
                  observacoes: servico.observacoes,
                  removido: servico.removido,
                  dataRemocao: servico.dataRemocao,
                  motivoRemocao: servico.motivoRemocao,
                  dataCadastro: servico.dataCadastro
                }
              );
              totalCriados++;
            }
          } catch (error) {
            totalErros++;
            const errorMessage = `Erro ao processar serviço ${servico.id} do evento ${evento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
            erros.push(errorMessage);
            console.error(errorMessage, error);
          }
        }
      } catch (error) {
        const errorMessage = `Erro ao buscar serviços do evento ${evento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        erros.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    return createApiResponse({
      success: true,
      message: 'Normalização de serviços concluída',
      estatisticas: {
        totalProcessados,
        totalCriados,
        totalErros,
        totalEventos: eventos.length
      },
      erros: erros.length > 0 ? erros : undefined
    });
  } catch (error) {
    return handleApiError(error);
  }
}

