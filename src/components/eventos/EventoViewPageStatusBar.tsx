'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventoStatusSelect from '@/components/EventoStatusSelect';
import type { Evento } from '@/types';

type Props = {
  eventoId: string;
  statusAtual: Evento['status'];
  dataCadastro: Date;
  onStatusChange: (eventoId: string, novoStatus: string) => Promise<void>;
};

export function EventoViewPageStatusBar({ eventoId, statusAtual, dataCadastro, onStatusChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div onClick={(e) => e.stopPropagation()}>
        <EventoStatusSelect eventoId={eventoId} statusAtual={statusAtual} onStatusChange={onStatusChange} />
      </div>
      <span className="text-sm text-text-muted">
        Criado em {format(dataCadastro, 'dd/MM/yyyy', { locale: ptBR })}
      </span>
    </div>
  );
}
