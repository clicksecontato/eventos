'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import EventoForm from '@/components/forms/EventoForm';
import PlanoBloqueio from '@/components/PlanoBloqueio';
import { Evento } from '@/types';
import {
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function NovoEventoPage() {
  const router = useRouter();

  const handleSave = (novoEvento: Evento) => {
    // O evento foi criado no Firestore via dataService
    router.push(`/eventos/${novoEvento.id}`);
  };

  const handleCancel = () => {
    router.push('/eventos');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push('/eventos')}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Novo Evento</h1>
              <p className="text-gray-600">Cadastre um novo evento no sistema</p>
            </div>
          </div>
        </div>

        {/* Bloqueio de Plano */}
        <PlanoBloqueio
          limite="eventos"
          mensagem="Você precisa de um plano ativo para criar eventos"
        >
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Evento</CardTitle>
              <CardDescription>
                Preencha todas as informações necessárias para cadastrar o evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventoForm
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </PlanoBloqueio>
      </div>
    </Layout>
  );
}
