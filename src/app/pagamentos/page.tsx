'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Layout from '@/components/Layout';
import PlanOverlay from '@/components/PlanOverlay';
import { useAllPagamentos } from '@/hooks/useData';
import { Pagamento, Evento } from '@/types';

// Tipo estendido para pagamentos com informações do evento
interface PagamentoComEvento extends Pagamento {
  evento?: {
    id: string;
    nome: string;
    dataEvento: Date;
    local: string;
    cliente: {
      nome: string;
    };
  };
}
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PagamentosPage() {
  const router = useRouter();
  const { data: pagamentos, loading, error, refetch } = useAllPagamentos();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Cast para o tipo correto
  const pagamentosComEvento = pagamentos as PagamentoComEvento[] || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pago':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'Pendente':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'Atrasado':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Atrasado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPagamentos = pagamentosComEvento.filter(pagamento => {
    const matchesSearch = 
      (pagamento.evento?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (pagamento.evento?.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (pagamento.evento?.local?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
      (pagamento.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
    
    const matchesStatus = filterStatus === 'todos' || pagamento.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalPagamentos = pagamentosComEvento.length;
  const totalPago = pagamentosComEvento.filter(p => p.status === 'Pago').reduce((sum, p) => sum + p.valor, 0);
  const totalPendente = pagamentosComEvento.filter(p => p.status === 'Pendente').reduce((sum, p) => sum + p.valor, 0);
  const totalAtrasado = pagamentosComEvento.filter(p => p.status === 'Atrasado').reduce((sum, p) => sum + p.valor, 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-text-primary">Erro ao carregar pagamentos</h3>
            <p className="mt-1 text-sm text-text-secondary">{error}</p>
            <div className="mt-6">
              <Button onClick={() => refetch()}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PlanOverlay>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Pagamentos</h1>
            <p className="text-gray-600">Todos os pagamentos dos seus eventos</p>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Pagamentos</p>
                  <p className="text-2xl font-bold text-text-primary">{totalPagamentos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Pago</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Atrasado</p>
                  <p className="text-2xl font-bold text-red-600">
                    R$ {totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por evento, cliente, local ou observações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="Pago">Pago</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Atrasado">Atrasado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos ({filteredPagamentos.length})</CardTitle>
            <CardDescription>
              Lista de todos os pagamentos dos seus eventos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPagamentos.length === 0 ? (
              <div className="text-center py-8">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-text-primary">Nenhum pagamento encontrado</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {searchTerm || filterStatus !== 'todos' 
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Você ainda não tem pagamentos registrados.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPagamentos.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    className="border border-border rounded-lg p-4"
                  >
                    {/* Layout Desktop */}
                    <div className="hidden md:flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getStatusIcon(pagamento.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-medium text-text-primary whitespace-nowrap">
                              R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pagamento.status)}`}>
                              {pagamento.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-text-secondary flex-wrap gap-2 mt-1">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="whitespace-nowrap">
                                {pagamento.dataPagamento ? format(new Date(pagamento.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : 'Data não informada'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">Forma:</span>
                              <span className="truncate">{pagamento.formaPagamento}</span>
                            </div>
                          </div>
                          {pagamento.observacoes && (
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Obs:</span> {pagamento.observacoes}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">{pagamento.evento?.nome}</div>
                          <div>{pagamento.evento?.cliente?.nome}</div>
                          <div className="text-xs text-text-secondary">
                            {pagamento.evento?.dataEvento && format(new Date(pagamento.evento.dataEvento), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </div>
                        <div className="mt-2">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="action-view"
                                  onClick={() => router.push(`/eventos/${pagamento.evento?.id}`)}
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="font-medium">
                                <p>Visualizar evento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>

                    {/* Layout Mobile */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          {getStatusIcon(pagamento.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pagamento.status)}`}>
                                {pagamento.status}
                              </span>
                            </div>
                            <div className="text-lg font-bold text-text-primary mb-2">
                              R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm font-medium text-text-primary mb-1">
                              {pagamento.evento?.cliente?.nome}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {pagamento.evento?.nome}
                            </div>
                          </div>
                        </div>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="action-view"
                                onClick={() => router.push(`/eventos/${pagamento.evento?.id}`)}
                                className="flex-shrink-0"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="font-medium">
                              <p>Visualizar evento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="space-y-1 text-sm text-text-secondary">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span>
                            {pagamento.dataPagamento ? format(new Date(pagamento.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : 'Data não informada'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1.5">Forma:</span>
                          <span className="truncate">{pagamento.formaPagamento}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </PlanOverlay>
    </Layout>
  );
}