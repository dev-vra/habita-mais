import { describe, expect, it } from 'vitest';
import { isValidCep, isValidCnpj, isValidCpf, normalizeCnpj, onlyDigits } from './validators.js';

describe('isValidCpf', () => {
  it('aceita CPF válido (com e sem máscara)', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejeita DV incorreto', () => {
    expect(isValidCpf('52998224724')).toBe(false);
  });

  it('rejeita sequências iguais e tamanho errado', () => {
    expect(isValidCpf('00000000000')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('aceita CPF cujo DV cai no ramo resto=10 → 0', () => {
    expect(isValidCpf('00000000604')).toBe(true);
  });
});

describe('isValidCnpj', () => {
  it('aceita CNPJ numérico legado', () => {
    expect(isValidCnpj('11.444.777/0001-61')).toBe(true);
    expect(isValidCnpj('11444777000161')).toBe(true);
  });

  it('aceita CNPJ alfanumérico (regra julho/2026)', () => {
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true);
    expect(isValidCnpj('12abc34501de35')).toBe(true); // normaliza p/ uppercase
  });

  it('rejeita DV incorreto e letra no DV', () => {
    expect(isValidCnpj('11444777000162')).toBe(false);
    expect(isValidCnpj('12ABC34501DEAA')).toBe(false);
  });

  it('rejeita tamanho errado e sequência igual', () => {
    expect(isValidCnpj('123')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });

  it('aceita CNPJ cujo DV cai no ramo resto<2 → 0', () => {
    expect(isValidCnpj('00000000000604')).toBe(true);
  });
});

describe('helpers', () => {
  it('onlyDigits remove não-dígitos', () => {
    expect(onlyDigits('(66) 3444-9999')).toBe('6634449999');
  });

  it('normalizeCnpj remove máscara e faz uppercase', () => {
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });

  it('isValidCep exige 8 dígitos', () => {
    expect(isValidCep('78788-888')).toBe(true);
    expect(isValidCep('7878')).toBe(false);
  });
});
