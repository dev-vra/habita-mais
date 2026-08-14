import { describe, expect, it } from 'vitest';
import { classificarFila, montarListaConvocacao } from './ranking.js';
import type { ItemFila } from './ranking.js';

function inscricao(sobrescrita: Partial<ItemFila> & Pick<ItemFila, 'protocolo'>): ItemFila {
  return {
    inscricaoId: sobrescrita.protocolo,
    pontuacao: 80,
    inscritaEm: '2024-01-10',
    mesesResidenciaMunicipio: 60,
    apta: true,
    ...sobrescrita,
  };
}

describe('classificarFila', () => {
  it('ordena pela maior pontuação', () => {
    const fila = classificarFila([
      inscricao({ protocolo: 'HAB-2026/00002', pontuacao: 88 }),
      inscricao({ protocolo: 'HAB-2026/00001', pontuacao: 97 }),
    ]);

    expect(fila.map((i) => i.protocolo)).toEqual(['HAB-2026/00001', 'HAB-2026/00002']);
    expect(fila.map((i) => i.posicao)).toEqual([1, 2]);
  });

  it('desempata pela inscrição mais antiga', () => {
    const fila = classificarFila([
      inscricao({ protocolo: 'HAB-2026/00010', inscritaEm: '2024-06-01' }),
      inscricao({ protocolo: 'HAB-2026/00011', inscritaEm: '2022-08-15' }),
    ]);

    expect(fila[0]?.protocolo).toBe('HAB-2026/00011');
  });

  it('desempata pelo maior tempo de residência quando a data é a mesma', () => {
    const fila = classificarFila([
      inscricao({ protocolo: 'HAB-2026/00020', mesesResidenciaMunicipio: 24 }),
      inscricao({ protocolo: 'HAB-2026/00021', mesesResidenciaMunicipio: 180 }),
    ]);

    expect(fila[0]?.protocolo).toBe('HAB-2026/00021');
  });

  it('usa o protocolo como último desempate, garantindo ordem estável', () => {
    const entrada = [
      inscricao({ protocolo: 'HAB-2026/00031' }),
      inscricao({ protocolo: 'HAB-2026/00030' }),
    ];

    expect(classificarFila(entrada).map((i) => i.protocolo)).toEqual(
      classificarFila(entrada.slice().reverse()).map((i) => i.protocolo),
    );
  });

  it('deixa fora quem não está apta', () => {
    const fila = classificarFila([
      inscricao({ protocolo: 'HAB-2026/00040', pontuacao: 99, apta: false }),
      inscricao({ protocolo: 'HAB-2026/00041', pontuacao: 70 }),
    ]);

    expect(fila).toHaveLength(1);
    expect(fila[0]?.protocolo).toBe('HAB-2026/00041');
  });

  it('não altera o array recebido', () => {
    const entrada = [
      inscricao({ protocolo: 'HAB-2026/00051', pontuacao: 70 }),
      inscricao({ protocolo: 'HAB-2026/00050', pontuacao: 90 }),
    ];
    const copia = entrada.map((i) => i.protocolo);

    classificarFila(entrada);

    expect(entrada.map((i) => i.protocolo)).toEqual(copia);
  });
});

describe('montarListaConvocacao', () => {
  const classificados = classificarFila([
    inscricao({ protocolo: 'HAB-2026/00001', pontuacao: 97 }),
    inscricao({ protocolo: 'HAB-2026/00002', pontuacao: 94 }),
    inscricao({ protocolo: 'HAB-2026/00003', pontuacao: 92 }),
  ]);

  it('devolve os primeiros da ordem publicada', () => {
    expect(montarListaConvocacao(classificados, 2).map((i) => i.posicao)).toEqual([1, 2]);
  });

  it('devolve lista vazia quando não há vaga', () => {
    expect(montarListaConvocacao(classificados, 0)).toEqual([]);
  });

  it('não estoura quando há mais vagas que inscritos', () => {
    expect(montarListaConvocacao(classificados, 10)).toHaveLength(3);
  });
});
