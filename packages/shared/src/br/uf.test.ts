import { describe, expect, it } from 'vitest';
import { ehUfValida, UFS } from './uf.js';

describe('UFS', () => {
  it('tem as 26 unidades federativas + Distrito Federal (27)', () => {
    expect(UFS).toHaveLength(27);
  });

  it('siglas são únicas e têm 2 letras maiúsculas', () => {
    const siglas = UFS.map((u) => u.sigla);
    expect(new Set(siglas).size).toBe(siglas.length);
    for (const s of siglas) expect(s).toMatch(/^[A-Z]{2}$/);
  });
});

describe('ehUfValida', () => {
  it('aceita sigla válida (com ou sem caixa)', () => {
    expect(ehUfValida('MT')).toBe(true);
    expect(ehUfValida('mt')).toBe(true);
  });

  it('rejeita sigla inexistente', () => {
    expect(ehUfValida('XX')).toBe(false);
  });
});
