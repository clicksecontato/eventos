import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventoContratosSection } from './EventoContratosSection';

vi.mock('@/components/LoadingHotmart', () => ({
  default: () => null,
}));

describe('EventoContratosSection', () => {
  it('estado vazio com acesso: oferece criar primeiro contrato', async () => {
    const onNovo = vi.fn();
    const user = userEvent.setup();
    render(
      <EventoContratosSection
        contratos={[]}
        loadingContratos={false}
        temAcessoContrato={true}
        dialogGerarLinkContratoId={null}
        onNovoContrato={onNovo}
        onEditarContrato={vi.fn()}
        onGerarPdf={vi.fn()}
        onAbrirDialogGerarLink={vi.fn()}
      />
    );
    expect(screen.getByText('Contratos')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum contrato encontrado/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Criar Primeiro Contrato/i }));
    expect(onNovo).toHaveBeenCalledOnce();
  });

  it('estado vazio sem acesso: mensagem de plano', () => {
    render(
      <EventoContratosSection
        contratos={[]}
        loadingContratos={false}
        temAcessoContrato={false}
        dialogGerarLinkContratoId={null}
        onNovoContrato={vi.fn()}
        onEditarContrato={vi.fn()}
        onGerarPdf={vi.fn()}
        onAbrirDialogGerarLink={vi.fn()}
      />
    );
    expect(screen.getByText(/apenas no plano Premium/i)).toBeInTheDocument();
  });
});
