'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import EventoForm from '@/components/forms/EventoForm';
import { useEvento } from '@/hooks/useData';
import { Evento } from '@/types';
import {
  ArrowLeftIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function EditarEventoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: evento, loading, error } = useEvento(params.id as string);

  const handleSave = async (eventoAtualizado: Evento) => {
    try {
      // O evento já foi atualizado no Firestore pela função updateEvento no EventoForm
      router.push(`/eventos/${eventoAtualizado.id}`);
    } catch (error) {
      // Erro silencioso
    }
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
            <p className="mt-4 text-gray-600">Carregando evento...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">Erro ao carregar evento: {error}</div>
        </div>
      </Layout>
    );
  }

  if (!evento) {
    return (
      <Layout>
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-text-primary">Evento não encontrado</h3>
          <p className="mt-1 text-sm text-text-secondary">
            O evento que você está tentando editar não existe ou foi removido.
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/eventos/${evento.id}`)}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Editar Evento</h1>
              <p className="text-gray-600">
                {evento.nomeEvento || evento.cliente.nome} - {evento.contratante}
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Evento</CardTitle>
            <CardDescription>
              Atualize as informações do evento conforme necessário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventoForm
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
