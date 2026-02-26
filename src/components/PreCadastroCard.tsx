'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PreCadastroEvento, StatusPreCadastro } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dateToLocalMidnight } from '@/lib/utils/date-helpers';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as ClockIconSolid,
  EyeIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  LinkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface PreCadastroCardProps {
  preCadastro: PreCadastroEvento;
  onView: (preCadastro: PreCadastroEvento) => void;
  onCreateEvent: (preCadastro: PreCadastroEvento) => void;
  onIgnore: (preCadastro: PreCadastroEvento) => void;
  onRenew: (preCadastro: PreCadastroEvento) => void;
  onCopyLink: (preCadastro: PreCadastroEvento) => void;
  onDelete: (preCadastro: PreCadastroEvento) => void;
}

export default function PreCadastroCard({
  preCadastro,
  onView,
  onCreateEvent,
  onIgnore,
  onRenew,
  onCopyLink,
  onDelete,
}: PreCadastroCardProps) {
  const getStatusBadge = (status: StatusPreCadastro | string) => {
    const statusLower = typeof status === 'string' ? status.toLowerCase() : status;
    
    switch (statusLower) {
      case StatusPreCadastro.PENDENTE:
      case 'pendente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIconSolid className="h-3 w-3 mr-1" />
            Pendente
          </span>
        );
      case StatusPreCadastro.PREENCHIDO:
      case 'preenchido':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Preenchido
          </span>
        );
      case StatusPreCadastro.CONVERTIDO:
      case 'convertido':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Convertido
          </span>
        );
      case StatusPreCadastro.EXPIRADO:
      case 'expirado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Expirado
          </span>
        );
      case StatusPreCadastro.IGNORADO:
      case 'ignorado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XMarkIcon className="h-3 w-3 mr-1" />
            Ignorado
          </span>
        );
      default:
        return null;
    }
  };

  const isExpired = new Date(preCadastro.dataExpiracao) < new Date();
  const statusValue = preCadastro.status as StatusPreCadastro | string;
  const statusStr = String(statusValue).toLowerCase();
  const canCreateEvent = statusValue === StatusPreCadastro.PREENCHIDO || statusStr === StatusPreCadastro.PREENCHIDO;
  const canIgnore = statusValue === StatusPreCadastro.PENDENTE || statusStr === StatusPreCadastro.PENDENTE || statusValue === StatusPreCadastro.PREENCHIDO || statusStr === StatusPreCadastro.PREENCHIDO;

  return (
    <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg leading-tight text-text-primary break-words">
                {preCadastro.nomeEvento || 'Pré-Cadastro sem nome'}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-text-secondary">
                <span className="block text-text-primary font-medium truncate lg:whitespace-normal">
                  {preCadastro.clienteNome || 'Cliente não informado'}
                </span>
                {preCadastro.contratante && (
                  <span className="block text-xs text-text-secondary truncate lg:whitespace-normal">
                    Contratante: {preCadastro.contratante}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(preCadastro.status)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações do Cliente */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-text-secondary">
            <EnvelopeIcon className="h-4 w-4 mr-2" />
            {preCadastro.clienteEmail || 'Email não informado'}
          </div>
          {preCadastro.clienteTelefone && (
            <div className="flex items-center text-sm text-text-secondary">
              <PhoneIcon className="h-4 w-4 mr-2" />
              {preCadastro.clienteTelefone}
            </div>
          )}
        </div>

        {/* Informações do Evento */}
        {preCadastro.dataEvento && (
            <div className="space-y-2">
            <div className="flex items-center text-sm text-text-secondary">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(dateToLocalMidnight(new Date(preCadastro.dataEvento)), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            {preCadastro.local && (
              <div className="flex items-center text-sm text-text-secondary">
                <MapPinIcon className="h-4 w-4 mr-2" />
                {preCadastro.local}
              </div>
            )}
            {preCadastro.horarioInicio && (
              <div className="flex items-center text-sm text-text-secondary">
                <ClockIcon className="h-4 w-4 mr-2" />
                Início: {preCadastro.horarioInicio}
              </div>
            )}
            {preCadastro.horarioTermino && (
              <div className="flex items-center text-sm text-text-secondary">
                <ClockIcon className="h-4 w-4 mr-2" />
                Término: {preCadastro.horarioTermino}
              </div>
            )}
          </div>
        )}

        {/* Informações de Expiração */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Expira em: {format(new Date(preCadastro.dataExpiracao), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            {isExpired && (
              <span className="text-error font-medium">Expirado</span>
            )}
          </div>
          {preCadastro.dataPreenchimento && (
            <div className="text-xs text-text-secondary mt-1">
              Preenchido em: {format(new Date(preCadastro.dataPreenchimento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(preCadastro)}
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
            {canCreateEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateEvent(preCadastro)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Criar Evento
              </Button>
            )}
            {canIgnore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onIgnore(preCadastro)}
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Ignorar
              </Button>
            )}
            {!isExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRenew(preCadastro)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Renovar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyLink(preCadastro)}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              <LinkIcon className="h-4 w-4 mr-1" />
              Copiar Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(preCadastro)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Deletar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
