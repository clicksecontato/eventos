'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DateFilter } from '@/components/filters/DateRangeFilter';

interface AgendamentoFiltroBarProps {
  busca: string;
  onBuscaChange: (value: string) => void;
  profissionalId: string;
  onProfissionalChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  profissionais: Array<{ value: string; label: string }>;
  periodStart: string;
  periodEnd: string;
  onPeriodStartChange: (value: string) => void;
  onPeriodEndChange: (value: string) => void;
}

export default function AgendamentoFiltroBar({
  busca,
  onBuscaChange,
  profissionalId,
  onProfissionalChange,
  status,
  onStatusChange,
  profissionais,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange
}: AgendamentoFiltroBarProps) {
  const opcoesStatus = [
    { value: 'todos', label: 'Todos os status' },
    { value: 'agendado', label: 'Agendado' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'cancelado', label: 'Cancelado' }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Input
        label="Buscar"
        placeholder="Cliente, evento ou serviço..."
        value={busca}
        onChange={(e) => onBuscaChange(e.target.value)}
      />
      <Select
        label="Profissional"
        value={profissionalId}
        onValueChange={onProfissionalChange}
        options={profissionais}
      />
      <Select
        label="Status"
        value={status}
        onValueChange={onStatusChange}
        options={opcoesStatus}
      />
      <Input
        label="Início"
        type="date"
        value={periodStart}
        onChange={(e) => onPeriodStartChange(e.target.value)}
      />
      <Input
        label="Fim"
        type="date"
        value={periodEnd}
        onChange={(e) => onPeriodEndChange(e.target.value)}
      />
    </div>
  );
}
