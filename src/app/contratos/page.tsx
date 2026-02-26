'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import PlanOverlay from '@/components/PlanOverlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { Contrato } from '@/types';
import { PlusIcon, DocumentTextIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon, Cog6ToothIcon, EyeIcon, XMarkIcon, CalendarDaysIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const QUICK_FILTERS = [
  { key: 'today', label: 'Hoje' },
  { key: 'thisWeek', label: 'Esta semana' },
  { key: 'thisMonth', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'thisYear', label: 'Este ano' },
  { key: 'next30Days', label: 'Próx. 30 dias' },
];

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

function getQuickFilterRange(filterKey: string): DateRange {
  const now = new Date();
  switch (filterKey) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'thisWeek':
      return { startDate: startOfWeek(now, { locale: ptBR }), endDate: endOfWeek(now, { locale: ptBR }) };
    case 'thisMonth':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'lastMonth': {
      const lm = subMonths(now, 1);
      return { startDate: startOfMonth(lm), endDate: endOfMonth(lm) };
    }
    case 'thisYear':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    case 'next30Days':
      return { startDate: startOfDay(now), endDate: endOfDay(addDays(now, 30)) };
    default:
      return { startDate: null, endDate: null };
  }
}

export default function ContratosPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [contratoParaExcluir, setContratoParaExcluir] = useState<Contrato | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadContratos();
  }, []);

  const loadContratos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contratos');
      if (response.ok) {
        const result = await response.json();
        const contratos = result.data || result;
        setContratos(Array.isArray(contratos) ? contratos : []);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao carregar contratos', 'error');
      }
    } catch (error) {
      showToast('Erro ao carregar contratos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = useCallback((filterKey: string) => {
    if (selectedQuickFilter === filterKey) {
      // Desselecionar
      setSelectedQuickFilter('');
      setDateRange({ startDate: null, endDate: null });
    } else {
      setSelectedQuickFilter(filterKey);
      setDateRange(getQuickFilterRange(filterKey));
      setMostrarPersonalizado(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, [selectedQuickFilter]);

  const handleAplicarPersonalizado = useCallback(() => {
    if (!customStartDate || !customEndDate) {
      showToast('Preencha as duas datas', 'error');
      return;
    }
    const start = new Date(customStartDate + 'T00:00:00');
    const end = new Date(customEndDate + 'T23:59:59');
    if (start > end) {
      showToast('A data inicial deve ser anterior à data final', 'error');
      return;
    }
    setSelectedQuickFilter('');
    setDateRange({ startDate: startOfDay(start), endDate: endOfDay(end) });
  }, [customStartDate, customEndDate, showToast]);

  const handleTogglePersonalizado = useCallback(() => {
    if (mostrarPersonalizado) {
      // Fechar e limpar personalizado
      setMostrarPersonalizado(false);
      // Se estava usando personalizado sem quick filter, limpar range
      if (!selectedQuickFilter) {
        setDateRange({ startDate: null, endDate: null });
      }
      setCustomStartDate('');
      setCustomEndDate('');
    } else {
      setMostrarPersonalizado(true);
      setSelectedQuickFilter('');
    }
  }, [mostrarPersonalizado, selectedQuickFilter]);

  const temFiltroPeriodo = dateRange.startDate !== null && dateRange.endDate !== null;

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((contrato) => {
      if (filtroStatus && contrato.status !== filtroStatus) return false;

      if (searchTerm) {
        const termo = searchTerm.toLowerCase();
        const numero = (contrato.numeroContrato || '').toLowerCase();
        const modelo = (contrato.modeloContrato?.nome || '').toLowerCase();
        const evento = (contrato.evento?.nomeEvento || '').toLowerCase();
        if (!numero.includes(termo) && !modelo.includes(termo) && !evento.includes(termo)) {
          return false;
        }
      }

      if (temFiltroPeriodo) {
        const data = contrato.dataCadastro instanceof Date
          ? contrato.dataCadastro
          : new Date(contrato.dataCadastro);
        if (!isWithinInterval(startOfDay(data), { start: dateRange.startDate!, end: dateRange.endDate! })) {
          return false;
        }
      }

      return true;
    });
  }, [contratos, filtroStatus, searchTerm, dateRange, temFiltroPeriodo]);

  const temFiltrosAtivos = searchTerm || filtroStatus || temFiltroPeriodo;

  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroStatus('');
    setSelectedQuickFilter('');
    setDateRange({ startDate: null, endDate: null });
    setMostrarPersonalizado(false);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleExcluirContrato = (contrato: Contrato) => {
    setContratoParaExcluir(contrato);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!contratoParaExcluir) return;

    try {
      const response = await fetch(`/api/contratos/${contratoParaExcluir.id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('Contrato excluído com sucesso', 'success');
        loadContratos();
        setContratoParaExcluir(null);
        setShowDeleteDialog(false);
      } else {
        showToast('Erro ao excluir contrato', 'error');
      }
    } catch (error) {
      showToast('Erro ao excluir contrato', 'error');
    }
  };

  const handleGerarPDF = async (id: string) => {
    try {
      const response = await fetch(`/api/contratos/${id}/gerar-pdf`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        showToast('PDF gerado com sucesso', 'success');
        if (data.pdfUrl) {
          window.open(data.pdfUrl, '_blank');
        }
        loadContratos();
      } else {
        showToast('Erro ao gerar PDF', 'error');
      }
    } catch (error) {
      showToast('Erro ao gerar PDF', 'error');
    }
  };

  return (
    <Layout>
      <PlanOverlay>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Contratos</h1>
            <p className="text-text-secondary mt-2">Gerencie seus contratos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => router.push('/contratos/configuracao')}
              title="Configurar dados fixos da empresa"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              Configurar Dados
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/contratos/variaveis')}
              title="Gerenciar campos personalizados"
            >
              Campos Personalizados
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/contratos/templates')}
              title="Gerenciar templates personalizados"
            >
              Templates
            </Button>
            <Button onClick={() => router.push('/contratos/novo')} className="btn-add">
              <PlusIcon className="h-5 w-5 mr-2" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="bg-surface/50 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            {/* Linha 1: Filtros rápidos por período */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDaysIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
                <span className="text-xs font-medium text-text-secondary">Período</span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden pb-1">
                  {QUICK_FILTERS.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => handleQuickFilter(filter.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border cursor-pointer ${
                        selectedQuickFilter === filter.key
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-surface text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary hover:border-border'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <button
                    onClick={handleTogglePersonalizado}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border inline-flex items-center gap-1 cursor-pointer ${
                      mostrarPersonalizado
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface text-text-secondary border-border hover:bg-surface-hover hover:text-text-primary hover:border-border'
                    }`}
                  >
                    <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                    Personalizado
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 2: Período personalizado (escondido por padrão) */}
            {mostrarPersonalizado && (
              <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-border">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">De</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Até</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-text-primary"
                  />
                </div>
                <Button size="sm" onClick={handleAplicarPersonalizado}>
                  Aplicar
                </Button>
                {temFiltroPeriodo && !selectedQuickFilter && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDateRange({ startDate: null, endDate: null });
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-text-secondary"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Limpar período
                  </Button>
                )}
              </div>
            )}

            {/* Linha 3: Busca + Status */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-border">
              <div>
                <Input
                  label="Buscar"
                  placeholder="Número, modelo ou evento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary text-sm"
                >
                  <option value="">Todos os status</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="gerado">Gerado</option>
                  <option value="assinado">Assinado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo dos Filtros Ativos */}
        {temFiltrosAtivos && (
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
                    {filtroStatus && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-bg text-accent-text capitalize">
                        Status: {filtroStatus}
                      </span>
                    )}
                    {temFiltroPeriodo && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-bg text-warning-text">
                        {selectedQuickFilter
                          ? `Período: ${QUICK_FILTERS.find(f => f.key === selectedQuickFilter)?.label}`
                          : `Período: ${format(dateRange.startDate!, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.endDate!, 'dd/MM/yyyy', { locale: ptBR })}`
                        }
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                {contratosFiltrados.length} contrato{contratosFiltrados.length !== 1 ? 's' : ''} encontrado{contratosFiltrados.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : contratosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                {temFiltrosAtivos
                  ? 'Nenhum contrato encontrado com os filtros aplicados'
                  : 'Nenhum contrato encontrado'}
              </div>
            ) : (
              <div className="space-y-4">
                {contratosFiltrados.map((contrato) => (
                  <div key={contrato.id} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{contrato.numeroContrato || 'Sem número'}</h3>
                      <p className="text-sm text-text-secondary">
                        {contrato.modeloContrato?.nome || 'Modelo não encontrado'}
                      </p>
                      {contrato.eventoId && contrato.evento?.nomeEvento && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-sm text-text-secondary">
                            Evento: <span className="font-medium text-text-primary">{contrato.evento.nomeEvento}</span>
                          </p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/eventos/${contrato.eventoId}`)}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver evento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                      <p className="text-xs text-text-secondary">
                        {contrato.dataCadastro 
                          ? (contrato.dataCadastro instanceof Date 
                              ? contrato.dataCadastro.toLocaleDateString('pt-BR')
                              : new Date(contrato.dataCadastro).toLocaleDateString('pt-BR'))
                          : 'N/A'}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                        contrato.status === 'gerado' ? 'bg-green-100 text-green-800' :
                        contrato.status === 'assinado' ? 'bg-blue-100 text-blue-800' :
                        contrato.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contrato.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
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
                      {contrato.status === 'gerado' && contrato.pdfUrl && (
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
                      )}
                      {contrato.status === 'rascunho' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGerarPDF(contrato.id)}
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerar PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExcluirContrato(contrato)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Excluir Contrato</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Confirmação de Exclusão */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Excluir Contrato"
          description={
            contratoParaExcluir
              ? `Tem certeza que deseja excluir o contrato "${contratoParaExcluir.numeroContrato || 'Sem número'}"? Esta ação não pode ser desfeita.`
              : 'Tem certeza que deseja excluir este contrato?'
          }
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleConfirmarExclusao}
        />
      </div>
      </PlanOverlay>
    </Layout>
  );
}

