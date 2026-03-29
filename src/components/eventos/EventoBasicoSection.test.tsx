import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventoBasicoSection } from './EventoBasicoSection';
import { eventoEventoViewMinimo } from './evento-view-test-fixtures';

describe('EventoBasicoSection', () => {
  it('renderiza cliente, tipo e horários', () => {
    render(
      <EventoBasicoSection
        evento={eventoEventoViewMinimo()}
        alocacoesEvento={[]}
        profissionaisAlocacao={new Map()}
        onGerenciarAgendamento={vi.fn()}
      />
    );
    expect(screen.getByText('Informações do Cliente')).toBeInTheDocument();
    expect(screen.getByText('Cliente Fixture')).toBeInTheDocument();
    expect(screen.getByText('Informações do Evento')).toBeInTheDocument();
    expect(screen.getByText('Tipo:')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByText('23:00')).toBeInTheDocument();
  });

  it('dispara onGerenciarAgendamento ao clicar em Gerenciar', async () => {
    const onGerenciar = vi.fn();
    const user = userEvent.setup();
    render(
      <EventoBasicoSection
        evento={eventoEventoViewMinimo()}
        alocacoesEvento={[]}
        profissionaisAlocacao={new Map()}
        onGerenciarAgendamento={onGerenciar}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Gerenciar' }));
    expect(onGerenciar).toHaveBeenCalledOnce();
  });
});
