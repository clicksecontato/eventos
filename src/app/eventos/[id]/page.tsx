'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import {
  ArrowLeftIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  PrinterIcon,
  UserIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useEvento, usePagamentosPorEvento, useCustosPorEvento, useServicosPorEvento, useContratosPorEvento } from '@/hooks/useData';
import { useAnexos } from '@/hooks/useAnexos';
import { useCurrentUser } from '@/hooks/useAuth';
import { usePlano } from '@/lib/hooks/usePlano';
import { dataService } from '@/lib/data-service';
import { AnexoEvento, Evento, StatusEvento, Contrato } from '@/types';
import EventoStatusSelect from '@/components/EventoStatusSelect';
import PagamentoHistorico from '@/components/PagamentoHistorico';
import CustosEvento from '@/components/CustosEvento';
import ServicosEvento from '@/components/ServicosEvento';
import AnexosEvento from '@/components/AnexosEvento';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import LoadingHotmart from '@/components/LoadingHotmart';

export default function EventoViewPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { showToast } = useToast();
  const { temPermissao, statusPlano } = usePlano();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [temAcessoCopiar, setTemAcessoCopiar] = useState<boolean | null>(null);
  const [temAcessoContrato, setTemAcessoContrato] = useState<boolean | null>(null);
  const [eventoLocal, setEventoLocal] = useState<Evento | null>(null);
  
  const { data: evento, loading: loadingEvento, error: errorEvento, refetch: refetchEvento } = useEvento(params.id as string);
  const { data: pagamentos, loading: loadingPagamentos, refetch: refetchPagamentos } = usePagamentosPorEvento(params.id as string);
  const { data: custos, loading: loadingCustos, refetch: refetchCustos } = useCustosPorEvento(params.id as string);
  const { data: servicos, loading: loadingServicos, refetch: refetchServicos } = useServicosPorEvento(params.id as string);
  const { anexos, loading: loadingAnexos, refetch: refetchAnexos } = useAnexos(params.id as string);
  const { data: contratos, loading: loadingContratos, refetch: refetchContratos } = useContratosPorEvento(params.id as string);
  
  const loading = loadingEvento || loadingPagamentos || loadingCustos || loadingServicos || loadingAnexos || loadingContratos;

  // Verificar acesso ao botão copiar - chamado antes dos early returns
  useEffect(() => {
    const verificarAcesso = async () => {
      const acesso = await temPermissao('BOTAO_COPIAR');
      setTemAcessoCopiar(acesso);
    };
    verificarAcesso();
  }, [temPermissao]);

  // Verificar acesso ao contrato automatizado - chamado antes dos early returns
  useEffect(() => {
    const verificarAcessoContrato = async () => {
      const acesso = await temPermissao('CONTRATO_AUTOMATIZADO');
      setTemAcessoContrato(acesso);
    };
    verificarAcessoContrato();
  }, [temPermissao]);

  // Sincronizar evento local com evento do hook
  useEffect(() => {
    if (evento) {
      setEventoLocal(evento);
    }
  }, [evento]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando evento...</div>
        </div>
      </Layout>
    );
  }

  if (errorEvento) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-error">Erro ao carregar evento: {errorEvento}</div>
        </div>
      </Layout>
    );
  }

  if (!evento) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Evento não encontrado</div>
        </div>
      </Layout>
    );
  }

  const handleEdit = () => {
    router.push(`/eventos/${params.id}/editar`);
  };

  const handleDelete = async () => {
    if (!evento || !userId) return;

    try {
      await dataService.deleteEvento(evento.id, userId);
      showToast('Evento arquivado com sucesso!', 'success');
      router.push('/eventos');
    } catch (error) {
      showToast('Erro ao arquivar evento', 'error');
    }
  };

  const handlePagamentosChange = () => {
    // Função para recarregar pagamentos quando houver mudanças
    refetchPagamentos();
  };

  const handleCustosChange = () => {
    // Função para recarregar custos quando houver mudanças
    refetchCustos();
  };

  const handleServicosChange = () => {
    // Função para recarregar serviços quando houver mudanças
    refetchServicos();
    refetchEvento();
  };

  const handleAnexosChange = () => {
    refetchAnexos();
  };

  // Função auxiliar para formatar dia da semana
  const getDiaSemanaFormatado = (data: Date) => {
    const diaSemana = format(data, 'EEEE', { locale: ptBR });
    return diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  };

  const formatEventInfoForCopy = () => {
    if (!evento) return '';

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
      'Evento';
    text += 'Nome do Evento\n\n';
    text += `${nomeEvento}\n`;

    text += '\n────────────────────────\n\n';

    // Informações do Evento
    text += 'Informações do Evento\n\n';
    text += `Data: ${formatDatePtBR(evento.dataEvento)} - ${getWeekdayPtBR(evento.dataEvento)}\n`;
    if (evento.tipoEvento) text += `Tipo: ${evento.tipoEvento}\n`;

    text += '\n────────────────────────\n\n';

    // Detalhes do Serviço
    text += 'Detalhes do Serviço\n\n';
    if ((evento as any).horarioInicio) text += `Horário de início: ${(evento as any).horarioInicio}\n`;
    if ((evento as any).horarioFim || (evento as any).horarioDesmontagem) {
      text += `Horário fim: ${(evento as any).horarioFim || (evento as any).horarioDesmontagem}\n`;
    }

    text += '\n────────────────────────\n\n';

    // Serviços do Evento
    text += 'Serviços do Evento\n\n';
    const nomesServicos = (servicos || []).map((s: any) => s?.tipoServico?.nome || s?.nome || s?.descricao).filter(Boolean);
    text += nomesServicos.length > 0 ? nomesServicos.join(', ') : '-';
    text += '\n';

    return text;
  };

  const handleCopyInfo = async () => {
    // Verificar permissão antes de copiar
    if (!temAcessoCopiar) {
      showToast('Esta funcionalidade está disponível apenas nos planos Profissional e Premium', 'error');
      return;
    }

    const text = formatEventInfoForCopy();
    
    // Tentar usar a API moderna do clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
        return;
      } catch (error) {
        // Erro silencioso
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
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
    } catch (err) {
      // Erro silencioso
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

  const handleStatusChange = async (eventoId: string, novoStatus: string) => {
    if (!userId || !eventoLocal) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const statusAnterior = eventoLocal.status;
    const novoStatusTyped = novoStatus as Evento['status'];

    // Atualização otimista - atualizar UI imediatamente
    setEventoLocal(prev => prev ? { ...prev, status: novoStatusTyped } : null);

    try {
      await dataService.updateEvento(eventoId, { status: novoStatusTyped }, userId);
      showToast('Status do evento atualizado com sucesso!', 'success');
      // Recarregar evento para garantir sincronização
      await refetchEvento();
    } catch (error) {
      showToast('Erro ao atualizar status do evento', 'error');
      // Reverter atualização otimista em caso de erro
      setEventoLocal(prev => prev ? { ...prev, status: statusAnterior } : null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingHotmart size="sm" />
          <p className="mt-4 text-text-secondary">Carregando evento...</p>
        </div>
      </Layout>
    );
  }

  if (!evento) {
    return (
      <Layout>
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-text-muted" />
          <h3 className="mt-2 text-sm font-medium text-text-primary">Evento não encontrado</h3>
          <p className="mt-1 text-sm text-text-secondary">
            O evento que você está procurando não existe ou foi removido.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push('/eventos')}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar para Eventos
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const totalCustos = custos?.filter(custo => !custo.removido).reduce((total, custo) => total + (custo.valor * (custo.quantidade || 1)), 0) || 0;
  const valorTotalCobrado = eventoLocal?.valorTotal ?? evento.valorTotal ?? 0;
  const totalServicosCalculado = (eventoLocal?.valorTotalServicosCalculado ?? evento.valorTotalServicosCalculado)
    ?? (servicos?.filter((servico) => !servico.removido).reduce((total, servico) => {
      const quantidade = servico.quantidade || 1;
      const valorUnitario = servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0;
      const totalItem = servico.valorTotalItem ?? quantidade * valorUnitario;
      return total + totalItem;
    }, 0) || 0);
  const modoValorTotal = eventoLocal?.modoValorTotal || evento.modoValorTotal || 'manual';
  const divergenciaTotal = valorTotalCobrado - totalServicosCalculado;
  const temDivergencia = Math.abs(divergenciaTotal) > 0.01;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text-primary leading-tight break-words">
              {evento.nomeEvento || evento.cliente.nome}
            </h1>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-start gap-2 text-text-primary">
                <UserIcon className="h-5 w-5 text-text-muted flex-shrink-0 mt-0.5" />
                <span className="font-medium break-words">{evento.cliente.nome}</span>
              </div>
              <p className="text-text-muted text-xs">
                {format(evento.dataEvento, 'dd/MM/yyyy', { locale: ptBR })} • {getDiaSemanaFormatado(evento.dataEvento)}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="action-back"
                    size="icon"
                    onClick={() => router.push('/eventos')}
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-medium">
                  <p>Voltar para lista de eventos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center gap-2">
              {temAcessoContrato === true ? (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/contratos/novo?eventoId=${evento.id}`)}
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium">
                      <p>Gerar contrato</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          disabled
                          size="icon"
                          className="cursor-not-allowed opacity-50"
                        >
                          <LockClosedIcon className="h-5 w-5" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      sideOffset={8}
                      className="max-w-sm border border-warning bg-warning-bg shadow-lg p-0 z-50 rounded-md"
                      style={{
                        backgroundColor: 'var(--warning-bg)',
                        borderColor: 'var(--warning)',
                        color: 'var(--warning-text)'
                      }}
                    >
                      <div className="p-4 space-y-4" style={{ color: 'var(--warning-text)' }}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--warning-text)' }} />
                            <div className="font-semibold" style={{ color: 'var(--warning-text)' }}>
                              Acesso Bloqueado
                            </div>
                          </div>
                          <div className="text-sm" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>
                            Preenchimento automatizado de contrato está disponível apenas para perfis com acesso Premium
                          </div>
                        </div>
                        {statusPlano?.plano && (
                          <div className="text-sm" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>
                            Plano atual: <span className="font-semibold" style={{ color: 'var(--warning-text)' }}>{statusPlano.plano.nome}</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => router.push('/assinatura')}
                          className="w-full"
                          variant="default"
                        >
                          Ver status da assinatura
                        </Button>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {temAcessoCopiar && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="action-copy" 
                        size="icon"
                        onClick={handleCopyInfo}
                        className={copied ? 'bg-success-bg text-success-text border-success' : ''}
                      >
                        {copied ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium">
                      <p>{copied ? 'Informações copiadas!' : 'Copiar informações do evento'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="action-edit" size="icon" onClick={handleEdit}>
                      <PencilIcon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-medium">
                    <p>Editar evento</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="action-delete" 
                      size="icon"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-medium">
                    <p>Arquivar evento</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Submenu de Navegação Rápida */}
        <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-sm">
          <div className="relative -mx-4 px-4 md:mx-0 md:px-0">
            {/* Gradientes indicadores de scroll - aparecem nas bordas */}
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-surface via-surface/80 to-transparent pointer-events-none z-10 md:hidden" />
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-surface via-surface/80 to-transparent pointer-events-none z-10 md:hidden" />
            
            {/* Container com scroll */}
            <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto md:overflow-x-visible scrollbar-hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const element = document.getElementById('basico');
                if (element) {
                  const offset = 120; // Altura do submenu + margem
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }}
              className="text-text-primary hover:bg-surface-hover whitespace-nowrap flex-shrink-0"
            >
              BÁSICO
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const element = document.getElementById('pagamentos');
                if (element) {
                  const offset = 120; // Altura do submenu + margem
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }}
              className="text-text-primary hover:bg-surface-hover whitespace-nowrap flex-shrink-0"
            >
              PAGAMENTOS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const element = document.getElementById('custos');
                if (element) {
                  const offset = 120; // Altura do submenu + margem
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }}
              className="text-text-primary hover:bg-surface-hover whitespace-nowrap flex-shrink-0"
            >
              CUSTOS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const element = document.getElementById('servicos');
                if (element) {
                  const offset = 120; // Altura do submenu + margem
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }}
              className="text-text-primary hover:bg-surface-hover whitespace-nowrap flex-shrink-0"
            >
              SERVIÇOS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const element = document.getElementById('anexos');
                if (element) {
                  const offset = 120; // Altura do submenu + margem
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }}
              className="text-text-primary hover:bg-surface-hover whitespace-nowrap flex-shrink-0"
            >
              ANEXOS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const element = document.getElementById('contratos');
                if (element) {
                  const offset = 120; // Altura do submenu + margem
                  const elementPosition = element.offsetTop - offset;
                  window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                }
              }}
              className="text-text-primary hover:bg-surface-hover whitespace-nowrap flex-shrink-0"
            >
              CONTRATOS
            </Button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center">
          <div onClick={(e) => e.stopPropagation()}>
            <EventoStatusSelect
              eventoId={eventoLocal?.id || evento.id}
              statusAtual={eventoLocal?.status || evento.status}
              onStatusChange={handleStatusChange}
            />
          </div>
          <span className="text-sm text-text-muted">
            Criado em {format(evento.dataCadastro, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        </div>

        <div id="basico" className="grid grid-cols-1 gap-6 lg:grid-cols-2 pt-4">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm">
                <UserIcon className="h-4 w-4 mr-2 text-text-muted" />
                <span className="font-medium">{evento.cliente.nome}</span>
              </div>
              {evento.cliente.email && (
                <div className="flex items-center text-sm text-text-secondary">
                  <EnvelopeIcon className="h-4 w-4 mr-2 text-text-muted" />
                  <a 
                    href={`mailto:${evento.cliente.email}`}
                    className="text-link hover:text-link-hover hover:underline"
                  >
                    {evento.cliente.email}
                  </a>
                </div>
              )}
              {evento.cliente.telefone && (
                <div className="flex items-center text-sm text-text-secondary">
                  <PhoneIcon className="h-4 w-4 mr-2 text-text-muted" />
                  <a 
                    href={`tel:${evento.cliente.telefone.replace(/\D/g, '')}`}
                    className="text-link hover:text-link-hover hover:underline"
                  >
                    {evento.cliente.telefone}
                  </a>
                </div>
              )}
              {evento.cliente.endereco && (
                <div className="flex items-center text-sm text-text-secondary">
                  <HomeIcon className="h-4 w-4 mr-2 text-text-muted" />
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.cliente.endereco)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:text-link-hover hover:underline break-words"
                  >
                    {evento.cliente.endereco}
                  </a>
                </div>
              )}
              {evento.cliente.instagram && (
                <div className="flex items-center text-sm text-text-secondary">
                  <span className="mr-2">📷</span>
                  <a 
                    href={`https://instagram.com/${evento.cliente.instagram.replace('@', '').replace('https://instagram.com/', '').replace('https://www.instagram.com/', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:text-link-hover hover:underline"
                  >
                    {evento.cliente.instagram}
                  </a>
                </div>
              )}
              {evento.cliente.canalEntrada && (
                <div className="text-sm text-text-secondary">
                  <span className="font-medium">Canal de Entrada:</span> {evento.cliente.canalEntrada.nome}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações do Evento */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm">
                <CalendarIcon className="h-4 w-4 mr-2 text-text-muted" />
                <span className="font-medium">
                  {new Date(evento.dataEvento instanceof Date ? evento.dataEvento : new Date(evento.dataEvento)).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} - {new Date(evento.dataEvento instanceof Date ? evento.dataEvento : new Date(evento.dataEvento)).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).toUpperCase()}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-text-primary">Tipo:</span> {evento.tipoEvento}
              </div>
            </CardContent>
          </Card>

          {/* Agendamento */}
          <Card>
            <CardHeader>
              <CardTitle>Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-text-primary">Horário de início:</span>
                  <div className="text-text-secondary">{evento.horarioInicio}</div>
                </div>
                <div>
                  <span className="font-medium text-text-primary">Horário fim:</span>
                  <div className="text-text-secondary">{evento.horarioFim || evento.horarioDesmontagem}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {evento.observacoes && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{evento.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resumo Financeiro */}
        <div className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
              <CardDescription>Visão geral dos valores do evento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-surface/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    R$ {valorTotalCobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-text-secondary">Valor Total Cobrado</div>
                </div>
                <div className="text-center p-4 bg-surface/50 rounded-lg">
                  <div className="text-2xl font-bold text-error">
                    R$ {totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-text-secondary">Total de Custos</div>
                </div>
                <div className="text-center p-4 bg-surface/50 rounded-lg">
                  <div className={`text-2xl font-bold ${valorTotalCobrado - totalCustos >= 0 ? 'text-success' : 'text-error'}`}>
                    R$ {(valorTotalCobrado - totalCustos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm text-text-secondary">Estimativa de Lucro</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="text-text-secondary">Modo do valor total</div>
                  <div className="font-semibold text-text-primary capitalize">{modoValorTotal}</div>
                  <div className="mt-1 text-text-secondary">
                    Total calculado pelos serviços: <strong>R$ {totalServicosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
                {temDivergencia && (
                  <div className={`rounded-lg border p-3 text-sm ${modoValorTotal === 'manual' ? 'border-warning text-warning-text bg-warning-bg/30' : 'border-error text-error-text bg-error-bg/30'}`}>
                    <div className="font-semibold">
                      {modoValorTotal === 'manual'
                        ? 'Diferença intencional (modo manual)'
                        : 'Atenção: divergência no modo automático'}
                    </div>
                    <div>
                      Diferença entre cobrado e calculado: <strong>R$ {divergenciaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Pagamentos */}
        <div id="pagamentos" className="pt-4">
          <PagamentoHistorico
          eventoId={evento.id}
          pagamentos={pagamentos || []}
          onPagamentosChange={handlePagamentosChange}
          evento={evento}
        />
        </div>

        {/* Custos do Evento */}
        <div id="custos" className="pt-4">
          <CustosEvento
          evento={evento}
          custos={custos || []}
          onCustosChange={handleCustosChange}
        />
        </div>

        {/* Serviços do Evento */}
        <div id="servicos" className="pt-4">
          <ServicosEvento
          evento={evento}
          servicos={servicos || []}
          onServicosChange={handleServicosChange}
        />
        </div>

        {/* Anexos do Evento */}
        <div id="anexos" className="pt-4">
          <AnexosEvento
          evento={evento}
          anexos={anexos || []}
          onAnexosChange={handleAnexosChange}
        />
        </div>

        {/* Contratos do Evento */}
        <div id="contratos" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contratos</CardTitle>
                  <CardDescription>Gerencie os contratos deste evento</CardDescription>
                </div>
                {temAcessoContrato === true && (
                  <Button
                    onClick={() => router.push(`/contratos/novo?eventoId=${evento.id}`)}
                    className="bg-primary"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Contrato
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingContratos ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingHotmart size="sm" />
                  <span className="ml-2 text-text-secondary">Carregando contratos...</span>
                </div>
              ) : contratos && contratos.length > 0 ? (
                <div className="space-y-3">
                  {contratos.map((contrato) => (
                    <div
                      key={contrato.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="h-5 w-5 text-text-muted" />
                          <div>
                            <div className="font-medium text-text-primary">
                              {contrato.modeloContrato?.nome || 'Contrato sem modelo'}
                            </div>
                            <div className="text-sm text-text-secondary">
                              {contrato.numeroContrato && `Nº ${contrato.numeroContrato} • `}
                              Status: <span className="capitalize">{contrato.status}</span>
                              {contrato.dataGeracao && ` • ${format(new Date(contrato.dataGeracao), 'dd/MM/yyyy', { locale: ptBR })}`}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/contratos/${contrato.id}`)}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar Contrato</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {contrato.status === 'gerado' && contrato.pdfUrl ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(contrato.pdfUrl, '_blank')}
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Baixar PDF</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : contrato.status === 'rascunho' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/contratos/${contrato.id}/gerar-pdf`, {
                                        method: 'POST'
                                      });
                                      if (response.ok) {
                                        const result = await response.json();
                                        const pdfData = result.data || result;
                                        showToast('PDF gerado com sucesso', 'success');
                                        if (pdfData.pdfUrl) {
                                          window.open(pdfData.pdfUrl, '_blank');
                                        }
                                        refetchContratos();
                                      } else {
                                        const errorData = await response.json();
                                        showToast(errorData.error || 'Erro ao gerar PDF', 'error');
                                      }
                                    } catch (error) {
                                      showToast('Erro ao gerar PDF', 'error');
                                    }
                                  }}
                                >
                                  <PrinterIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Gerar PDF</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-text-muted opacity-50" />
                  <p className="mb-4">Nenhum contrato encontrado para este evento</p>
                  {temAcessoContrato === true ? (
                    <Button
                      onClick={() => router.push(`/contratos/novo?eventoId=${evento.id}`)}
                      variant="outline"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Criar Primeiro Contrato
                    </Button>
                  ) : (
                    <p className="text-sm text-text-muted">
                      Contratos automatizados estão disponíveis apenas no plano Premium
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de Confirmação de Arquivamento */}
        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Arquivar Evento"
          description={
            evento
              ? `Tem certeza que deseja arquivar o evento "${evento.nomeEvento || evento.cliente.nome}"? Ele não aparecerá nas listas ativas, mas continuará disponível nos relatórios históricos.`
              : 'Tem certeza que deseja arquivar este evento?'
          }
          confirmText="Arquivar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleDelete}
        />
      </div>
    </Layout>
  );
}
