import { describe, expect, it } from 'vitest';
import { maskCpf, maskCnpj, maskCep, maskPhone, maskDate } from './masks.js';

describe('maskCpf', () => {
  it('formata progressivamente conforme digita', () => {
    expect(maskCpf('')).toBe('');
    expect(maskCpf('123')).toBe('123');
    expect(maskCpf('1234')).toBe('123.4');
    expect(maskCpf('1234567')).toBe('123.456.7');
    expect(maskCpf('12345678909')).toBe('123.456.789-09');
  });
  it('ignora não-dígitos e trunca em 11', () => {
    expect(maskCpf('123.456.789-09')).toBe('123.456.789-09');
    expect(maskCpf('1234567890999')).toBe('123.456.789-09');
  });
});

describe('maskCnpj', () => {
  it('formata CNPJ numérico', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });
  it('aceita letras nas 12 primeiras posições (ADR-016) e DV numérico', () => {
    expect(maskCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
  });
  it('formata parcial e trunca em 14', () => {
    expect(maskCnpj('11')).toBe('11');
    expect(maskCnpj('112')).toBe('11.2');
    expect(maskCnpj('112223330001810000')).toBe('11.222.333/0001-81');
  });
});

describe('maskCep', () => {
  it('insere hífen após 5 dígitos', () => {
    expect(maskCep('1234')).toBe('1234');
    expect(maskCep('12345678')).toBe('12345-678');
    expect(maskCep('12345678999')).toBe('12345-678');
  });
});

describe('maskPhone', () => {
  it('vazio e DDD parcial', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('1')).toBe('(1');
    expect(maskPhone('11')).toBe('(11');
    expect(maskPhone('1199')).toBe('(11) 99');
  });
  it('fixo (10 dígitos)', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });
  it('celular (11 dígitos) e trunca', () => {
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888');
    expect(maskPhone('119999988887777')).toBe('(11) 99999-8888');
  });
});

describe('maskDate', () => {
  it('formata dd/mm/aaaa', () => {
    expect(maskDate('2')).toBe('2');
    expect(maskDate('2306')).toBe('23/06');
    expect(maskDate('23062026')).toBe('23/06/2026');
    expect(maskDate('230620261')).toBe('23/06/2026');
  });
});
