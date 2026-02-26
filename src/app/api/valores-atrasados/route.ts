import { NextRequest } from 'next/server';
import { ValoresAtrasadosService } from '@/lib/services/valores-atrasados-service';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { ValoresAtrasadosFiltros } from '@/types';

const valoresAtrasadosService = new ValoresAtrasadosService();

/**
 * GET /api/valores-atrasados
 * Busca valores atrasados com filtros opcionais
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const params = getQueryParams(request);

    // Construir filtros
    const filtros: ValoresAtrasadosFiltros = {};

    const clienteId = params.get('clienteId');
    if (clienteId) {
      filtros.clienteId = clienteId;
    }

    const dataInicio = params.get('dataInicio');
    if (dataInicio) {
      filtros.dataInicio = new Date(dataInicio);
    }

    const dataFim = params.get('dataFim');
    if (dataFim) {
      filtros.dataFim = new Date(dataFim);
    }

    const diasAtrasoMin = params.get('diasAtrasoMin');
    if (diasAtrasoMin) {
      filtros.diasAtrasoMin = parseInt(diasAtrasoMin);
    }

    const diasAtrasoMax = params.get('diasAtrasoMax');
    if (diasAtrasoMax) {
      filtros.diasAtrasoMax = parseInt(diasAtrasoMax);
    }

    const valorMin = params.get('valorMin');
    if (valorMin) {
      filtros.valorMin = parseFloat(valorMin);
    }

    const valorMax = params.get('valorMax');
    if (valorMax) {
      filtros.valorMax = parseFloat(valorMax);
    }

    const ordenarPor = params.get('ordenarPor');
    if (ordenarPor) {
      filtros.ordenarPor = ordenarPor as any;
    }

    const ordem = params.get('ordem');
    if (ordem) {
      filtros.ordem = ordem as 'asc' | 'desc';
    }

    const limite = params.get('limite');
    if (limite) {
      filtros.limite = parseInt(limite);
    }

    const offset = params.get('offset');
    if (offset) {
      filtros.offset = parseInt(offset);
    }

    // Buscar valores atrasados
    const valores = await valoresAtrasadosService.buscarValoresAtrasados(user.id, filtros);
    const resumo = await valoresAtrasadosService.calcularResumo(user.id);

    return createApiResponse({
      valores,
      resumo,
      total: valores.length
    });
  } catch (error) {
    return handleApiError(error);
  }
}
