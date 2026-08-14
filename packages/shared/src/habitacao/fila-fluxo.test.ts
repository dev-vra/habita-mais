import { describe, expect, it } from 'vitest';
import {
  SITUACOES_INSCRICAO,
  ocupaPosicaoNaFila,
  podeTransicionar,
  situacaoAposConvocacao,
  transicoesPossiveis,
} from './fila-fluxo.js';

describe('podeTransicionar', () => {
  it('permite o caminho da inscrição à contemplação', () => {
    expect(podeTransicionar('EM_ANALISE', 'APTA')).toBe(true);
    expect(podeTransicionar('APTA', 'CONVOCADA')).toBe(true);
    expect(podeTransicionar('CONVOCADA', 'CONTEMPLADA')).toBe(true);
  });

  it('impede pular a validação e ir direto à contemplação', () => {
    expect(podeTransicionar('EM_ANALISE', 'CONTEMPLADA')).toBe(false);
    expect(podeTransicionar('PENDENTE', 'CONVOCADA')).toBe(false);
  });

  it('trata contemplação e desistência como estados finais', () => {
    expect(transicoesPossiveis('CONTEMPLADA')).toEqual([]);
    expect(transicoesPossiveis('DESISTENTE')).toEqual([]);
  });

  it('deixa a inscrição voltar à fila quando a família não comparece', () => {
    expect(podeTransicionar('CONVOCADA', 'APTA')).toBe(true);
  });

  it('abre recurso a partir de indeferimento e de inelegibilidade', () => {
    expect(podeTransicionar('INDEFERIDA', 'EM_RECURSO')).toBe(true);
    expect(podeTransicionar('INELEGIVEL', 'EM_RECURSO')).toBe(true);
  });

  it('declara transições para todas as situações conhecidas', () => {
    for (const situacao of SITUACOES_INSCRICAO) {
      expect(Array.isArray(transicoesPossiveis(situacao))).toBe(true);
    }
  });
});

describe('ocupaPosicaoNaFila', () => {
  it('mantém no ranking quem está apta, convocada ou em recurso', () => {
    expect(ocupaPosicaoNaFila('APTA')).toBe(true);
    expect(ocupaPosicaoNaFila('CONVOCADA')).toBe(true);
    expect(ocupaPosicaoNaFila('EM_RECURSO')).toBe(true);
  });

  it('tira do ranking quem tem pendência ou saiu', () => {
    expect(ocupaPosicaoNaFila('PENDENTE')).toBe(false);
    expect(ocupaPosicaoNaFila('INDEFERIDA')).toBe(false);
    expect(ocupaPosicaoNaFila('CONTEMPLADA')).toBe(false);
  });
});

describe('situacaoAposConvocacao', () => {
  it('mapeia cada desfecho para a situação correspondente', () => {
    expect(situacaoAposConvocacao('COMPARECEU')).toBe('CONTEMPLADA');
    expect(situacaoAposConvocacao('NAO_COMPARECEU')).toBe('APTA');
    expect(situacaoAposConvocacao('RECUSOU')).toBe('DESISTENTE');
    expect(situacaoAposConvocacao('INELEGIVEL')).toBe('INELEGIVEL');
  });

  it('produz sempre uma transição válida a partir de CONVOCADA', () => {
    const desfechos = ['COMPARECEU', 'NAO_COMPARECEU', 'RECUSOU', 'INELEGIVEL'] as const;

    for (const desfecho of desfechos) {
      expect(podeTransicionar('CONVOCADA', situacaoAposConvocacao(desfecho))).toBe(true);
    }
  });
});
