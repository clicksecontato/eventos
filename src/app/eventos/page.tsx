'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import Layout from '@/components/Layout';
import {
  PlusIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useEventos, useEventosArquivados, useTiposEvento, useServicosPorEventos, usePreCadastros } from '@/hooks/useData';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';
import { usePlano } from '@/lib/hooks/usePlano';
import LimiteUsoCompacto from '@/components/LimiteUsoCompacto';
import PlanOverlay from '@/components/PlanOverlay';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Evento, DEFAULT_TIPOS_EVENTO } from '@/types';
import DateRangeFilter, { DateFilter, isDateInFilter } from '@/components/filters/DateRangeFilter';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ServicosBadges from '@/components/ServicosBadges';
import EventoStatusSelect from '@/components/EventoStatusSelect';
import PreCadastrosSection from '@/components/PreCadastrosSection';

export default function EventosPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { data: eventos, loading: loadingAtivos, error: errorAtivos, refetch: refetchAtivos } = useEventos();
  const { data: eventosArquivados, loading: loadingArquivados, error: errorArquivados, refetch: refetchArquivados } = useEventosArquivados();
  const { data: tiposEventoData } = useTiposEvento();
  const { data: preCadastros } = usePreCadastros();
  const { limites } = usePlano();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'arquivados' | 'pre-cadastros'>('ativos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [eventoParaArquivar, setEventoParaArquivar] = useState<Evento | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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
  
  const eventosLista = abaAtiva === 'ativos' 
    ? (eventosLocais ?? eventos ?? []) 
    : (eventosArquivadosLocais ?? eventosArquivados ?? []);

  const recarregarEventos = async () => {
    await Promise.all([refetchAtivos(), refetchArquivados()]);
  };

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

  // Filtrar eventos - chamado antes dos early returns para seguir as regras dos hooks
  const filteredEventos = useMemo(() => {
    if (!eventosLista || eventosLista.length === 0) {
      return [];
    }
    
    return eventosLista.filter(evento => {
      // Verificações de segurança para evitar erros com valores undefined/null
      const clienteNome = evento.cliente?.nome || '';
      const local = evento.local || '';
      const nomeEvento = evento.nomeEvento || '';
      
      const matchesSearch = clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           local.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           nomeEvento.toLowerCase().includes(searchTerm.toLowerCase());
      const tipoEventoNome = getTipoEventoNome(evento);
      const matchesTipo = filterTipo === 'todos' || tipoEventoNome === filterTipo;
      const matchesDate = isDateInFilter(evento.dataEvento, dateFilter);
      const matchesStatus = filterStatus === 'todos' || evento.status === filterStatus;
      
      return matchesSearch && matchesTipo && matchesDate && matchesStatus;
    });
  }, [eventosLista, searchTerm, filterTipo, dateFilter, filterStatus, tiposEventoMap]);

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
                  onClick={() => setFilterStatus('todos')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'todos'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterStatus('Agendado')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Agendado'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Agendado ({eventosLista.filter(e => e.status === 'Agendado').length})
                </button>
                <button
                  onClick={() => setFilterStatus('Confirmado')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Confirmado'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Confirmado ({eventosLista.filter(e => e.status === 'Confirmado').length})
                </button>
                <button
                  onClick={() => setFilterStatus('Em andamento')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Em andamento'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Em andamento ({eventosLista.filter(e => e.status === 'Em andamento').length})
                </button>
                <button
                  onClick={() => setFilterStatus('Concluído')}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                    filterStatus === 'Concluído'
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                  }`}
                >
                  Concluído ({eventosLista.filter(e => e.status === 'Concluído').length})
                </button>
                <button
                  onClick={() => setFilterStatus('Cancelado')}
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
              onFilterChange={setDateFilter}
              className="w-full"
            />
          </div>

          {/* Filtros Básicos */}
          <Card className="lg:col-span-2 bg-surface/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Input
                    label="Buscar"
                    placeholder="Nome do evento, cliente ou local..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select
                    label="Tipo"
                    value={filterTipo}
                    onValueChange={(value) => setFilterTipo(value)}
                    options={tiposEventoFilterOptions}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Resumo dos Filtros Ativos - apenas para eventos */}
        {abaAtiva !== 'pre-cadastros' && (searchTerm || filterTipo !== 'todos' || dateFilter || (abaAtiva === 'ativos' && filterStatus !== 'todos')) && (
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
                        <span className="block text-xs text-text-secondary truncate lg:whitespace-normal">
                          {evento.contratante}
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
                    {evento.horarioDesmontagem && (
                      <div className="flex items-center text-sm text-text-secondary">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Desmontagem: {evento.horarioDesmontagem}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-text-secondary">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {evento.local}
                  </div>
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
