import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventoViewPageStatusBar } from './EventoViewPageStatusBar';

vi.mock('@/components/EventoStatusSelect', () => ({
  default: ({
    eventoId,
    statusAtual,
  }: {
    eventoId: string;
    statusAtual: string;
  }) => React.createElement('div', { 'data-testid': 'status-select-mock' }, `${eventoId}|${statusAtual}`),
}));

describe('EventoViewPageStatusBar', () => {
  it('exibe data de cadastro e repassa id/status ao select', () => {
    const onStatusChange = vi.fn().mockResolvedValue(undefined);
    render(
      <EventoViewPageStatusBar
        eventoId="ev-42"
        statusAtual="Agendado"
        dataCadastro={new Date('2026-03-01T12:00:00')}
        onStatusChange={onStatusChange}
      />
    );
    expect(screen.getByTestId('status-select-mock')).toHaveTextContent('ev-42|Agendado');
    expect(screen.getByText(/01\/03\/2026/)).toBeInTheDocument();
  });
});
