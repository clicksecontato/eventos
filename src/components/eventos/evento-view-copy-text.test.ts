import { describe, expect, it } from 'vitest';
import { formatarTextoEventoParaCopiar } from './evento-view-copy-text';
import { alocacaoMinima, eventoEventoViewMinimo, servicoEventoMinimo } from './evento-view-test-fixtures';

describe('formatarTextoEventoParaCopiar', () => {
  it('inclui nome do evento e blocos principais', () => {
    const evento = eventoEventoViewMinimo();
    const texto = formatarTextoEventoParaCopiar(evento, [], new Map(), []);
    expect(texto).toContain('Nome do Evento');
    expect(texto).toContain('Evento Fixture');
    expect(texto).toContain('Informações do Evento');
    expect(texto).toContain('Serviços do Evento');
    expect(texto).toMatch(/Tipo:\s*Casamento/);
  });

  it('lista serviços pelo nome do tipo', () => {
    const evento = eventoEventoViewMinimo();
    const texto = formatarTextoEventoParaCopiar(evento, [], new Map(), [servicoEventoMinimo()]);
    expect(texto).toContain('Pacote Foto');
  });

  it('sem serviços usa traço', () => {
    const evento = eventoEventoViewMinimo();
    const bloco = formatarTextoEventoParaCopiar(evento, [], new Map(), []);
    expect(bloco).toMatch(/Serviços do Evento\n\n-\n/);
  });

  it('ignora alocações canceladas e inclui ativas com nome do mapa', () => {
    const evento = eventoEventoViewMinimo({ horarioInicio: '10:00' });
    const mapa = new Map([['prof-fix', 'Dra. Ana']]);
    const texto = formatarTextoEventoParaCopiar(
      evento,
      [
        alocacaoMinima({ id: 'a1', status: 'cancelado' }),
        alocacaoMinima({ id: 'a2', status: 'agendado' }),
      ],
      mapa,
      []
    );
    expect(texto).toContain('Profissionais alocados:');
    expect(texto).toContain('Dra. Ana');
    expect(texto).toContain('(agendado)');
  });
});
