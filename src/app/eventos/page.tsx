'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Layout from '@/components/Layout';
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAgendamentoAlocacoesPorEventos, useAgendamentoProfissionais, useEventos, useEventosArquivados, useTiposEvento, useServicosPorEventos, usePreCadastros } from '@/hooks/useData';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';
import { usePlano } from '@/lib/hooks/usePlano';
import LimiteUsoCompacto from '@/components/LimiteUsoCompacto';
import PlanOverlay from '@/components/PlanOverlay';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Evento, DEFAULT_TIPOS_EVENTO } from '@/types';
import DateRangeFilter, { DateFilter, getQuickFilterRange, isDateInFilter } from '@/components/filters/DateRangeFilter';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ServicosBadges from '@/components/ServicosBadges';
import EventoStatusSelect from '@/components/EventoStatusSelect';
import PreCadastrosSection from '@/components/PreCadastrosSection';

function EventosPageContent() {
  const ITENS_POR_PAGINA_PADRAO = 10;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useCurrentUser();
  const [filterProfissional, setFilterProfissional] = useState<string>('todos');
  const [paginaAtivos, setPaginaAtivos] = useState(1);
  const [paginaArquivados, setPaginaArquivados] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(ITENS_POR_PAGINA_PADRAO);
  const profissionalFiltroAtivo = filterProfissional !== 'todos' ? filterProfissional : undefined;
  const { data: eventos, loading: loadingAtivos, error: errorAtivos, refetch: refetchAtivos } = useEventos(
    profissionalFiltroAtivo,
    { limit: itensPorPagina, offset: (paginaAtivos - 1) * itensPorPagina }
  );
  const { data: eventosArquivados, loading: loadingArquivados, error: errorArquivados, refetch: refetchArquivados } = useEventosArquivados(
    profissionalFiltroAtivo,
    { limit: itensPorPagina, offset: (paginaArquivados - 1) * itensPorPagina }
  );
  const { data: tiposEventoData } = useTiposEvento();
  const { data: preCadastros } = usePreCadastros();
  const { data: profissionaisAgendamento } = useAgendamentoProfissionais();
  const { limites } = usePlano();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'arquivados' | 'pre-cadastros'>('ativos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [eventoParaArquivar, setEventoParaArquivar] = useState<Evento | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const serializarFiltroData = React.useCallback((filtro: DateFilter | null) => {
    if (!filtro?.range.startDate || !filtro?.range.endDate) return 'null';
    return JSON.stringify({
      type: filtro.type,
      quickFilter: filtro.quickFilter || '',
      start: format(filtro.range.startDate, 'yyyy-MM-dd'),
      end: format(filtro.range.endDate, 'yyyy-MM-dd')
    });
  }, []);

  const atualizarQueryParams = React.useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([chave, valor]) => {
      if (!valor) {
        params.delete(chave);
        return;
      }
      params.set(chave, valor);
    });

    const query = params.toString();
    router.replace(query ? `/eventos?${query}` : '/eventos');
  }, [router, searchParams]);
  
  const loading = loadingAtivos || loadingArquivados;
  const error = errorAtivos || errorArquivados;
  
  // Estado local para atualização otimista
  const [eventosLocais, setEventosLocais] = useState<Evento[] | null>(null);
  const [eventosArquivadosLocais, setEventosArquivadosLocais] = useState<Evento[] | null>(null);
  
  // Sincronizar estado local com dados dos hooks
  useEffect(() => {
    if (eventos !== null) {
      setEventosLocais(eventos);
    }
  }, [eventos]);
  
  useEffect(() => {
    if (eventosArquivados !== null) {
      setEventosArquivadosLocais(eventosArquivados);
    }
  }, [eventosArquivados]);

  useEffect(() => {
    const abaParam = searchParams.get('aba');
    const buscaParam = searchParams.get('busca') || '';
    const tipoParam = searchParams.get('tipo') || 'todos';
    const statusParam = searchParams.get('status') || 'todos';
    const dateTypeParam = searchParams.get('dateType');
    const quickParam = searchParams.get('quick');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const profissionalParam = searchParams.get('profissional');
    const paginaAtivosParam = Number.parseInt(searchParams.get('paginaAtivos') || '1', 10);
    const paginaArquivadosParam = Number.parseInt(searchParams.get('paginaArquivados') || '1', 10);
    const itensPorPaginaParam = Number.parseInt(searchParams.get('itensPorPagina') || String(ITENS_POR_PAGINA_PADRAO), 10);

    if (abaParam === 'ativos' || abaParam === 'arquivados' || abaParam === 'pre-cadastros') {
      setAbaAtiva((atual) => (atual === abaParam ? atual : abaParam));
    }

    setSearchTerm((atual) => (atual === buscaParam ? atual : buscaParam));
    setFilterTipo((atual) => (atual === tipoParam ? atual : tipoParam));
    setFilterStatus((atual) => (atual === statusParam ? atual : statusParam));

    let proximoDateFilter: DateFilter | null = null;
    if (dateTypeParam === 'quick' && quickParam) {
      const range = getQuickFilterRange(quickParam);
      if (range.startDate && range.endDate) {
        proximoDateFilter = {
          type: 'quick',
          quickFilter: quickParam,
          range
        };
      }
    } else if (dateTypeParam === 'custom' && startParam && endParam) {
      const startDate = new Date(`${startParam}T00:00:00`);
      const endDate = new Date(`${endParam}T23:59:59`);
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
        proximoDateFilter = {
          type: 'custom',
          range: { startDate, endDate }
        };
      }
    }
    setDateFilter((atual) => (
      serializarFiltroData(atual) === serializarFiltroData(proximoDateFilter)
        ? atual
        : proximoDateFilter
    ));

    const profissionalNormalizado = profissionalParam?.trim() ? profissionalParam : 'todos';
    setFilterProfissional((atual) => (atual === profissionalNormalizado ? atual : profissionalNormalizado));

    const paginaAtivosNormalizada = Number.isNaN(paginaAtivosParam) || paginaAtivosParam < 1 ? 1 : paginaAtivosParam;
    const paginaArquivadosNormalizada = Number.isNaN(paginaArquivadosParam) || paginaArquivadosParam < 1 ? 1 : paginaArquivadosParam;
    const itensPorPaginaNormalizado = [10, 25, 50].includes(itensPorPaginaParam)
      ? itensPorPaginaParam
      : ITENS_POR_PAGINA_PADRAO;

    setPaginaAtivos((atual) => (atual === paginaAtivosNormalizada ? atual : paginaAtivosNormalizada));
    setPaginaArquivados((atual) => (atual === paginaArquivadosNormalizada ? atual : paginaArquivadosNormalizada));
    setItensPorPagina((atual) => (atual === itensPorPaginaNormalizado ? atual : itensPorPaginaNormalizado));
  }, [searchParams, serializarFiltroData]);
  
  const eventosLista = abaAtiva === 'ativos' 
    ? (eventosLocais ?? eventos ?? []) 
    : (eventosArquivadosLocais ?? eventosArquivados ?? []);

  const recarregarEventos = async () => {
    await Promise.all([refetchAtivos(), refetchArquivados()]);
  };

  const handleChangeProfissional = React.useCallback((value: string) => {
    setFilterProfissional(value);
    setPaginaAtivos(1);
    setPaginaArquivados(1);
    atualizarQueryParams({
      profissional: value === 'todos' ? undefined : value,
      paginaAtivos: '1',
      paginaArquivados: '1'
    });
  }, [atualizarQueryParams]);

  const handleChangeBusca = React.useCallback((value: string) => {
    setSearchTerm(value);
    setPaginaAtivos(1);
    setPaginaArquivados(1);
    atualizarQueryParams({
      busca: value.trim() ? value : undefined,
      paginaAtivos: '1',
      paginaArquivados: '1'
    });
  }, [atualizarQueryParams]);

  const handleChangeTipo = React.useCallback((value: string) => {
    setFilterTipo(value);
    setPaginaAtivos(1);
    setPaginaArquivados(1);
    atualizarQueryParams({
      tipo: value === 'todos' ? undefined : value,
      paginaAtivos: '1',
      paginaArquivados: '1'
    });
  }, [atualizarQueryParams]);

  const handleChangeStatus = React.useCallback((value: string) => {
    setFilterStatus(value);
    setPaginaAtivos(1);
    setPaginaArquivados(1);
    atualizarQueryParams({
      status: value === 'todos' ? undefined : value,
      paginaAtivos: '1',
      paginaArquivados: '1'
    });
  }, [atualizarQueryParams]);

  const handleChangeItensPorPagina = React.useCallback((value: string) => {
    const itens = Number.parseInt(value, 10);
    const itensValidados = [10, 25, 50].includes(itens) ? itens : ITENS_POR_PAGINA_PADRAO;
    setItensPorPagina(itensValidados);
    setPaginaAtivos(1);
    setPaginaArquivados(1);
    atualizarQueryParams({
      itensPorPagina: String(itensValidados),
      paginaAtivos: '1',
      paginaArquivados: '1'
    });
  }, [atualizarQueryParams]);

  const handleChangeDateFilter = React.useCallback((filtro: DateFilter | null) => {
    setDateFilter(filtro);
    setPaginaAtivos(1);
    setPaginaArquivados(1);

    if (!filtro?.range.startDate || !filtro?.range.endDate) {
      atualizarQueryParams({
        dateType: undefined,
        quick: undefined,
        start: undefined,
        end: undefined,
        paginaAtivos: '1',
        paginaArquivados: '1'
      });
      return;
    }

    atualizarQueryParams({
      dateType: filtro.type,
      quick: filtro.type === 'quick' ? filtro.quickFilter : undefined,
      start: filtro.type === 'custom' ? format(filtro.range.startDate, 'yyyy-MM-dd') : undefined,
      end: filtro.type === 'custom' ? format(filtro.range.endDate, 'yyyy-MM-dd') : undefined,
      paginaAtivos: '1',
      paginaArquivados: '1'
    });
  }, [atualizarQueryParams]);

  // Mapeamento de tipoEventoId -> nome do tipo de evento (otimização)
  const tiposEventoMap = React.useMemo(() => {
    const map = new Map<string, string>();
    
    // Adicionar tipos de evento do banco (estes têm IDs)
    if (tiposEventoData) {
      tiposEventoData.forEach(tipo => {
        map.set(tipo.id, tipo.nome);
      });
    }
    
    return map;
  }, [tiposEventoData]);

  // Função auxiliar para obter o nome do tipo de evento
  const getTipoEventoNome = (evento: Evento): string => {
    // Se tiver tipoEventoId, usar o mapeamento
    if (evento.tipoEventoId && tiposEventoMap.has(evento.tipoEventoId)) {
      return tiposEventoMap.get(evento.tipoEventoId)!;
    }
    // Fallback para o nome direto (para compatibilidade)
    return evento.tipoEvento || 'Sem tipo';
  };

  // Função auxiliar para obter cor do status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Agendado':
        return 'bg-blue-100 text-blue-800';
      case 'Confirmado':
        return 'bg-green-100 text-green-800';
      case 'Em andamento':
        return 'bg-yellow-100 text-yellow-800';
      case 'Concluído':
        return 'bg-gray-100 text-gray-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tiposEventoFilterOptions = React.useMemo(() => {
    const nomes = new Set<string>();
    const options = [
      { value: 'todos', label: 'Todos' }
    ];

    const fontes = [
      ...(tiposEventoData ?? []).filter(tipo => tipo.ativo).map(tipo => tipo.nome),
      ...DEFAULT_TIPOS_EVENTO.map(tipo => tipo.nome),
      ...eventosLista.map(evento => getTipoEventoNome(evento))
    ];

    fontes.forEach(nome => {
      if (nome && !nomes.has(nome)) {
        nomes.add(nome);
        options.push({
          value: nome,
          label: nome
        });
      }
    });

    return options;
  }, [tiposEventoData, eventosLista, tiposEventoMap]);

  const eventoIdsTodos = useMemo(() => {
    return eventosLista.map((evento) => evento.id);
  }, [eventosLista]);

  const { alocacoesPorEvento, loading: loadingAlocacoes, error: errorAlocacoes } = useAgendamentoAlocacoesPorEventos(eventoIdsTodos, profissionalFiltroAtivo);

  const profissionaisMap = useMemo(() => {
    const mapa = new Map<string, string>();
    (profissionaisAgendamento || []).forEach((profissional) => {
      mapa.set(profissional.id, profissional.nome);
    });
    return mapa;
  }, [profissionaisAgendamento]);

  const profissionaisFilterOptions = useMemo(() => {
    const options = [{ value: 'todos', label: 'Todos os profissionais' }];
    const idsUtilizados = new Set<string>();

    for (const alocacoes of alocacoesPorEvento.values()) {
      const alocacaoAtiva = alocacoes.find((alocacao) => alocacao.status !== 'cancelado');
      if (alocacaoAtiva?.profissionalId) {
        idsUtilizados.add(alocacaoAtiva.profissionalId);
      }
    }

    idsUtilizados.forEach((profissionalId) => {
      const nome = profissionaisMap.get(profissionalId) || 'Profissional';
      options.push({
        value: profissionalId,
        label: nome
      });
    });

    return options.sort((a, b) => {
      if (a.value === 'todos') return -1;
      if (b.value === 'todos') return 1;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
  }, [alocacoesPorEvento, profissionaisMap]);

  // Filtrar eventos - chamado antes dos early returns para seguir as regras dos hooks
  const filteredEventos = useMemo(() => {
    if (!eventosLista || eventosLista.length === 0) {
      return [];
    }
    
    return eventosLista.filter(evento => {
      // Verificações de segurança para evitar erros com valores undefined/null
      const clienteNome = evento.cliente?.nome || '';
      const nomeEvento = evento.nomeEvento || '';
      
      const matchesSearch = clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           nomeEvento.toLowerCase().includes(searchTerm.toLowerCase());
      const tipoEventoNome = getTipoEventoNome(evento);
      const matchesTipo = filterTipo === 'todos' || tipoEventoNome === filterTipo;
      const matchesDate = isDateInFilter(evento.dataEvento, dateFilter);
      const matchesStatus = filterStatus === 'todos' || evento.status === filterStatus;
      const alocacaoAtiva = (alocacoesPorEvento.get(evento.id) || []).find((alocacao) => alocacao.status !== 'cancelado');
      const matchesProfissional = filterProfissional === 'todos' || alocacaoAtiva?.profissionalId === filterProfissional;
      
      return matchesSearch && matchesTipo && matchesDate && matchesStatus && matchesProfissional;
    });
  }, [eventosLista, searchTerm, filterTipo, dateFilter, filterStatus, filterProfissional, alocacoesPorEvento, tiposEventoMap]);

  // Ordenar eventos por data do evento em ordem crescente - chamado antes dos early returns
  const sortedEventos = useMemo(() => {
    if (!filteredEventos || filteredEventos.length === 0) {
      return [];
    }
    
    return [...filteredEventos].sort((a, b) => {
      const dataA = a.dataEvento instanceof Date ? a.dataEvento.getTime() : new Date(a.dataEvento).getTime();
      const dataB = b.dataEvento instanceof Date ? b.dataEvento.getTime() : new Date(b.dataEvento).getTime();
      return dataA - dataB;
    });
  }, [filteredEventos]);

  // Extrair IDs dos eventos filtrados para buscar serviços
  const eventoIds = useMemo(() => {
    return sortedEventos.map(evento => evento.id);
  }, [sortedEventos]);

  const paginaAtual = abaAtiva === 'ativos' ? paginaAtivos : paginaArquivados;
  const temPaginaAnterior = paginaAtual > 1;
  const temProximaPagina = sortedEventos.length === itensPorPagina;

  // Buscar serviços de todos os eventos filtrados de uma vez (otimização)
  const { servicosPorEvento, loading: loadingServicos, error: errorServicos } = useServicosPorEventos(eventoIds);
  // Early returns após todos os hooks
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando eventos...</div>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-error">Erro ao carregar eventos: {error}</div>
        </div>
      </Layout>
    );
  }
  
  if (!eventos) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Nenhum evento encontrado</div>
        </div>
      </Layout>
    );
  }

  const handleView = (evento: Evento) => {
    router.push(`/eventos/${evento.id}`);
  };

  const handleEdit = (evento: Evento) => {
    router.push(`/eventos/${evento.id}/editar`);
  };

  const handleExcluirEvento = (evento: Evento) => {
    setEventoParaArquivar(evento);
    setShowDeleteDialog(true);
  };

  const handleConfirmarArquivamento = async () => {
    if (!eventoParaArquivar || !userId) return;

    try {
      await dataService.deleteEvento(eventoParaArquivar.id, userId);
      showToast('Evento arquivado com sucesso!', 'success');
      await recarregarEventos();
      setEventoParaArquivar(null);
      setShowDeleteDialog(false);
    } catch (error) {
      showToast('Erro ao arquivar evento', 'error');
    }
  };

  const handleDesarquivar = async (evento: Evento) => {
    if (!userId) return;

    try {
      await dataService.desarquivarEvento(evento.id, userId);
      showToast('Evento desarquivado com sucesso!', 'success');
      await recarregarEventos();
    } catch (error) {
      showToast('Erro ao desarquivar evento', 'error');
    }
  };

  const handleStatusChange = async (eventoId: string, novoStatus: string) => {
    if (!userId) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    // Encontrar o evento na lista atual
    const evento = eventosLista.find(e => e.id === eventoId);
    if (!evento) {
      showToast('Evento não encontrado', 'error');
      return;
    }

    const statusAnterior = evento.status;
    const novoStatusTyped = novoStatus as Evento['status'];

    // Atualização otimista - atualizar UI imediatamente
    const atualizarEventoLocal = (eventos: Evento[] | null) => {
      if (!eventos) return eventos;
      return eventos.map(e => 
        e.id === eventoId ? { ...e, status: novoStatusTyped } : e
      );
    };

    if (abaAtiva === 'ativos') {
      setEventosLocais(prev => atualizarEventoLocal(prev));
    } else {
      setEventosArquivadosLocais(prev => atualizarEventoLocal(prev));
    }

    // Atualizar no backend de forma assíncrona
    try {
      await dataService.updateEvento(eventoId, { status: novoStatusTyped }, userId);
      showToast('Status atualizado com sucesso!', 'success');
    } catch (error) {
      // Erro - reverter a atualização otimista
      const reverterEvento = (eventos: Evento[] | null) => {
        if (!eventos) return eventos;
        return eventos.map(e => 
          e.id === eventoId ? { ...e, status: statusAnterior } : e
        );
      };

      if (abaAtiva === 'ativos') {
        setEventosLocais(prev => reverterEvento(prev));
      } else {
        setEventosArquivadosLocais(prev => reverterEvento(prev));
      }

      showToast('Erro ao atualizar status do evento', 'error');
      throw error; // Re-lançar para o componente tratar
    }
  };

  return (
    <Layout>
      <PlanOverlay>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Eventos
              </h1>
              {/* Descrição visível apenas em telas grandes */}
              <p className="hidden sm:block text-text-secondary mt-1">
                Gerencie todos os eventos agendados
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Limite de Eventos Compacto */}
              {limites && limites.eventosLimiteMes !== undefined && (
                <LimiteUsoCompacto
                  usado={limites.eventosMesAtual}
                  limite={limites.eventosLimiteMes}
                  tipo="eventos"
                  periodo="mes"
                />
              )}
              <div className="flex space-x-2 flex-shrink-0">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => recarregarEventos()}
                        disabled={loading}
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-medium">
                      <p>Atualizar lista de eventos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => router.push('/eventos/novo')} 
                        className="btn-add"
                        size="icon"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-medium">
                      <p>Novo evento</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          {/* Descrição visível apenas em telas pequenas, abaixo dos botões */}
          <p className="block sm:hidden text-text-secondary text-sm">
            Gerencie todos os eventos agendados
          </p>
        </div>

        {/* Abas */}
        <Card>
          <CardContent className="p-0">
            <div className="flex gap-2 p-2">
              <button
                onClick={() => {
                  setAbaAtiva('ativos');
                  setFilterStatus('todos'); // Resetar filtro de status ao mudar para ativos
                  atualizarQueryParams({ aba: 'ativos', status: undefined });
                }}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'ativos'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Ativos ({eventos?.length || 0})
              </button>
              <button
                onClick={() => {
                  setAbaAtiva('arquivados');
                  setFilterStatus('todos'); // Resetar filtro de status ao mudar para arquivados
                  atualizarQueryParams({ aba: 'arquivados', status: undefined });
                }}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'arquivados'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Arquivados ({eventosArquivados?.length || 0})
              </button>
              <button
                onClick={() => {
                  setAbaAtiva('pre-cadastros');
                  setFilterStatus('todos');
                  atualizarQueryParams({ aba: 'pre-cadastros', status: undefined });
                }}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer relative ${
                  abaAtiva === 'pre-cadastros'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Pré-Cadastros
                {preCadastros && preCadastros.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-primary rounded-full">
                    {preCadastros.filter(pc => {
                      const status = typeof pc.status === 'string' ? pc.status.toLowerCase() : pc.status;
                      return status === 'pendente' || status === 'preenchido';
                    }).length}
                  </span>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Pré-Cadastros */}
        {abaAtiva === 'pre-cadastros' && (
          <PreCadastrosSection />
        )}

        {/* Filtros por Status - apenas para eventos ativos */}
        {abaAtiva === 'ativos' && (
          <Card>
            <CardContent className="p-0">
              <div className="flex gap-2 p-2 overflow-x-auto">
                <button
                  onClick={() => handleChangeStatus('todos')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'todos'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => handleChangeStatus('Agendado')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Agendado'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Agendado ({eventosLista.filter(e => e.status === 'Agendado').length})
                </button>
                <button
                  onClick={() => handleChangeStatus('Confirmado')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Confirmado'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Confirmado ({eventosLista.filter(e => e.status === 'Confirmado').length})
                </button>
                <button
                  onClick={() => handleChangeStatus('Em andamento')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Em andamento'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Em andamento ({eventosLista.filter(e => e.status === 'Em andamento').length})
                </button>
                <button
                  onClick={() => handleChangeStatus('Concluído')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Concluído'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Concluído ({eventosLista.filter(e => e.status === 'Concluído').length})
                </button>
                <button
                  onClick={() => handleChangeStatus('Cancelado')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Cancelado'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Cancelado ({eventosLista.filter(e => e.status === 'Cancelado').length})
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros - apenas para eventos */}
        {abaAtiva !== 'pre-cadastros' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Filtro por Período */}
          <div>
            <DateRangeFilter 
              onFilterChange={handleChangeDateFilter}
              initialFilter={dateFilter}
              className="w-full"
            />
          </div>

          {/* Filtros Básicos */}
          <Card className="lg:col-span-2 bg-surface/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Input
                    label="Buscar"
                    placeholder="Nome do evento ou cliente..."
                    value={searchTerm}
                    onChange={(e) => handleChangeBusca(e.target.value)}
                  />
                </div>
                <div>
                  <Select
                    label="Tipo"
                    value={filterTipo}
                    onValueChange={handleChangeTipo}
                    options={tiposEventoFilterOptions}
                  />
                </div>
                <div>
                  <Select
                    label="Profissional"
                    value={filterProfissional}
                    onValueChange={handleChangeProfissional}
                    options={profissionaisFilterOptions}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Resumo dos Filtros Ativos - apenas para eventos */}
        {abaAtiva !== 'pre-cadastros' && (searchTerm || filterTipo !== 'todos' || filterProfissional !== 'todos' || dateFilter || (abaAtiva === 'ativos' && filterStatus !== 'todos')) && (
          <Card className="bg-surface/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-text-primary">Filtros ativos:</span>
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-bg text-info-text">
                        Busca: &quot;{searchTerm}&quot;
                      </span>
                    )}
                    {filterTipo !== 'todos' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        Tipo: {filterTipo}
                      </span>
                    )}
                    {filterProfissional !== 'todos' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Profissional: {profissionaisMap.get(filterProfissional) || 'Profissional'}
                      </span>
                    )}
                    {abaAtiva === 'ativos' && filterStatus !== 'todos' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Status: {filterStatus}
                      </span>
                    )}
                    {dateFilter && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-bg text-warning-text">
                        {dateFilter.type === 'quick' 
                          ? `Período: ${dateFilter.quickFilter}`
                          : `Período: ${format(dateFilter.range.startDate!, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateFilter.range.endDate!, 'dd/MM/yyyy', { locale: ptBR })}`
                        }
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  {sortedEventos.length} evento{sortedEventos.length !== 1 ? 's' : ''} encontrado{sortedEventos.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Eventos - apenas para eventos */}
        {abaAtiva !== 'pre-cadastros' && (
        <div className="space-y-4">
          {sortedEventos.map((evento) => {
            const servicosDoEvento = servicosPorEvento.get(evento.id) || [];
            const alocacoesDoEvento = alocacoesPorEvento.get(evento.id) || [];
            const alocacaoAtiva = alocacoesDoEvento.find((alocacao) => alocacao.status !== 'cancelado');
            const nomeProfissional = alocacaoAtiva ? (profissionaisMap.get(alocacaoAtiva.profissionalId) || 'Profissional') : null;
            return (
            <Card 
              key={evento.id} 
              className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              onClick={() => handleView(evento)}
            >
              <CardHeader>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-4">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg leading-tight text-text-primary break-words">
                        {evento.nomeEvento || evento.cliente?.nome || 'Evento sem nome'}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm text-text-secondary">
                        <span className="block text-text-primary font-medium truncate lg:whitespace-normal">
                          {evento.cliente?.nome || 'Cliente não encontrado'}
                        </span>
                      </CardDescription>
                    </div>
                    {/* Status Select no topo direito */}
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <EventoStatusSelect
                        eventoId={evento.id}
                        statusAtual={evento.status}
                        onStatusChange={handleStatusChange}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {/* Em telas pequenas: cada informação em uma linha */}
                  {/* Em telas grandes: data, início e desmontagem na mesma linha */}
                  <div className="flex flex-col md:flex-row md:items-center md:gap-4 space-y-2 md:space-y-0">
                    <div className="flex items-center text-sm text-text-secondary">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(evento.dataEvento, 'dd/MM/yyyy', { locale: ptBR })} - {evento.diaSemana}
                    </div>
                    {evento.horarioInicio && (
                      <div className="flex items-center text-sm text-text-secondary">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Início: {evento.horarioInicio}
                      </div>
                    )}
                    {(evento.horarioFim || evento.horarioDesmontagem) && (
                      <div className="flex items-center text-sm text-text-secondary">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Fim: {evento.horarioFim || evento.horarioDesmontagem}
                      </div>
                    )}
                  </div>
                  {alocacaoAtiva && (
                    <div className="text-sm text-text-secondary">
                      Profissional: <span className="font-medium text-text-primary">{nomeProfissional}</span>
                      {' '}({alocacaoAtiva.status})
                    </div>
                  )}
                </div>

                {/* Tipos de Serviços */}
                {loadingServicos ? (
                  <div className="pt-2 text-xs text-text-secondary">
                    Carregando serviços...
                  </div>
                ) : servicosDoEvento.length > 0 ? (
                  <div className="pt-2">
                    <ServicosBadges 
                      servicos={servicosDoEvento} 
                      className="mt-2"
                    />
                  </div>
                ) : null}
                {errorServicos && (
                  <div className="pt-2 text-xs text-error">
                    Erro ao carregar serviços: {errorServicos}
                  </div>
                )}
                {errorAlocacoes && (
                  <div className="pt-2 text-xs text-error">
                    Erro ao carregar agendamento: {errorAlocacoes}
                  </div>
                )}
                {loadingAlocacoes && (
                  <div className="pt-2 text-xs text-text-secondary">
                    Carregando agendamento...
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-text-primary">
                        {getTipoEventoNome(evento)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/agendamento?eventoId=${evento.id}`);
                              }}
                            >
                              <ClockIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Gerenciar agendamento</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="action-view" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(evento);
                              }}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Visualizar evento</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="action-edit" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(evento);
                              }}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Editar evento</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {abaAtiva === 'ativos' ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="action-delete" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExcluirEvento(evento);
                                }}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Arquivar evento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="action-view" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDesarquivar(evento);
                                }}
                              >
                                <ArrowPathIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Desarquivar evento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
        )}

        {abaAtiva !== 'pre-cadastros' && sortedEventos.length > 0 && (
          <Card className="bg-surface/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-text-secondary">
                  Página {paginaAtual}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-44">
                    <Select
                      label="Itens por página"
                      value={String(itensPorPagina)}
                      onValueChange={handleChangeItensPorPagina}
                      options={[
                        { value: '10', label: '10 por página' },
                        { value: '25', label: '25 por página' },
                        { value: '50', label: '50 por página' }
                      ]}
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={!temPaginaAnterior}
                    onClick={() => {
                      const proximaPagina = Math.max(1, paginaAtual - 1);
                      if (abaAtiva === 'ativos') {
                        setPaginaAtivos(proximaPagina);
                        atualizarQueryParams({ paginaAtivos: String(proximaPagina) });
                      } else {
                        setPaginaArquivados(proximaPagina);
                        atualizarQueryParams({ paginaArquivados: String(proximaPagina) });
                      }
                    }}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!temProximaPagina}
                    onClick={() => {
                      const proximaPagina = paginaAtual + 1;
                      if (abaAtiva === 'ativos') {
                        setPaginaAtivos(proximaPagina);
                        atualizarQueryParams({ paginaAtivos: String(proximaPagina) });
                      } else {
                        setPaginaArquivados(proximaPagina);
                        atualizarQueryParams({ paginaArquivados: String(proximaPagina) });
                      }
                    }}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sortedEventos.length === 0 && abaAtiva !== 'pre-cadastros' && (
          <Card className="bg-surface/50 backdrop-blur-sm">
            <CardContent className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">
                {searchTerm 
                  ? 'Nenhum evento encontrado' 
                  : abaAtiva === 'ativos' 
                    ? 'Nenhum evento ativo' 
                    : 'Nenhum evento arquivado'}
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                {searchTerm 
                  ? 'Tente ajustar o termo de busca.'
                  : abaAtiva === 'ativos'
                    ? 'Comece criando um novo evento.'
                    : 'Não há eventos arquivados no momento.'}
              </p>
              {abaAtiva === 'ativos' && (
                <div className="mt-6">
                  <Button onClick={() => router.push('/eventos/novo')} className="btn-add">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Evento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Confirmação de Arquivamento */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Arquivar Evento"
          description={
            eventoParaArquivar
              ? `Tem certeza que deseja arquivar o evento de "${eventoParaArquivar.cliente?.nome || 'cliente não encontrado'}"? Ele não aparecerá nas listas ativas, mas continuará disponível nos relatórios históricos.`
              : 'Tem certeza que deseja arquivar este evento?'
          }
          confirmText="Arquivar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleConfirmarArquivamento}
        />
      </div>
      </PlanOverlay>
    </Layout>
  );
}

export default function EventosPage() {
  return (
    <Suspense fallback={null}>
      <EventosPageContent />
    </Suspense>
  );
}
