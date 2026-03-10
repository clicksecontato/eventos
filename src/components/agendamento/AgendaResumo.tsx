'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AgendaResumoProps {
  total: number;
  agendados: number;
  confirmados: number;
  cancelados: number;
}

export default function AgendaResumo({
  total,
  agendados,
  confirmados,
  cancelados
}: AgendaResumoProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-text-secondary">Total no período</p>
          <p className="text-2xl font-bold text-text-primary">{total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-text-secondary">Agendados</p>
          <p className="text-2xl font-bold text-info">{agendados}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-text-secondary">Confirmados</p>
          <p className="text-2xl font-bold text-success">{confirmados}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-text-secondary">Cancelados</p>
          <p className="text-2xl font-bold text-error">{cancelados}</p>
        </CardContent>
      </Card>
    </div>
  );
}
