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
 * Endpoint para normalizar pagamentos existentes
 * 
 * Este endpoint busca todos os pagamentos da collection de eventos
 * e os cria na collection global de pagamentos (users -> pagamentos)
 * 
 * Estrutura atual: users/{userId}/eventos/{eventoId}/pagamentos/{pagamentoId}
 * Estrutura nova: users/{userId}/pagamentos/{pagamentoId}{eventoId}
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
    const pagamentoRepo = repositoryFactory.getPagamentoRepository();
    const pagamentoGlobalRepo = repositoryFactory.getPagamentoGlobalRepository();

    // Buscar todos os eventos do usuário
    const eventos = await eventoRepo.findAll(userId);
    
    let totalProcessados = 0;
    let totalCriados = 0;
    let totalErros = 0;
    const erros: string[] = [];

    // Para cada evento, buscar seus pagamentos
    for (const evento of eventos) {
      try {
        const pagamentos = await pagamentoRepo.findByEventoId(userId, evento.id);
        
        // Para cada pagamento, criar na collection global se não existir
        for (const pagamento of pagamentos) {
          totalProcessados++;
          
          try {
            // Verificar se o pagamento já existe na collection global
            const pagamentoExistente = await pagamentoGlobalRepo.findById(
              userId,
              evento.id,
              pagamento.id
            );

            if (!pagamentoExistente) {
              // Criar na collection global
              await pagamentoGlobalRepo.createPagamento(
                userId,
                evento.id,
                pagamento.id,
                {
                  userId: pagamento.userId || userId,
                  eventoId: evento.id,
                  valor: pagamento.valor,
                  dataPagamento: pagamento.dataPagamento,
                  formaPagamento: pagamento.formaPagamento,
                  status: pagamento.status,
                  observacoes: pagamento.observacoes,
                  comprovante: pagamento.comprovante,
                  anexoId: pagamento.anexoId,
                  cancelado: pagamento.cancelado,
                  dataCancelamento: pagamento.dataCancelamento,
                  motivoCancelamento: pagamento.motivoCancelamento,
                  dataCadastro: pagamento.dataCadastro,
                  dataAtualizacao: pagamento.dataAtualizacao
                }
              );
              totalCriados++;
            }
          } catch (error) {
            totalErros++;
            const errorMessage = `Erro ao processar pagamento ${pagamento.id} do evento ${evento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
            erros.push(errorMessage);
            console.error(errorMessage, error);
          }
        }
      } catch (error) {
        const errorMessage = `Erro ao buscar pagamentos do evento ${evento.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        erros.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    return createApiResponse({
      success: true,
      message: 'Normalização de pagamentos concluída',
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

