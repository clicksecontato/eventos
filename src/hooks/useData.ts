import { useState, useEffect, useCallback } from 'react';
import { dataService } from '@/lib/data-service';
import { Cliente, Evento, Pagamento, CustoEvento, ServicoEvento, TipoServico, CanalEntrada, DashboardData, TipoEvento, PreCadastroEvento, Contrato, ValorAtrasado, ValoresAtrasadosFiltros } from '@/types';
import { useCurrentUser } from './useAuth';

export interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook para clientes (apenas ativos por padrão)
export function useClientes(): UseDataResult<Cliente[]> {
  const [data, setData] = useState<Cliente[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getClientes(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para todos os clientes (incluindo arquivados) - usado em relatórios
export function useAllClientes(): UseDataResult<Cliente[]> {
  const [data, setData] = useState<Cliente[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getAllClientes(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCliente(id: string): UseDataResult<Cliente> {
  const [data, setData] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId || !id) {
      setError('Usuário não autenticado ou ID não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getClienteById(id, userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  }, [userId, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para eventos (apenas ativos por padrão)
export function useEventos(): UseDataResult<Evento[]> {
  const [data, setData] = useState<Evento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getEventos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para todos os eventos (incluindo arquivados) - usado em relatórios
export function useAllEventos(): UseDataResult<Evento[]> {
  const [data, setData] = useState<Evento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getAllEventos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para eventos arquivados
export function useEventosArquivados(): UseDataResult<Evento[]> {
  const [data, setData] = useState<Evento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getEventosArquivados(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos arquivados');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useEvento(id: string): UseDataResult<Evento> {
  const [data, setData] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId || !id) {
      setError('Usuário não autenticado ou ID não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getEventoById(id, userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar evento');
    } finally {
      setLoading(false);
    }
  }, [userId, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para pagamentos
export function usePagamentosPorEvento(eventoId: string): UseDataResult<Pagamento[]> {
  const [data, setData] = useState<Pagamento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId || !eventoId) {
      setError('Usuário não autenticado ou ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getPagamentosPorEvento(userId, eventoId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [userId, eventoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para todos os pagamentos
export function useAllPagamentos(): UseDataResult<Pagamento[]> {
  const [data, setData] = useState<Pagamento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getAllPagamentos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para custos
export function useCustosPorEvento(eventoId: string): UseDataResult<CustoEvento[]> {
  const [data, setData] = useState<CustoEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId || !eventoId) {
      setError('Usuário não autenticado ou ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getCustosPorEvento(userId, eventoId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar custos');
    } finally {
      setLoading(false);
    }
  }, [userId, eventoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para todos os custos
export function useAllCustos(): UseDataResult<CustoEvento[]> {
  const [data, setData] = useState<CustoEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getAllCustos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar custos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para serviços
export function useServicosPorEvento(eventoId: string): UseDataResult<ServicoEvento[]> {
  const [data, setData] = useState<ServicoEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId || !eventoId) {
      setError('Usuário não autenticado ou ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getServicosPorEvento(userId, eventoId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [userId, eventoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para canais de entrada
export function useCanaisEntrada(): UseDataResult<CanalEntrada[]> {
  const [data, setData] = useState<CanalEntrada[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getCanaisEntradaAtivos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar canais de entrada');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para todos os serviços
export function useAllServicos(): UseDataResult<ServicoEvento[]> {
  const [data, setData] = useState<ServicoEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getAllServicos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para tipos de serviços
export function useTiposServicos(): UseDataResult<TipoServico[]> {
  const [data, setData] = useState<TipoServico[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getTiposServicos(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tipos de serviços');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para buscar serviços de múltiplos eventos de uma vez (otimizado)
export function useServicosPorEventos(eventoIds: string[]): {
  servicosPorEvento: Map<string, ServicoEvento[]>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [servicosPorEvento, setServicosPorEvento] = useState<Map<string, ServicoEvento[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    if (!eventoIds || eventoIds.length === 0) {
      setServicosPorEvento(new Map());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getServicosPorEventos(userId, eventoIds);
      setServicosPorEvento(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar serviços');
      setServicosPorEvento(new Map());
    } finally {
      setLoading(false);
    }
  }, [userId, eventoIds.join(',')]); // Usar join para criar dependência estável

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { servicosPorEvento, loading, error, refetch: fetchData };
}

export function useTiposEvento(): UseDataResult<TipoEvento[]> {
  const [data, setData] = useState<TipoEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await dataService.getTiposEvento(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tipos de evento');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para dashboard
export function useDashboardData(): UseDataResult<DashboardData> {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async (options?: { forceRefresh?: boolean; skipLoadingState?: boolean }) => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      if (!options?.skipLoadingState) {
        setLoading(true);
      }
      setError(null);
      const result = await dataService.getDashboardData(userId, {
        forceRefresh: options?.forceRefresh
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
    } finally {
      if (!options?.skipLoadingState) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData({ forceRefresh: true, skipLoadingState: true }), [fetchData]);

  return { data, loading, error, refetch };
}

// Hook para contratos por evento
export function useContratosPorEvento(eventoId: string): UseDataResult<Contrato[]> {
  const [data, setData] = useState<Contrato[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId || !eventoId) {
      setError('Usuário não autenticado ou ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/contratos?eventoId=${eventoId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar contratos');
      }
      
      const result = await response.json();
      const contratos = result.data || result || [];
      
      // Converter datas de string para Date se necessário
      const contratosConvertidos = contratos.map((c: any) => ({
        ...c,
        dataGeracao: c.dataGeracao ? new Date(c.dataGeracao) : new Date(),
        dataAssinatura: c.dataAssinatura ? new Date(c.dataAssinatura) : undefined,
        dataCadastro: c.dataCadastro ? new Date(c.dataCadastro) : new Date(),
        dataAtualizacao: c.dataAtualizacao ? new Date(c.dataAtualizacao) : new Date(),
      }));
      
      setData(contratosConvertidos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  }, [userId, eventoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para pré-cadastros de eventos
export function usePreCadastros(status?: string): UseDataResult<PreCadastroEvento[]> {
  const [data, setData] = useState<PreCadastroEvento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const url = status 
        ? `/api/pre-cadastros?status=${status}`
        : '/api/pre-cadastros';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Erro ao carregar pré-cadastros');
      }
      
      const result = await response.json();
      const data = result.data || result;
      const preCadastros = data.preCadastros || data || [];
      
      // Converter datas de string para Date se necessário
      const preCadastrosConvertidos = preCadastros.map((pc: any) => ({
        ...pc,
        dataExpiracao: pc.dataExpiracao ? new Date(pc.dataExpiracao) : new Date(),
        dataPreenchimento: pc.dataPreenchimento ? new Date(pc.dataPreenchimento) : undefined,
        dataConversao: pc.dataConversao ? new Date(pc.dataConversao) : undefined,
        dataEvento: pc.dataEvento ? new Date(pc.dataEvento) : undefined,
        dataCadastro: pc.dataCadastro ? new Date(pc.dataCadastro) : new Date(),
        dataAtualizacao: pc.dataAtualizacao ? new Date(pc.dataAtualizacao) : new Date(),
      }));
      
      setData(preCadastrosConvertidos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pré-cadastros');
    } finally {
      setLoading(false);
    }
  }, [userId, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Hook para valores atrasados
export interface UseValoresAtrasadosResult {
  valores: ValorAtrasado[];
  resumo: {
    totalEventos: number;
    valorTotalAtrasado: number;
    mediaDiasAtraso: number;
    maiorValorAtrasado: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useValoresAtrasados(
  filtros?: ValoresAtrasadosFiltros
): UseValoresAtrasadosResult {
  const [valores, setValores] = useState<ValorAtrasado[]>([]);
  const [resumo, setResumo] = useState<UseValoresAtrasadosResult['resumo']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useCurrentUser();

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filtros?.clienteId) params.append('clienteId', filtros.clienteId);
      if (filtros?.dataInicio) params.append('dataInicio', filtros.dataInicio.toISOString());
      if (filtros?.dataFim) params.append('dataFim', filtros.dataFim.toISOString());
      if (filtros?.diasAtrasoMin !== undefined) params.append('diasAtrasoMin', filtros.diasAtrasoMin.toString());
      if (filtros?.diasAtrasoMax !== undefined) params.append('diasAtrasoMax', filtros.diasAtrasoMax.toString());
      if (filtros?.valorMin !== undefined) params.append('valorMin', filtros.valorMin.toString());
      if (filtros?.valorMax !== undefined) params.append('valorMax', filtros.valorMax.toString());
      if (filtros?.ordenarPor) params.append('ordenarPor', filtros.ordenarPor);
      if (filtros?.ordem) params.append('ordem', filtros.ordem);
      if (filtros?.limite) params.append('limite', filtros.limite.toString());
      if (filtros?.offset) params.append('offset', filtros.offset.toString());

      const response = await fetch(`/api/valores-atrasados?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar valores atrasados');
      }

      const result = await response.json();
      const data = result.data || result;

      setValores(data.valores || []);
      setResumo(data.resumo || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar valores atrasados');
    } finally {
      setLoading(false);
    }
  }, [userId, filtros]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { valores, resumo, loading, error, refetch: fetchData };
}
