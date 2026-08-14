import { describe, expect, it } from 'vitest';
import { formatarProtocolo, isProtocoloValido, lerProtocolo } from './protocolo.js';

describe('formatarProtocolo', () => {
  it('preenche o sequencial com cinco dígitos', () => {
    expect(formatarProtocolo({ serie: 'HAB', ano: 2026, sequencial: 418 })).toBe('HAB-2026/00418');
  });

  it('formata as demais séries', () => {
    expect(formatarProtocolo({ serie: 'AUX', ano: 2026, sequencial: 87 })).toBe('AUX-2026/00087');
    expect(formatarProtocolo({ serie: 'MUT', ano: 2024, sequencial: 133 })).toBe('MUT-2024/00133');
  });
});

describe('lerProtocolo', () => {
  it('devolve as partes de um protocolo válido', () => {
    expect(lerProtocolo('HAB-2026/00418')).toEqual({ serie: 'HAB', ano: 2026, sequencial: 418 });
  });

  it('aceita minúsculas e espaços em volta', () => {
    expect(lerProtocolo('  hab-2026/00418 ')?.serie).toBe('HAB');
  });

  it('devolve null em vez de lançar quando o formato não bate', () => {
    expect(lerProtocolo('HAB-2026-00418')).toBeNull();
    expect(lerProtocolo('XXX-2026/00418')).toBeNull();
    expect(lerProtocolo('HAB-2026/418')).toBeNull();
    expect(lerProtocolo('')).toBeNull();
  });
});

describe('isProtocoloValido', () => {
  it('responde ao formato, não à existência', () => {
    expect(isProtocoloValido('FIS-2026/00001')).toBe(true);
    expect(isProtocoloValido('nada disso')).toBe(false);
  });
});
