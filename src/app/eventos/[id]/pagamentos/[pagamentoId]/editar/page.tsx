'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import PagamentoForm from '@/components/forms/PagamentoForm';
// Funções de busca serão implementadas via dataService
import { Pagamento, Evento } from '@/types';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function EditarPagamentoPage() {
  const params = useParams();
  const router = useRouter();
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.pagamentoId && params.id) {
      // TODO: Implementar busca via dataService
      // const pagamentoEncontrado = await dataService.getPagamentoById(params.pagamentoId as string, userId);
      // const eventoEncontrado = await dataService.getEventoById(params.id as string, userId);
      
      setPagamento(null);
      setEvento(null);
      setLoading(false);
    }
  }, [params.pagamentoId, params.id]);

  const handleSave = async (pagamentoAtualizado: Pagamento): Promise<Pagamento> => {
    // O pagamento já foi atualizado no mockData pela função updatePagamento
    router.push(`/eventos/${params.id}`);
    return pagamentoAtualizado;
  };

  const handleCancel = () => {
    router.push(`/eventos/${params.id}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando pagamento...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!pagamento || !evento) {
    return (
      <Layout>
        <div className="text-center py-12">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-text-primary">Pagamento não encontrado</h3>
          <p className="mt-1 text-sm text-text-secondary">
            O pagamento que você está tentando editar não existe ou foi removido.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push(`/eventos/${params.id}`)}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar para Evento
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/eventos/${params.id}`)}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Editar Pagamento</h1>
              <p className="text-gray-600">
                R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {pagamento.status}
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Pagamento</CardTitle>
            <CardDescription>
              Atualize as informações do pagamento conforme necessário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PagamentoForm
              pagamento={pagamento}
              evento={evento}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
