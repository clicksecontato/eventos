import { describe, expect, it } from 'vitest';
import { classeCorStatusAgendamentoAlocacao } from './evento-view-cores';

describe('classeCorStatusAgendamentoAlocacao', () => {
  it('mapeia status conhecidos', () => {
    expect(classeCorStatusAgendamentoAlocacao('agendado')).toContain('info');
    expect(classeCorStatusAgendamentoAlocacao('confirmado')).toContain('success');
    expect(classeCorStatusAgendamentoAlocacao('cancelado')).toContain('error');
  });

  it('usa fallback para status desconhecido', () => {
    expect(classeCorStatusAgendamentoAlocacao('outro')).toContain('surface');
  });
});
