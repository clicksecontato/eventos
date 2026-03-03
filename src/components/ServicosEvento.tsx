'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ServicoForm from '@/components/forms/ServicoForm';
import { 
  ServicoEvento, 
  Evento,
  TipoServico
} from '@/types';
import { dataService } from '@/lib/data-service';
import { useCurrentUser } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isToday, subDays } from 'date-fns';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  TagIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ServicosEventoProps {
  evento: Evento;
  servicos: ServicoEvento[];
  onServicosChange: () => void;
}

export default function ServicosEvento({ 
  evento, 
  servicos, 
  onServicosChange 
}: ServicosEventoProps) {
  const { userId } = useCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [showModalSelecao, setShowModalSelecao] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<ServicoEvento | null>(null);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<ServicoEvento | null>(null);
  const [tiposServicoDisponiveis, setTiposServicoDisponiveis] = useState<TipoServico[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<Set<string>>(new Set());
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [novoServicoNome, setNovoServicoNome] = useState('');
  const [criandoServico, setCriandoServico] = useState(false);
  const [resumoServicos, setResumoServicos] = useState({
    quantidadeItens: 0,
    porCategoria: {} as Record<string, number>
  });
  const [historicoServicos, setHistoricoServicos] = useState<any[]>([]);
  const [historicoEvento, setHistoricoEvento] = useState<any[]>([]);
  const [filtroHistorico, setFiltroHistorico] = useState<'todos' | 'servicos' | 'evento'>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'hoje' | '7d' | '30d'>('todos');
  const [limiteHistorico, setLimiteHistorico] = useState(8);

  // Carregar resumo de serviços do Firestore
  useEffect(() => {
    const carregarResumoServicos = async () => {
      if (!userId) {
        return;
      }

      try {
        const resumo = await dataService.getResumoServicosPorEvento(userId, evento.id);
        setResumoServicos(resumo);
      } catch (error) {
        // Erro ao carregar resumo de serviços
      }
    };

    carregarResumoServicos();
  }, [userId, evento.id, servicos]);

  useEffect(() => {
    const carregarHistorico = async () => {
      if (!userId) {
        return;
      }

      try {
        const [historicoItens, historicoTotalEvento] = await Promise.all([
          dataService.getHistoricoServicosEvento(userId, evento.id),
          dataService.getHistoricoValorEvento(userId, evento.id)
        ]);
        setHistoricoServicos(historicoItens);
        setHistoricoEvento(historicoTotalEvento);
      } catch {
        // Histórico é complementar, falha silenciosa.
      }
    };

    carregarHistorico();
  }, [userId, evento.id, servicos.length]);

  // Carregar tipos de serviço disponíveis quando abrir o modal
  useEffect(() => {
    const carregarTiposServico = async () => {
      if (!showModalSelecao || !userId) return;

      setLoadingTipos(true);
      try {
        const tipos = await dataService.getServicosCatalogoAtivos(userId);
        // Ordenar alfabeticamente
        const tiposOrdenados = tipos.sort((a, b) => 
          a.nome.localeCompare(b.nome, 'pt-BR')
        );
        setTiposServicoDisponiveis(tiposOrdenados);
      } catch (error) {
        // Erro ao carregar tipos de serviço
      } finally {
        setLoadingTipos(false);
      }
    };

    carregarTiposServico();
  }, [showModalSelecao, userId]);

  const handleNovoServico = () => {
    setServicoEditando(null);
    setShowModalSelecao(true);
    setServicosSelecionados(new Set());
    setNovoServicoNome('');
  };

  const handleFecharModalSelecao = () => {
    setShowModalSelecao(false);
    setServicosSelecionados(new Set());
    setNovoServicoNome('');
  };

  const handleCriarNovoServico = async () => {
    if (!novoServicoNome.trim() || !userId || criandoServico) return;

    setCriandoServico(true);
    try {
      const novoTipo = await dataService.createServicoCatalogo({
        nome: novoServicoNome.trim(),
        descricao: '',
        ativo: true
      }, userId);

      // Adicionar à lista e ordenar
      const novaLista = [...tiposServicoDisponiveis, novoTipo].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      );
      setTiposServicoDisponiveis(novaLista);

      // Selecionar automaticamente o novo serviço
      setServicosSelecionados(prev => new Set([...prev, novoTipo.id]));

      // Limpar o campo
      setNovoServicoNome('');
    } catch (error) {
      // Erro ao criar novo serviço
    } finally {
      setCriandoServico(false);
    }
  };

  const handleToggleServico = (servicoId: string) => {
    setServicosSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(servicoId)) {
        novo.delete(servicoId);
      } else {
        novo.add(servicoId);
      }
      return novo;
    });
  };

  const handleSelecionarTodos = () => {
    // Filtrar serviços já adicionados
    const servicosJaAdicionados = new Set(servicos.map(s => s.servicoId || s.tipoServicoId));
    const tiposDisponiveis = tiposServicoDisponiveis.filter(
      tipo => !servicosJaAdicionados.has(tipo.id)
    );
    
    if (servicosSelecionados.size === tiposDisponiveis.length) {
      setServicosSelecionados(new Set());
    } else {
      setServicosSelecionados(new Set(tiposDisponiveis.map(t => t.id)));
    }
  };

  const handleSalvarServicosSelecionados = async () => {
    if (!userId || servicosSelecionados.size === 0) return;

    try {
      // Filtrar apenas os tipos de serviço que já não foram adicionados
      const servicosJaAdicionados = new Set(servicos.map(s => s.servicoId || s.tipoServicoId));
      const tiposParaAdicionar = tiposServicoDisponiveis.filter(
        tipo => servicosSelecionados.has(tipo.id) && !servicosJaAdicionados.has(tipo.id)
      );

      // Criar um serviço para cada tipo selecionado
      for (const tipoServico of tiposParaAdicionar) {
        const servicoEvento: Omit<ServicoEvento, 'id'> = {
          eventoId: evento.id,
          tipoServicoId: tipoServico.id,
          servicoId: tipoServico.id,
          tipoServico: tipoServico,
          quantidade: 1,
          valorUnitario: tipoServico.valorPadrao ?? 0,
          valorTotalItem: 1 * (tipoServico.valorPadrao ?? 0),
          origemPreco: 'padrao',
          observacoes: '',
          dataCadastro: new Date()
        };
        await dataService.createServicoEvento(userId, evento.id, servicoEvento);
      }

      await sincronizarTotaisEvento();
      onServicosChange();
      handleFecharModalSelecao();
    } catch (error) {
      // Erro ao salvar serviços
    }
  };

  const handleEditarServico = (servico: ServicoEvento) => {
    setServicoEditando(servico);
    setShowForm(true);
  };

  const handleExcluirServico = (servico: ServicoEvento) => {
    setServicoParaExcluir(servico);
  };

  const sincronizarTotaisEvento = async () => {
    if (!userId) return;
    const servicosAtualizados = await dataService.getServicosEvento(userId, evento.id);
    const totalServicosAtualizado = servicosAtualizados
      .filter((servico) => !servico.removido)
      .reduce((total, servico) => {
        const quantidade = servico.quantidade ?? 1;
        const valorUnitario = servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0;
        const totalItem = servico.valorTotalItem ?? quantidade * valorUnitario;
        return total + totalItem;
      }, 0);

    const payload: Partial<Evento> = {
      valorTotalServicosCalculado: totalServicosAtualizado
    };

    if ((evento.modoValorTotal || 'manual') === 'automatico') {
      payload.valorTotal = totalServicosAtualizado;
    }

    await dataService.updateEvento(evento.id, payload, userId);
  };

  const handleConfirmarExclusao = async () => {
    if (servicoParaExcluir && userId) {
      try {
        await dataService.deleteServicoEvento(userId, evento.id, servicoParaExcluir.id);
        await sincronizarTotaisEvento();
        onServicosChange();
        setServicoParaExcluir(null);
      } catch (error) {
        // Erro ao excluir serviço
      }
    }
  };

  const handleSalvarServico = async (servico: ServicoEvento) => {
    if (!userId) return;

    try {
      if (servicoEditando) {
        await dataService.updateServicoEvento(userId, evento.id, servico.id, servico);
      } else {
        await dataService.createServicoEvento(userId, evento.id, servico);
      }
      await sincronizarTotaisEvento();
      
      onServicosChange();
      setShowForm(false);
      setServicoEditando(null);
    } catch (error) {
      // Erro ao salvar serviço
    }
  };

  const totalServicos = servicos
    .filter((servico) => !servico.removido)
    .reduce((total, servico) => {
      const quantidade = servico.quantidade ?? 1;
      const valorUnitario = servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0;
      const totalItem = servico.valorTotalItem ?? quantidade * valorUnitario;
      return total + totalItem;
    }, 0);

  const historicoCombinado = React.useMemo(() => {
    const itensServicos = historicoServicos.map((item) => ({
      ...item,
      tipoRegistro: 'servico' as const,
      dataOrdenacao: new Date(item.dataAlteracao).getTime()
    }));
    const itensEvento = historicoEvento.map((item) => ({
      ...item,
      tipoRegistro: 'evento' as const,
      dataOrdenacao: new Date(item.dataAlteracao).getTime()
    }));

    return [...itensServicos, ...itensEvento]
      .sort((a, b) => b.dataOrdenacao - a.dataOrdenacao);
  }, [historicoServicos, historicoEvento]);

  const historicoFiltrado = historicoCombinado.filter((item) => {
    if (filtroHistorico === 'todos') return true;
    if (filtroHistorico === 'servicos') return item.tipoRegistro === 'servico';
    return item.tipoRegistro === 'evento';
  });

  const historicoFiltradoPeriodo = historicoFiltrado.filter((item) => {
    const dataItem = new Date(item.dataAlteracao);
    if (filtroPeriodo === 'todos') return true;
    if (filtroPeriodo === 'hoje') return isToday(dataItem);
    if (filtroPeriodo === '7d') return dataItem >= subDays(new Date(), 7);
    return dataItem >= subDays(new Date(), 30);
  });

  const historicoVisivel = historicoFiltradoPeriodo.slice(0, limiteHistorico);

  const handleCancelar = () => {
    setShowForm(false);
    setServicoEditando(null);
  };

  // Função para gerar cor baseada no nome do tipo de serviço
  const getTipoServicoColor = (nome: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-gray-100 text-gray-800'
    ];
    
    // Gerar um índice baseado no nome para consistência
    let hash = 0;
    for (let i = 0; i < nome.length; i++) {
      hash = ((hash << 5) - hash + nome.charCodeAt(i)) & 0xffffffff;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Filtrar serviços já adicionados ao evento
  const servicosJaAdicionados = new Set(servicos.map(s => s.servicoId || s.tipoServicoId));
  const tiposDisponiveisParaAdicionar = tiposServicoDisponiveis.filter(
    tipo => !servicosJaAdicionados.has(tipo.id)
  );

  if (showForm) {
    return (
      <ServicoForm
        servico={servicoEditando || undefined}
        evento={evento}
        onSave={handleSalvarServico}
        onCancel={handleCancelar}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WrenchScrewdriverIcon className="h-5 w-5" />
                Serviços do Evento ({resumoServicos.quantidadeItens})
              </CardTitle>
              <CardDescription>
                Gerencie os serviços prestados neste evento
              </CardDescription>
              <div className="mt-2 text-sm text-text-secondary">
                Total dos serviços: <strong className="text-text-primary">R$ {totalServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleNovoServico} className="btn-add p-2">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Novo Serviço</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {servicos.length === 0 ? (
            <div className="text-center py-8">
              <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">Nenhum serviço cadastrado</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Comece adicionando um serviço para este evento.
              </p>
              <div className="mt-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleNovoServico} className="btn-add p-2">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Novo Serviço</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lista de Serviços */}
              <div className="space-y-3">
                {servicos.map((servico) => (
                  <div
                    key={servico.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoServicoColor(servico.tipoServico.nome)}`}>
                            {servico.tipoServico.nome}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {servico.quantidade ?? 1}x R$ {(servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-semibold text-text-primary">
                            = R$ {(servico.valorTotalItem ?? ((servico.quantidade ?? 1) * (servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {servico.observacoes && (
                          <p className="text-sm text-text-muted italic mt-2">
                            {servico.observacoes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <div className="flex gap-1">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="action-edit"
                                  size="icon"
                                  onClick={() => handleEditarServico(servico)}
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="font-medium">
                                <p>Editar serviço</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="action-delete"
                                  size="icon"
                                  onClick={() => handleExcluirServico(servico)}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="font-medium">
                                <p>Excluir serviço</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Seleção de Serviços */}
      {showModalSelecao && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 modal-card max-h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Adicionar Serviços</CardTitle>
                  <CardDescription>
                    Selecione os serviços que deseja adicionar ao evento
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFecharModalSelecao}
                  className="h-8 w-8 p-0"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {/* Seção de Criar Novo Serviço */}
              {!loadingTipos && (
                <div className="mb-6 p-4 border border-border rounded-lg bg-surface">
                  <div className="flex items-center gap-2 mb-3">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-accent" />
                    <label className="text-sm font-medium text-text-primary">
                      Criar Novo Serviço
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o nome do novo serviço"
                      value={novoServicoNome}
                      onChange={(e) => setNovoServicoNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && novoServicoNome.trim()) {
                          handleCriarNovoServico();
                        }
                      }}
                      disabled={criandoServico}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleCriarNovoServico}
                      disabled={!novoServicoNome.trim() || criandoServico}
                      size="sm"
                    >
                      {criandoServico ? 'Criando...' : 'Criar'}
                    </Button>
                  </div>
                </div>
              )}

              {loadingTipos ? (
                <div className="text-center py-8">
                  <div className="text-text-secondary">Carregando serviços...</div>
                </div>
              ) : tiposDisponiveisParaAdicionar.length === 0 ? (
                <div className="text-center py-8">
                  <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-text-muted" />
                  <h3 className="mt-2 text-sm font-medium text-text-primary">
                    Todos os serviços já foram adicionados
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Não há mais serviços disponíveis para adicionar.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <span className="text-sm font-medium text-text-primary">
                      {servicosSelecionados.size} de {tiposDisponiveisParaAdicionar.length} selecionados
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelecionarTodos}
                    >
                      {servicosSelecionados.size === tiposDisponiveisParaAdicionar.length 
                        ? 'Desmarcar Todos' 
                        : 'Selecionar Todos'}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {tiposDisponiveisParaAdicionar.map((tipo) => (
                      <label
                        key={tipo.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-surface-hover cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={servicosSelecionados.has(tipo.id)}
                          onChange={() => handleToggleServico(tipo.id)}
                          className="w-4 h-4 text-accent border-border rounded focus:ring-accent focus:ring-2"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">
                            {tipo.nome}
                          </div>
                          {tipo.descricao && (
                            <div className="text-xs text-text-secondary mt-0.5">
                              {tipo.descricao}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <div className="flex justify-end space-x-2 p-6 border-t border-border flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleFecharModalSelecao}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarServicosSelecionados}
                disabled={servicosSelecionados.size === 0 || loadingTipos}
              >
                Salvar ({servicosSelecionados.size})
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {servicoParaExcluir && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 modal-card">
            <CardHeader>
              <CardTitle>Confirmar Exclusão</CardTitle>
                     <CardDescription>
                       Tem certeza que deseja excluir este serviço?
                       <br />
                       <strong>Tipo:</strong> {servicoParaExcluir.tipoServico.nome}
                       <br />
                       Esta ação não pode ser desfeita.
                     </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setServicoParaExcluir(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleConfirmarExclusao}
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
          <CardDescription>
            Mudanças de valores por serviço e no total do evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {historicoCombinado.length === 0 ? (
            <p className="text-sm text-text-secondary">Nenhuma alteração registrada até o momento.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filtroHistorico === 'todos' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroHistorico('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={filtroHistorico === 'servicos' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroHistorico('servicos')}
                >
                  Serviços
                </Button>
                <Button
                  variant={filtroHistorico === 'evento' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroHistorico('evento')}
                >
                  Valor total
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filtroPeriodo === 'todos' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroPeriodo('todos')}
                >
                  Todo período
                </Button>
                <Button
                  variant={filtroPeriodo === 'hoje' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroPeriodo('hoje')}
                >
                  Hoje
                </Button>
                <Button
                  variant={filtroPeriodo === '7d' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroPeriodo('7d')}
                >
                  Últimos 7 dias
                </Button>
                <Button
                  variant={filtroPeriodo === '30d' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroPeriodo('30d')}
                >
                  Últimos 30 dias
                </Button>
              </div>

              {historicoVisivel.map((item) => (
                <div key={`${item.tipoRegistro}-${item.id}`} className="rounded border border-border p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-text-primary">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    {item.tipoRegistro === 'servico' ? 'Serviço alterado' : 'Total do evento alterado'}
                  </div>

                  {item.tipoRegistro === 'servico' ? (
                    <>
                      {(() => {
                        const deltaItem = (item.valorTotalItemNovo ?? 0) - (item.valorTotalItemAnterior ?? 0);
                        return (
                          <div
                            className={`mt-2 text-xs font-semibold ${
                              deltaItem > 0 ? 'text-success' : deltaItem < 0 ? 'text-error' : 'text-text-secondary'
                            }`}
                          >
                            Delta item: {deltaItem >= 0 ? '+' : ''}R$ {deltaItem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        );
                      })()}
                      <div className="mt-2 text-text-secondary">
                        Antes: {item.quantidadeAnterior ?? '-'}x R$ {(item.valorUnitarioAnterior ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {' '}= <strong>R$ {(item.valorTotalItemAnterior ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div
                        className={
                          (item.valorTotalItemNovo ?? 0) > (item.valorTotalItemAnterior ?? 0)
                            ? 'text-success'
                            : (item.valorTotalItemNovo ?? 0) < (item.valorTotalItemAnterior ?? 0)
                              ? 'text-error'
                              : 'text-text-secondary'
                        }
                      >
                        Depois: {item.quantidadeNova ?? '-'}x R$ {(item.valorUnitarioNovo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {' '}= <strong>R$ {(item.valorTotalItemNovo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const deltaCobrado = (item.valorTotalNovo ?? 0) - (item.valorTotalAnterior ?? 0);
                        const deltaCalculado = (item.valorTotalServicosNovo ?? 0) - (item.valorTotalServicosAnterior ?? 0);
                        return (
                          <div className="mt-2 space-y-1">
                            <div
                              className={`text-xs font-semibold ${
                                deltaCobrado > 0 ? 'text-success' : deltaCobrado < 0 ? 'text-error' : 'text-text-secondary'
                              }`}
                            >
                              Delta cobrado: {deltaCobrado >= 0 ? '+' : ''}R$ {deltaCobrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div
                              className={`text-xs font-semibold ${
                                deltaCalculado > 0 ? 'text-success' : deltaCalculado < 0 ? 'text-error' : 'text-text-secondary'
                              }`}
                            >
                              Delta calculado: {deltaCalculado >= 0 ? '+' : ''}R$ {deltaCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="mt-2 text-text-secondary">
                        Modo: <strong>{item.modoValorAnterior || '-'}</strong> → <strong>{item.modoValorNovo || '-'}</strong>
                      </div>
                      <div className="text-text-secondary">
                        Cobrado: R$ {(item.valorTotalAnterior ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {' '}→{' '}
                        <strong
                          className={
                            (item.valorTotalNovo ?? 0) > (item.valorTotalAnterior ?? 0)
                              ? 'text-success'
                              : (item.valorTotalNovo ?? 0) < (item.valorTotalAnterior ?? 0)
                                ? 'text-error'
                                : ''
                          }
                        >
                          R$ {(item.valorTotalNovo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="text-text-secondary">
                        Calculado pelos serviços: R$ {(item.valorTotalServicosAnterior ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {' '}→{' '}
                        <strong
                          className={
                            (item.valorTotalServicosNovo ?? 0) > (item.valorTotalServicosAnterior ?? 0)
                              ? 'text-success'
                              : (item.valorTotalServicosNovo ?? 0) < (item.valorTotalServicosAnterior ?? 0)
                                ? 'text-error'
                                : ''
                          }
                        >
                          R$ {(item.valorTotalServicosNovo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </>
                  )}

                  <div className="text-xs text-text-muted mt-1">
                    {format(new Date(item.dataAlteracao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    {item.motivoAjuste ? ` • ${item.motivoAjuste}` : ''}
                  </div>
                </div>
              ))}

              {historicoFiltradoPeriodo.length > limiteHistorico && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimiteHistorico((atual) => atual + 8)}
                >
                  Ver mais histórico
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
