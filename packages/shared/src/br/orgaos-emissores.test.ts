import { describe, expect, it } from 'vitest';
import { ORGAOS_EMISSORES } from './orgaos-emissores.js';

describe('ORGAOS_EMISSORES', () => {
  it('inclui os órgãos mais comuns', () => {
    for (const orgao of ['SSP', 'DETRAN', 'PC', 'PF']) {
      expect(ORGAOS_EMISSORES).toContain(orgao);
    }
  });

  it('não tem duplicatas', () => {
    expect(new Set(ORGAOS_EMISSORES).size).toBe(ORGAOS_EMISSORES.length);
  });
});
