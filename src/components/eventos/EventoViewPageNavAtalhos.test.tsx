import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventoViewPageNavAtalhos } from './EventoViewPageNavAtalhos';

describe('EventoViewPageNavAtalhos', () => {
  it('chama scrollTo com offset ao acionar âncora', async () => {
    const user = userEvent.setup();
    const fake = { offsetTop: 800 } as HTMLElement;
    const getById = vi.spyOn(document, 'getElementById').mockReturnValue(fake);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(<EventoViewPageNavAtalhos />);
    await user.click(screen.getByRole('button', { name: 'SERVIÇOS' }));

    expect(getById).toHaveBeenCalledWith('servicos');
    expect(scrollTo).toHaveBeenCalledWith({ top: 680, behavior: 'smooth' });

    getById.mockRestore();
    scrollTo.mockRestore();
  });
});
