'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, ClockIcon, PencilIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface AlocacaoCardProps {
  clienteNome: string;
  eventoNome: string;
  servicoNome?: string;
  profissionalNome: string;
  status: 'agendado' | 'confirmado' | 'cancelado';
  inicio: Date;
  fim: Date;
  onEditar: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
  onAbrirEvento: () => void;
}

const statusClasses: Record<AlocacaoCardProps['status'], string> = {
  agendado: 'bg-info-bg text-info-text',
  confirmado: 'bg-success-bg text-success-text',
  cancelado: 'bg-error-bg text-error-text'
};

export default function AlocacaoCard({
  clienteNome,
  eventoNome,
  servicoNome,
  profissionalNome,
  status,
  inicio,
  fim,
  onEditar,
  onCancelar,
  onConfirmar,
  onAbrirEvento
}: AlocacaoCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-text-primary truncate">{eventoNome}</p>
            <p className="text-sm text-text-secondary truncate">{clienteNome}</p>
            {servicoNome && <p className="text-xs text-text-muted truncate">Serviço: {servicoNome}</p>}
          </div>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-1 text-sm text-text-secondary md:grid-cols-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {inicio.toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            {inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="truncate">
            Profissional: <span className="font-medium text-text-primary">{profissionalNome}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEditar}>
            <PencilIcon className="h-4 w-4 mr-1" />
            Editar
          </Button>
          {status !== 'cancelado' && (
            <Button variant="outline" size="sm" onClick={onCancelar}>
              <XCircleIcon className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
          {status === 'agendado' && (
            <Button variant="outline" size="sm" onClick={onConfirmar}>
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Confirmar
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onAbrirEvento}>
            Abrir evento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
