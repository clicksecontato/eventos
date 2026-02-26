'use client';

import React, { useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { SelectValue, SelectTrigger, SelectContent, SelectItem, SelectGroup } from '@/components/ui/select';
import { StatusEvento } from '@/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface EventoStatusSelectProps {
  eventoId: string;
  statusAtual: string;
  onStatusChange: (eventoId: string, novoStatus: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Componente Select para alterar status do evento
 * Exibe loading durante atualização e mantém feedback visual
 */
export default function EventoStatusSelect({
  eventoId,
  statusAtual,
  onStatusChange,
  disabled = false
}: EventoStatusSelectProps) {
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: StatusEvento.AGENDADO, label: 'Agendado' },
    { value: StatusEvento.CONFIRMADO, label: 'Confirmado' },
    { value: StatusEvento.EM_ANDAMENTO, label: 'Em andamento' },
    { value: StatusEvento.CONCLUIDO, label: 'Concluído' },
    { value: StatusEvento.CANCELADO, label: 'Cancelado' }
  ];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case StatusEvento.AGENDADO:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case StatusEvento.CONFIRMADO:
        return 'bg-green-100 text-green-800 border-green-200';
      case StatusEvento.EM_ANDAMENTO:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case StatusEvento.CONCLUIDO:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case StatusEvento.CANCELADO:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleChange = async (novoStatus: string) => {
    if (novoStatus === statusAtual || loading || disabled) {
      return;
    }

    setLoading(true);
    try {
      await onStatusChange(eventoId, novoStatus);
    } catch (error) {
      // Erro já é tratado no componente pai (reversão otimista)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <SelectPrimitive.Root
        value={statusAtual}
        onValueChange={handleChange}
        disabled={loading || disabled}
      >
        <SelectTrigger
          className={`w-[160px] h-8 text-xs font-medium border-2 ${getStatusColor(statusAtual)} ${
            loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          }`}
        >
          <SelectValue>
            {loading ? (
              <span className="flex items-center gap-2">
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
                Atualizando...
              </span>
            ) : (
              statusOptions.find(opt => opt.value === statusAtual)?.label || statusAtual
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </SelectPrimitive.Root>
    </div>
  );
}

