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

/**
 * Endpoint para normalizar custos existentes
 * 
 * Este endpoint busca todos os custos da collection de eventos
 * e os cria na collection global de custos (users -> custos)
 * 
 * Estrutura atual: users/{userId}/eventos/{eventoId}/custos/{custoId}
 * Estrutura nova: users/{userId}/custos/{custoId}{eventoId}
 */
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
    const custoRepo = repositoryFactory.getCustoEventoRepository();
    const custoGlobalRepo = repositoryFactory.getCustoGlobalRepository();

    // Buscar todos os eventos do usuário
    const eventos = await eventoRepo.findAll(userId);
    
    let totalProcessados = 0;
    let totalCriados = 0;
    let totalErros = 0;
    const erros: string[] = [];

    // Para cada evento, buscar seus custos
    for (const evento of eventos) {
      try {
        const custos = await custoRepo.findByEventoId(userId, evento.id);
        
        // Para cada custo, criar na collection global se não existir
        for (const custo of custos) {
          totalProcessados++;
          
          try {
            // Verificar se o custo já existe na collection global
            const custoExistente = await custoGlobalRepo.findById(
              userId,
              evento.id,
              custo.id
            );

            if (!custoExistente) {
              // Criar na collection global
              await custoGlobalRepo.createCusto(
                userId,
                evento.id,
                custo.id,
                {
                  eventoId: evento.id,
                  tipoCustoId: custo.tipoCustoId,
                  valor: custo.valor,
                  quantidade: custo.quantidade,
                  observacoes: custo.observacoes,
                  removido: custo.removido,
                  dataRemocao: custo.dataRemocao,
                  motivoRemocao: custo.motivoRemocao,
                  dataCadastro: custo.dataCadastro
                }
              );
              totalCriados++;
            }
          } catch (error) {
            totalErros++;
            const errorMessage = `Erro ao processar custo ${custo.id} do evento ${evento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
            erros.push(errorMessage);
            console.error(errorMessage, error);
          }
        }
      } catch (error) {
        const errorMessage = `Erro ao buscar custos do evento ${evento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        erros.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    return createApiResponse({
      success: true,
      message: 'Normalização de custos concluída',
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

