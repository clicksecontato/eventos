import { describe, expect, it } from 'vitest';
import { formatarDiaSemanaTitulo } from './evento-view-format';

describe('formatarDiaSemanaTitulo', () => {
  it('capitaliza o dia da semana em pt-BR (date-fns)', () => {
    const segunda = formatarDiaSemanaTitulo(new Date('2026-06-15T12:00:00'));
    expect(segunda.charAt(0)).toBe(segunda.charAt(0).toUpperCase());
    expect(segunda.length).toBeGreaterThan(3);
  });
});
