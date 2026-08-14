import { describe, expect, it } from 'vitest';
import { normalizarMunicipio, tituloCaso } from './texto.js';

describe('tituloCaso', () => {
  it('capitaliza cada palavra', () => {
    expect(tituloCaso('tangará da serra')).toBe('Tangará da Serra');
  });

  it('mantém conectivo em minúsculo, exceto no início', () => {
    expect(tituloCaso('de são paulo')).toBe('De São Paulo');
    expect(tituloCaso('rio de janeiro')).toBe('Rio de Janeiro');
  });

  it('normaliza espaços e aparas', () => {
    expect(tituloCaso('  consórcio   intermunicipal  ')).toBe('Consórcio Intermunicipal');
  });
});

describe('normalizarMunicipio', () => {
  it('remove acento, maiúsculo, sem espaços extras', () => {
    expect(normalizarMunicipio('Tangará da Serra')).toBe('TANGARA DA SERRA');
  });

  it('casa fontes diferentes da mesma cidade', () => {
    expect(normalizarMunicipio('São Paulo')).toBe(normalizarMunicipio('  são   paulo  '));
  });
});
