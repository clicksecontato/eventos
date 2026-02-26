'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CustoForm from '@/components/forms/CustoForm';
import { 
  CustoEvento, 
  Evento,
  AnexoCusto
} from '@/types';
import { dataService } from '@/lib/data-service';
import { useCurrentUser } from '@/hooks/useAuth';
import { usePlano } from '@/lib/hooks/usePlano';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  DocumentIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CustosEventoProps {
  evento: Evento;
  custos: CustoEvento[];
  onCustosChange: () => void;
}

export default function CustosEvento({ 
  evento, 
  custos, 
  onCustosChange 
}: CustosEventoProps) {
  const { userId } = useCurrentUser();
  const { temPermissao } = usePlano();
  const [temAnexosCusto, setTemAnexosCusto] = useState(false);
  const [anexosPorCusto, setAnexosPorCusto] = useState<Record<string, AnexoCusto[]>>({});
  const [anexosExpandidos, setAnexosExpandidos] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [custoEditando, setCustoEditando] = useState<CustoEvento | null>(null);
  const [custoParaExcluir, setCustoParaExcluir] = useState<CustoEvento | null>(null);
  const [resumoCustos, setResumoCustos] = useState({
    total: 0,
    quantidadeItens: 0,
    porCategoria: {} as Record<string, number>
  });

  // Carregar resumo de custos do Firestore
  useEffect(() => {
    const carregarResumoCustos = async () => {
      if (!userId) {
        return;
      }
      
      try {
        const resumo = await dataService.getResumoCustosPorEvento(userId, evento.id);
        setResumoCustos(resumo);
      } catch (error) {
        // Erro ao carregar resumo de custos
      }
    };

    if (evento.id && userId) {
      carregarResumoCustos();
    }
  }, [evento.id, custos, userId]);

  useEffect(() => {
    temPermissao('ANEXOS_CUSTO').then(setTemAnexosCusto);
  }, [temPermissao]);

  const carregarAnexos = async (custoId: string) => {
    if (!userId || !temAnexosCusto) return;
    try {
      const response = await fetch(
        `/api/anexos-custo?eventoId=${evento.id}&custoId=${custoId}`
      );
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        const anexosList = data?.anexos || [];
        setAnexosPorCusto(prev => ({ ...prev, [custoId]: anexosList }));
      }
    } catch (error) {
      // Erro ao carregar anexos
    }
  };

  const toggleAnexos = (custoId: string) => {
    setAnexosExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(custoId)) {
        next.delete(custoId);
      } else {
        next.add(custoId);
        carregarAnexos(custoId);
      }
      return next;
    });
  };

  const deletarAnexo = async (custoId: string, anexoId: string) => {
    try {
      const response = await fetch(
        `/api/anexos-custo?eventoId=${evento.id}&custoId=${custoId}&anexoId=${anexoId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setAnexosPorCusto(prev => ({
          ...prev,
          [custoId]: (prev[custoId] || []).filter(a => a.id !== anexoId)
        }));
      }
    } catch (error) {
      // Erro ao deletar anexo
    }
  };

  const getTipoCustoColor = (nome: string) => {
    // Gera uma cor baseada no nome do tipo de custo
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    
    const hash = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleNovoCusto = () => {
    setCustoEditando(null);
    setShowForm(true);
  };

  const handleEditarCusto = (custo: CustoEvento) => {
    setCustoEditando(custo);
    setShowForm(true);
  };

  const handleExcluirCusto = (custo: CustoEvento) => {
    setCustoParaExcluir(custo);
  };

  const handleSalvarCusto = async (custoData: CustoEvento): Promise<CustoEvento | void> => {
    if (!userId) {
      return;
    }

    try {
      let custoSalvo: CustoEvento;
      if (custoEditando) {
        custoSalvo = await dataService.updateCustoEvento(userId, evento.id, custoEditando.id, custoData);
      } else {
        custoSalvo = await dataService.createCustoEvento(userId, evento.id, custoData);
      }

      const resumo = await dataService.getResumoCustosPorEvento(userId, evento.id);
      setResumoCustos(resumo);
      onCustosChange();
      setShowForm(false);
      setCustoEditando(null);
      return custoSalvo;
    } catch (error) {
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!userId) {
      return;
    }
    
    if (custoParaExcluir) {
      try {
        await dataService.deleteCustoEvento(userId, evento.id, custoParaExcluir.id);
        
        // Recarregar resumo de custos
        const resumo = await dataService.getResumoCustosPorEvento(userId, evento.id);
        setResumoCustos(resumo);
        
        onCustosChange();
        setCustoParaExcluir(null);
      } catch (error) {
        alert('Erro ao excluir custo. Por favor, tente novamente.');
      }
    }
  };

  const handleCancelarForm = () => {
    setShowForm(false);
    setCustoEditando(null);
  };

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {custoEditando ? 'Editar Custo' : 'Novo Custo'}
          </CardTitle>
          <CardDescription>
            {custoEditando ? 'Atualize as informações do custo' : 'Adicione um novo custo para este evento'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustoForm
            custo={custoEditando || undefined}
            evento={evento}
            onSave={handleSalvarCusto}
            onCancel={handleCancelarForm}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalculatorIcon className="h-5 w-5 mr-2" />
            Resumo de Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-text-primary">
                R$ {resumoCustos.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-text-secondary">Total de Custos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {resumoCustos.quantidadeItens}
              </div>
              <div className="text-sm text-text-secondary">Itens de Custo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(resumoCustos.porCategoria).length}
              </div>
              <div className="text-sm text-text-secondary">Tipos</div>
            </div>
          </div>
          
          {/* Custos por Tipo */}
          {Object.keys(resumoCustos.porCategoria).length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-text-primary mb-3">Custos por Tipo</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(resumoCustos.porCategoria).map(([tipoCusto, valor]) => (
                  <div key={tipoCusto} className="text-center">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoCustoColor(tipoCusto)}`}>
                      {tipoCusto}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-text-primary">
                      R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Custos */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5" />
                Lista de Custos
              </CardTitle>
              <CardDescription>
                {custos.length} custo(s) registrado(s)
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleNovoCusto} className="btn-add p-2">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Novo Custo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {custos.length === 0 ? (
            <div className="text-center py-8">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-text-primary">Nenhum custo registrado</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Comece adicionando o primeiro custo para este evento.
              </p>
              <div className="mt-6">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleNovoCusto} className="btn-add p-2">
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Novo Custo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {custos.map((custo) => (
                <div
                  key={custo.id}
                  className="border border-border rounded-lg p-4"
                >
                  {/* Layout Desktop */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTipoCustoColor(custo.tipoCusto.nome)}`}>
                          {custo.tipoCusto.nome}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-text-secondary flex-wrap gap-2">
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            R$ {custo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {custo.quantidade && custo.quantidade > 1 && (
                          <div className="flex items-center">
                            <span className="mr-1">Qtd:</span>
                            <span className="whitespace-nowrap">{custo.quantidade}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {format(custo.dataCadastro, 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 flex-shrink-0 ml-2">
                      {temAnexosCusto && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleAnexos(custo.id)}
                                className="p-2 text-blue-600 hover:text-blue-700"
                              >
                                <DocumentIcon className="h-4 w-4" />
                                {anexosExpandidos.has(custo.id) ? (
                                  <ChevronDownIcon className="h-3 w-3 ml-1" />
                                ) : (
                                  <ChevronRightIcon className="h-3 w-3 ml-1" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p>Ver anexos</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="action-edit"
                              size="icon"
                              onClick={() => handleEditarCusto(custo)}
                            >
                              <PencilIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Editar custo</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="action-delete"
                              size="icon"
                              onClick={() => handleExcluirCusto(custo)}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            <p>Excluir custo</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Layout Mobile */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTipoCustoColor(custo.tipoCusto.nome)}`}>
                            {custo.tipoCusto.nome}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1 flex-shrink-0">
                        {temAnexosCusto && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAnexos(custo.id)}
                                  className="p-2 text-blue-600 hover:text-blue-700"
                                >
                                  <DocumentIcon className="h-4 w-4" />
                                  {anexosExpandidos.has(custo.id) ? (
                                    <ChevronDownIcon className="h-3 w-3 ml-1" />
                                  ) : (
                                    <ChevronRightIcon className="h-3 w-3 ml-1" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Ver anexos</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="action-edit"
                                size="icon"
                                onClick={() => handleEditarCusto(custo)}
                              >
                                <PencilIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Editar custo</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="action-delete"
                                size="icon"
                                onClick={() => handleExcluirCusto(custo)}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Excluir custo</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm text-text-secondary">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        <span className="break-words">
                          R$ {custo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {custo.quantidade && custo.quantidade > 1 && (
                        <div className="flex items-center">
                          <span className="mr-1.5">Qtd:</span>
                          <span>{custo.quantidade}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                        <span>
                          {format(custo.dataCadastro, 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {custo.observacoes && (
                    <div className="mt-2 text-sm text-text-secondary bg-surface/50 p-2 rounded border border-border">
                      <strong className="text-text-primary">Observações:</strong> {custo.observacoes}
                    </div>
                  )}

                  {temAnexosCusto && anexosExpandidos.has(custo.id) && (
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-text-primary">Anexos</h4>
                        <span className="text-xs text-text-secondary">
                          {anexosPorCusto[custo.id]?.length || 0} arquivo(s)
                        </span>
                      </div>
                      {anexosPorCusto[custo.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {anexosPorCusto[custo.id].map((anexo) => (
                            <div key={anexo.id} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                              <div className="flex items-center space-x-2">
                                <DocumentIcon className="h-4 w-4 text-blue-600" />
                                <span className="text-sm text-text-primary">{anexo.nome}</span>
                                <span className="text-xs text-text-secondary">
                                  ({(anexo.tamanho / 1024 / 1024).toFixed(2)} MB)
                                </span>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(anexo.url, '_blank')}
                                  title="Visualizar arquivo"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <EyeIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deletarAnexo(custo.id, anexo.id)}
                                  title="Remover arquivo"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-text-secondary">
                          <DocumentIcon className="h-8 w-8 mx-auto mb-2 text-text-muted" />
                          <p className="text-sm">Nenhum anexo</p>
                          <p className="text-xs mt-1">Edite o custo para adicionar anexos</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      {custoParaExcluir && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 modal-card">
            <CardHeader>
              <CardTitle>Confirmar Exclusão</CardTitle>
              <CardDescription>
                Tem certeza que deseja excluir este custo?
                <br />
                <strong>Tipo:</strong> {custoParaExcluir.tipoCusto.nome}
                <br />
                <strong>Valor:</strong> R$ {custoParaExcluir.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <br />
                Esta ação não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCustoParaExcluir(null)}
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
    </div>
  );
}
