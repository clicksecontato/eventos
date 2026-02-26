'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useValoresAtrasados } from '@/hooks/useData';
import { ValoresAtrasadosFiltros } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ArrowRightIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function ValoresAtrasadosPage() {
  const router = useRouter();
  const [filtros, setFiltros] = useState<ValoresAtrasadosFiltros>({
    ordenarPor: 'diaFinalPagamento',
    ordem: 'asc'
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const { valores, resumo, loading, error, refetch } = useValoresAtrasados(filtros);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleFiltroChange = (campo: keyof ValoresAtrasadosFiltros, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      ordenarPor: 'diaFinalPagamento',
      ordem: 'asc'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Carregando valores atrasados...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-error">Erro: {error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-error" />
              Valores Atrasados
            </h1>
            <p className="text-text-secondary mt-1">
              Eventos com valores vencidos que precisam de atenção
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Resumo */}
        {resumo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Total de Eventos</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {resumo.totalEventos}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Valor Total Atrasado</p>
                <p className="text-2xl font-bold text-error mt-1">
                  {formatarValor(resumo.valorTotalAtrasado)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Média de Dias em Atraso</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {resumo.mediaDiasAtraso} dias
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-text-secondary">Maior Valor Atrasado</p>
                <p className="text-2xl font-bold text-error mt-1">
                  {formatarValor(resumo.maiorValorAtrasado)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        {mostrarFiltros && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ordenar por
                  </label>
                  <select
                    value={filtros.ordenarPor || 'diaFinalPagamento'}
                    onChange={(e) => handleFiltroChange('ordenarPor', e.target.value)}
                    className="w-full p-2 border rounded bg-background text-text-primary"
                  >
                    <option value="diaFinalPagamento">Data de Vencimento</option>
                    <option value="valorAtrasado">Valor Atrasado</option>
                    <option value="diasAtraso">Dias em Atraso</option>
                    <option value="dataEvento">Data do Evento</option>
                    <option value="clienteNome">Nome do Cliente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Ordem
                  </label>
                  <select
                    value={filtros.ordem || 'asc'}
                    onChange={(e) => handleFiltroChange('ordem', e.target.value)}
                    className="w-full p-2 border rounded bg-background text-text-primary"
                  >
                    <option value="asc">Crescente</option>
                    <option value="desc">Decrescente</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={limparFiltros} className="w-full">
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Valores Atrasados */}
        {valores.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary">Nenhum valor atrasado encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {valores.map((valor) => (
              <Card
                key={valor.eventoId}
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => router.push(`/eventos/${valor.eventoId}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-text-primary">
                          {valor.nomeEvento}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-error/10 text-error rounded">
                          {valor.diasAtraso} {valor.diasAtraso === 1 ? 'dia' : 'dias'} atrasado
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-text-secondary">Cliente</p>
                          <p className="text-base font-medium text-text-primary mt-1">
                            {valor.cliente.nome}
                          </p>
                          {valor.cliente.telefone && (
                            <p className="text-xs text-text-muted mt-1">
                              {valor.cliente.telefone}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">Data do Evento</p>
                          <p className="text-base font-medium text-text-primary mt-1">
                            {format(valor.dataEvento, 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            Vencimento: {format(valor.diaFinalPagamento, 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">Valores</p>
                          <div className="mt-1">
                            <p className="text-base font-medium text-text-primary">
                              Total: {formatarValor(valor.valorTotal)}
                            </p>
                            <p className="text-sm text-text-secondary">
                              Pago: {formatarValor(valor.totalPago)}
                            </p>
                            <p className="text-lg font-bold text-error">
                              Atrasado: {formatarValor(valor.valorAtrasado)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/eventos/${valor.eventoId}`);
                      }}
                      className="ml-4"
                    >
                      Ver Evento
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
