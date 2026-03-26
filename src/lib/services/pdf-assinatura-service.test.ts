import { describe, expect, it } from 'vitest';
import {
  bufferEhPngValido,
  calcularSha256Hex,
} from '@/lib/services/pdf-assinatura-utils';

describe('pdf-assinatura-service', () => {
  it('calcularSha256Hex produz hash esperado para entrada conhecida', () => {
    const hash = calcularSha256Hex(Buffer.from('teste', 'utf8'));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(
      '46070d4bf934fb0d4b06d9e2c46e346944e322444900a435d7d9a95e6d7435f5'
    );
  });

  it('bufferEhPngValido identifica assinatura PNG', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(bufferEhPngValido(png)).toBe(true);
    expect(bufferEhPngValido(Buffer.from('JPEG'))).toBe(false);
  });
});
