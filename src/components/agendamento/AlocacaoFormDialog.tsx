'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export interface AlocacaoFormValues {
  id?: string;
  eventoId: string;
  servicoEventoId?: string;
  profissionalId: string;
  status: 'agendado' | 'confirmado' | 'cancelado';
  inicio: string;
  fim: string;
  observacoes: string;
}

interface AlocacaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  descricao?: string;
  eventos: Array<{ value: string; label: string }>;
  profissionais: Array<{ value: string; label: string }>;
  servicosEvento: Array<{ value: string; label: string }>;
  valoresIniciais: AlocacaoFormValues;
  onSubmit: (values: AlocacaoFormValues) => Promise<void> | void;
}

const statusOptions = [
  { value: 'agendado', label: 'Agendado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'cancelado', label: 'Cancelado' }
];

export default function AlocacaoFormDialog({
  open,
  onOpenChange,
  title,
  descricao,
  eventos,
  profissionais,
  servicosEvento,
  valoresIniciais,
  onSubmit
}: AlocacaoFormDialogProps) {
  const [form, setForm] = useState<AlocacaoFormValues>(valoresIniciais);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(valoresIniciais);
      setSaving(false);
    }
  }, [open, valoresIniciais]);

  const disabled = useMemo(() => {
    return !form.eventoId || !form.profissionalId || !form.inicio || !form.fim;
  }, [form]);

  const handleSubmit = async () => {
    if (disabled) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Evento"
            value={form.eventoId}
            onValueChange={(value) => setForm((prev) => ({ ...prev, eventoId: value }))}
            options={eventos}
          />
          <Select
            label="Profissional"
            value={form.profissionalId}
            onValueChange={(value) => setForm((prev) => ({ ...prev, profissionalId: value }))}
            options={profissionais}
          />
          <Select
            label="Serviço (opcional)"
            value={form.servicoEventoId || 'sem-servico'}
            onValueChange={(value) => setForm((prev) => ({ ...prev, servicoEventoId: value === 'sem-servico' ? undefined : value }))}
            options={[{ value: 'sem-servico', label: 'Sem serviço específico' }, ...servicosEvento]}
          />
          <Select
            label="Status"
            value={form.status}
            onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as AlocacaoFormValues['status'] }))}
            options={statusOptions}
          />
          <Input
            label="Início"
            type="datetime-local"
            value={form.inicio}
            onChange={(e) => setForm((prev) => ({ ...prev, inicio: e.target.value }))}
          />
          <Input
            label="Fim"
            type="datetime-local"
            value={form.fim}
            onChange={(e) => setForm((prev) => ({ ...prev, fim: e.target.value }))}
          />
          <div className="md:col-span-2">
            <Input
              label="Observações"
              value={form.observacoes}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={disabled || saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
