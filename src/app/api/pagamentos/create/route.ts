import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

/**
 * API route para criar pagamentos
 * Usa o cliente admin do Supabase para contornar RLS
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    // Validar permissão para registrar pagamentos
    const { getServiceFactory } = await import('@/lib/factories/service-factory');
    const serviceFactory = getServiceFactory();
    const funcionalidadeService = serviceFactory.getFuncionalidadeService();
    const temPermissao = await funcionalidadeService.verificarPermissao(user.id, 'PAGAMENTOS_REGISTRAR');
    if (!temPermissao) {
      return createErrorResponse('Seu plano não permite registrar pagamentos', 403);
    }
    
    const body = await getRequestBody(request);
    const { 
      eventoId, 
      valor, 
      dataPagamento, 
      formaPagamento, 
      status, 
      observacoes, 
      comprovante, 
      anexoId 
    } = body;

    if (!eventoId || !valor || !dataPagamento || !formaPagamento || !status) {
      return createErrorResponse('eventoId, valor, dataPagamento, formaPagamento e status são obrigatórios', 400);
    }

    // Normalizar data_pagamento
    let dataPagamentoDate: Date;
    if (dataPagamento instanceof Date) {
      dataPagamentoDate = dataPagamento;
    } else if (typeof dataPagamento === 'string') {
      const date = new Date(dataPagamento);
      if (isNaN(date.getTime())) {
        return createErrorResponse('Formato de data inválido', 400);
      }
      dataPagamentoDate = date;
    } else {
      return createErrorResponse('Data de pagamento é obrigatória e deve ser válida', 400);
    }

    const pagamentoRepo = repositoryFactory.getPagamentoRepository();
    const pagamentoCriado = await pagamentoRepo.createPagamento(
      user.id,
      eventoId,
      {
        userId: user.id,
        eventoId,
        valor: parseFloat(valor) || 0,
        dataPagamento: dataPagamentoDate,
        formaPagamento: formaPagamento,
        status: status,
        observacoes: observacoes || '',
        comprovante: comprovante,
        anexoId: anexoId,
        cancelado: false,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      }
    );

    return createApiResponse(pagamentoCriado, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

