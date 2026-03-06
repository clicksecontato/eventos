import { NextRequest } from 'next/server';
import { createApiResponse, createErrorResponse, getAuthenticatedUser, handleApiError } from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';

type RecursoDados =
  | 'clientes'
  | 'clientes-all'
  | 'cliente'
  | 'eventos'
  | 'eventos-all'
  | 'eventos-arquivados'
  | 'evento'
  | 'pagamentos-evento'
  | 'pagamentos-all'
  | 'custos-evento'
  | 'custos-all'
  | 'servicos-evento'
  | 'servicos-all'
  | 'servicos-eventos'
  | 'canais-entrada'
  | 'tipos-servico'
  | 'tipos-evento'
  | 'dashboard';

function isRecursoDados(value: string | null): value is RecursoDados {
  return value !== null && [
    'clientes',
    'clientes-all',
    'cliente',
    'eventos',
    'eventos-all',
    'eventos-arquivados',
    'evento',
    'pagamentos-evento',
    'pagamentos-all',
    'custos-evento',
    'custos-all',
    'servicos-evento',
    'servicos-all',
    'servicos-eventos',
    'canais-entrada',
    'tipos-servico',
    'tipos-evento',
    'dashboard'
  ].includes(value);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const url = new URL(request.url);
    const recurso = url.searchParams.get('recurso');

    if (!isRecursoDados(recurso)) {
      return createErrorResponse('Parâmetro "recurso" inválido', 400);
    }

    const id = url.searchParams.get('id');
    const eventoId = url.searchParams.get('eventoId');
    const eventoIdsRaw = url.searchParams.get('eventoIds');
    const forceRefresh = url.searchParams.get('forceRefresh') === 'true';

    switch (recurso) {
      case 'clientes':
        return createApiResponse(await dataService.getClientes(user.id));
      case 'clientes-all':
        return createApiResponse(await dataService.getAllClientes(user.id));
      case 'cliente':
        if (!id) return createErrorResponse('Parâmetro "id" é obrigatório', 400);
        return createApiResponse(await dataService.getClienteById(id, user.id));
      case 'eventos':
        return createApiResponse(await dataService.getEventos(user.id));
      case 'eventos-all':
        return createApiResponse(await dataService.getAllEventos(user.id));
      case 'eventos-arquivados':
        return createApiResponse(await dataService.getEventosArquivados(user.id));
      case 'evento':
        if (!id) return createErrorResponse('Parâmetro "id" é obrigatório', 400);
        return createApiResponse(await dataService.getEventoById(id, user.id));
      case 'pagamentos-evento':
        if (!eventoId) return createErrorResponse('Parâmetro "eventoId" é obrigatório', 400);
        return createApiResponse(await dataService.getPagamentosPorEvento(user.id, eventoId));
      case 'pagamentos-all':
        return createApiResponse(await dataService.getAllPagamentos(user.id));
      case 'custos-evento':
        if (!eventoId) return createErrorResponse('Parâmetro "eventoId" é obrigatório', 400);
        return createApiResponse(await dataService.getCustosPorEvento(user.id, eventoId));
      case 'custos-all':
        return createApiResponse(await dataService.getAllCustos(user.id));
      case 'servicos-evento':
        if (!eventoId) return createErrorResponse('Parâmetro "eventoId" é obrigatório', 400);
        return createApiResponse(await dataService.getServicosPorEvento(user.id, eventoId));
      case 'servicos-all':
        return createApiResponse(await dataService.getAllServicos(user.id));
      case 'servicos-eventos': {
        const eventoIds = (eventoIdsRaw || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        if (eventoIds.length === 0) {
          return createApiResponse({});
        }
        const servicosPorEvento = await dataService.getServicosPorEventos(user.id, eventoIds);
        return createApiResponse(Object.fromEntries(servicosPorEvento.entries()));
      }
      case 'canais-entrada':
        return createApiResponse(await dataService.getCanaisEntradaAtivos(user.id));
      case 'tipos-servico':
        return createApiResponse(await dataService.getAllServicosCatalogo(user.id));
      case 'tipos-evento':
        return createApiResponse(await dataService.getTiposEvento(user.id));
      case 'dashboard':
        return createApiResponse(await dataService.getDashboardData(user.id, { forceRefresh }));
      default:
        return createErrorResponse('Recurso não implementado', 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

