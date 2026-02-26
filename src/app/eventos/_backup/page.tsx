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
  UserGroupIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useEventos, useEventosArquivados, useTiposEvento } from '@/hooks/useData';
import { useCurrentUser } from '@/hooks/useAuth';
import { dataService } from '@/lib/data-service';
import { usePlano } from '@/lib/hooks/usePlano';
import LimiteUsoCompacto from '@/components/LimiteUsoCompacto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusEvento, Evento, DEFAULT_TIPOS_EVENTO } from '@/types';
import DateRangeFilter, { DateFilter, isDateInFilter } from '@/components/filters/DateRangeFilter';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function EventosPage() {
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { data: eventos, loading: loadingAtivos, error: errorAtivos, refetch: refetchAtivos } = useEventos();
  const { data: eventosArquivados, loading: loadingArquivados, error: errorArquivados, refetch: refetchArquivados } = useEventosArquivados();
  const { data: tiposEventoData } = useTiposEvento();
  // Removido useAllServicos() - muito pesado! Buscaremos serviços sob demanda apenas quando necessário
  const { limites, temPermissao } = usePlano();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'arquivados'>('ativos');
  const [eventoParaArquivar, setEventoParaArquivar] = useState<Evento | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventoCopiado, setEventoCopiado] = useState<string | null>(null);
  const [temAcessoCopiar, setTemAcessoCopiar] = useState<boolean | null>(null);
  
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

  // Removido: tipos de serviços não são mais exibidos na lista para reduzir leituras do Firebase

  const tiposEventoFilterOptions = React.useMemo(() => {
    const nomes = new Set<string>();
    const options = [
      { value: 'todos', label: 'Todos' }
    ];

    const fontes = [
      ...(tiposEventoData ?? []).filter(tipo => tipo.ativo).map(tipo => tipo.nome),
      ...DEFAULT_TIPOS_EVENTO.map(tipo => tipo.nome),
      ...eventosLista.map(evento => evento.tipoEvento)
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
  }, [tiposEventoData, eventosLista]);

  // Filtrar eventos - chamado antes dos early returns para seguir as regras dos hooks
  const filteredEventos = useMemo(() => {
    if (!eventosLista || eventosLista.length === 0) {
      return [];
    }
    
    return eventosLista.filter(evento => {
      const matchesSearch = evento.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           evento.local.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (evento.nomeEvento && evento.nomeEvento.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'todos' || evento.status === filterStatus;
      const matchesTipo = filterTipo === 'todos' || evento.tipoEvento === filterTipo;
      const matchesDate = isDateInFilter(evento.dataEvento, dateFilter);
      
      return matchesSearch && matchesStatus && matchesTipo && matchesDate;
    });
  }, [eventosLista, searchTerm, filterStatus, filterTipo, dateFilter]);

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

  // Removido: carregamento de serviços - não são mais exibidos na lista para reduzir leituras do Firebase

  // Verificar acesso ao botão copiar - chamado antes dos early returns
  useEffect(() => {
    const verificarAcesso = async () => {
      const acesso = await temPermissao('BOTAO_COPIAR');
      setTemAcessoCopiar(acesso);
    };
    verificarAcesso();
  }, [temPermissao]);

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

  const handleStatusChange = async (evento: Evento, novoStatus: string) => {
    if (!userId) return;

    const statusAnterior = evento.status;
    const novoStatusTyped = novoStatus as Evento['status'];

    // Atualização otimista - atualizar UI imediatamente
    const atualizarEventoLocal = (eventos: Evento[] | null) => {
      if (!eventos) return eventos;
      return eventos.map(e => 
        e.id === evento.id ? { ...e, status: novoStatusTyped } : e
      );
    };

    if (abaAtiva === 'ativos') {
      setEventosLocais(prev => atualizarEventoLocal(prev));
    } else {
      setEventosArquivadosLocais(prev => atualizarEventoLocal(prev));
    }

    // Atualizar no backend de forma assíncrona (sem feedback visual)
    dataService.updateEvento(evento.id, { status: novoStatusTyped }, userId)
      .catch((error) => {
        // Erro - reverter a atualização otimista
        const reverterEvento = (eventos: Evento[] | null) => {
          if (!eventos) return eventos;
          return eventos.map(e => 
            e.id === evento.id ? { ...e, status: statusAnterior } : e
          );
        };

        if (abaAtiva === 'ativos') {
          setEventosLocais(prev => reverterEvento(prev));
        } else {
          setEventosArquivadosLocais(prev => reverterEvento(prev));
        }

        showToast('Erro ao atualizar status do evento', 'error');
      });
  };

  const statusOptions = [
    { value: StatusEvento.AGENDADO, label: 'Agendado' },
    { value: StatusEvento.CONFIRMADO, label: 'Confirmado' },
    { value: StatusEvento.EM_ANDAMENTO, label: 'Em andamento' },
    { value: StatusEvento.CONCLUIDO, label: 'Concluído' },
    { value: StatusEvento.CANCELADO, label: 'Cancelado' }
  ];

  const formatEventInfoForCopy = (evento: Evento, servicosNomes: string[]) => {
    let text = '';

    // Helpers para data com fuso horário de São Paulo
    const formatDatePtBR = (value: any) => {
      const d = value instanceof Date ? value : new Date(value);
      return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    };
    const getWeekdayPtBR = (value: any) => {
      const d = value instanceof Date ? value : new Date(value);
      return d
        .toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
        .toUpperCase();
    };

    // Nome do Evento
    const nomeEvento =
      (evento as any).nomeEvento ||
      (evento.tipoEvento ? `${evento.tipoEvento}${evento.cliente?.nome ? ` - ${evento.cliente.nome}` : ''}` : '') ||
      evento.local ||
      'Evento';
    text += 'Nome do Evento\n\n';
    text += `${nomeEvento}\n`;

    text += '\n────────────────────────\n\n';

    // Informações do Evento
    text += 'Informações do Evento\n\n';
    text += `Data: ${formatDatePtBR(evento.dataEvento)} - ${getWeekdayPtBR(evento.dataEvento)}\n`;
    if (evento.local) text += `Local: ${evento.local}\n`;
    if (evento.endereco) text += `Endereço: ${evento.endereco}\n`;
    if (evento.numeroConvidados) text += `Convidados: ${evento.numeroConvidados}\n`;
    if (evento.tipoEvento) text += `Tipo: ${evento.tipoEvento}\n`;

    text += '\n────────────────────────\n\n';

    // Detalhes do Serviço
    text += 'Detalhes do Serviço\n\n';
    if ((evento as any).saida) text += `Saída: ${(evento as any).saida}\n`;
    if ((evento as any).chegadaNoLocal) text += `Chegada no local: ${(evento as any).chegadaNoLocal}\n`;
    if ((evento as any).horarioInicio) text += `Horário de início: ${(evento as any).horarioInicio}\n`;
    if ((evento as any).horarioDesmontagem) text += `Horário de Desmontagem: ${(evento as any).horarioDesmontagem}\n`;
    if ((evento as any).tempoEvento) text += `Duração: ${(evento as any).tempoEvento}\n`;
    if ((evento as any).quantidadeMesas) text += `Mesas: ${(evento as any).quantidadeMesas}\n`;
    if ((evento as any).numeroImpressoes) text += `Impressões: ${(evento as any).numeroImpressoes}\n`;
    if ((evento as any).hashtag) text += `Hashtag: ${(evento as any).hashtag}\n`;

    text += '\n────────────────────────\n\n';

    // Cerimonialista
    text += 'Cerimonialista\n\n';
    if ((evento as any).cerimonialista?.nome) text += `Nome: ${(evento as any).cerimonialista.nome}\n`;
    if ((evento as any).cerimonialista?.telefone) text += `Telefone: ${(evento as any).cerimonialista.telefone}\n`;

    text += '\n────────────────────────\n\n';

    // Serviços do Evento
    text += 'Serviços do Evento\n\n';
    text += servicosNomes.length > 0 ? servicosNomes.join(', ') : '-';
    text += '\n';

    return text;
  };

  const handleCopyInfo = async (evento: Evento) => {
    // Verificar permissão antes de copiar
    if (!temAcessoCopiar) {
      showToast('Esta funcionalidade está disponível apenas nos planos Profissional e Premium', 'error');
      return;
    }

    // Buscar serviços do evento para compor a lista (nomes separados por vírgula)
    let servicosNomes: string[] = [];
    try {
      if (userId) {
        const servicos = await dataService.getServicosPorEvento(userId, evento.id);
        servicosNomes = (servicos || []).map((s: any) => s?.tipoServico?.nome || s?.nome || s?.descricao).filter(Boolean);
      }
    } catch (e) {
      // Não foi possível carregar serviços do evento para cópia
    }

    const text = formatEventInfoForCopy(evento, servicosNomes);
    
    // Tentar usar a API moderna do clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setEventoCopiado(evento.id);
        setTimeout(() => {
          setEventoCopiado(null);
        }, 2000);
        return;
      } catch (error) {
        // Erro ao copiar texto
      }
    }
    
    // Fallback para navegadores mais antigos
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setEventoCopiado(evento.id);
        setTimeout(() => {
          setEventoCopiado(null);
        }, 2000);
      }
    } catch (err) {
      // Erro ao copiar texto
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Agendado':
        return 'bg-info-bg text-info-text';
      case 'Confirmado':
        return 'bg-success-bg text-success-text';
      case 'Em andamento':
        return 'bg-warning-bg text-warning-text';
      case 'Concluído':
        return 'bg-surface text-text-secondary';
      case 'Cancelado':
        return 'bg-error-bg text-error-text';
      default:
        return 'bg-surface text-text-secondary';
    }
  };

  return (
    <Layout>
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        onClick={() => recarregarEventos()}
                        disabled={loading}
                        className="p-2"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Atualizar</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => router.push('/eventos/novo')} 
                        className="btn-add p-2"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Novo Evento</p>
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
                onClick={() => setAbaAtiva('ativos')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'ativos'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Ativos ({eventos?.length || 0})
              </button>
              <button
                onClick={() => setAbaAtiva('arquivados')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-all rounded-lg cursor-pointer ${
                  abaAtiva === 'arquivados'
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                Arquivados ({eventosArquivados?.length || 0})
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    label="Status"
                    value={filterStatus}
                    onValueChange={(value) => setFilterStatus(value)}
                    options={[
                      { value: 'todos', label: 'Todos' },
                      { value: StatusEvento.AGENDADO, label: 'Agendado' },
                      { value: StatusEvento.CANCELADO, label: 'Cancelado' },
                      { value: StatusEvento.CONCLUIDO, label: 'Concluído' },
                      { value: StatusEvento.CONFIRMADO, label: 'Confirmado' },
                      { value: StatusEvento.EM_ANDAMENTO, label: 'Em andamento' }
                    ]}
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

        {/* Resumo dos Filtros Ativos */}
        {(searchTerm || filterStatus !== 'todos' || filterTipo !== 'todos' || dateFilter) && (
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
                    {filterStatus !== 'todos' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
                        Status: {filterStatus}
                      </span>
                    )}
                    {filterTipo !== 'todos' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        Tipo: {filterTipo}
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

        {/* Lista de Eventos */}
        <div className="space-y-4">
          {sortedEventos.map((evento) => (
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
                        {evento.nomeEvento || evento.cliente.nome}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm text-text-secondary">
                        <span className="block text-text-primary font-medium truncate lg:whitespace-normal">
                          {evento.cliente.nome}
                        </span>
                        <span className="block text-xs text-text-secondary truncate lg:whitespace-normal">
                          {evento.contratante}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="mt-2 lg:mt-0 shrink-0">
                      <Select
                        value={evento.status}
                        onValueChange={(value) => handleStatusChange(evento, value)}
                        options={statusOptions}
                        className={`w-[140px] [&>div>button]:h-7 [&>div>button]:px-2.5 [&>div>button]:py-0.5 [&>div>button]:text-xs [&>div>button]:rounded-full [&>div>button]:border-0 [&>div>button]:shadow-none ${getStatusColor(evento.status)}`}
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
                  {/* Removido: exibição de tipos de serviços para reduzir leituras do Firebase */}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-text-primary">{evento.tipoEvento}</span>
                    <div className="flex space-x-2">
                      {temAcessoCopiar && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyInfo(evento);
                                }}
                                className={eventoCopiado === evento.id ? 'bg-success-bg text-success-text' : 'hover:bg-info/10 hover:text-info'}
                              >
                                {eventoCopiado === evento.id ? (
                                  <CheckIcon className="h-4 w-4" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>{eventoCopiado === evento.id ? 'Copiado!' : 'Copiar informações'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(evento);
                              }}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Visualizar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(evento);
                              }}
                              className="hover:bg-accent/10 hover:text-accent"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {abaAtiva === 'ativos' ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExcluirEvento(evento);
                                }}
                                className="text-error hover:text-error hover:bg-error/10"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Arquivar</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDesarquivar(evento);
                                }}
                                className="text-success hover:text-success hover:bg-success/10"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Desarquivar</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedEventos.length === 0 && (
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
              ? `Tem certeza que deseja arquivar o evento de "${eventoParaArquivar.cliente.nome}"? Ele não aparecerá nas listas ativas, mas continuará disponível nos relatórios históricos.`
              : 'Tem certeza que deseja arquivar este evento?'
          }
          confirmText="Arquivar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleConfirmarArquivamento}
        />
      </div>
    </Layout>
  );
}

