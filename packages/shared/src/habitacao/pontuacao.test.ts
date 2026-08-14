import { describe, expect, it } from 'vitest';
import { calcularPontuacao, validarVersaoCriterio } from './pontuacao.js';
import type { FatosFamilia, VersaoCriterio } from './pontuacao.js';
import { versaoCriterioReferencia } from './criterios-referencia.js';

const SALARIO_MINIMO = 1600;
const CALCULADO_EM = '2026-08-05T09:14:00.000Z';

const REFERENCIA = versaoCriterioReferencia(SALARIO_MINIMO, '2026-01-10T12:00:00.000Z');

function fatos(sobrescrita: Partial<FatosFamilia> = {}): FatosFamilia {
  return {
    rendaPerCapita: 900,
    mesesResidenciaMunicipio: 24,
    mesesInscricao: 12,
    quantidadeMenores: 0,
    temPessoaComDeficiencia: false,
    temIdoso: false,
    mulherChefeFamilia: false,
    moradiaInadequada: false,
    situacaoRisco: false,
    laudoRiscoRegistrado: false,
    ...sobrescrita,
  };
}

describe('calcularPontuacao', () => {
  it('soma os itens e devolve o teto da versão', () => {
    const resultado = calcularPontuacao(REFERENCIA, fatos(), CALCULADO_EM);

    expect(resultado.totalMaximo).toBe(100);
    expect(resultado.versaoCriterio).toBe(1);
    expect(resultado.calculadoEm).toBe(CALCULADO_EM);
    expect(resultado.itens).toHaveLength(REFERENCIA.criterios.length);
  });

  it('aplica a faixa de renda pelo limite superior inclusivo', () => {
    const extrema = calcularPontuacao(REFERENCIA, fatos({ rendaPerCapita: 400 }), CALCULADO_EM);
    const acima = calcularPontuacao(REFERENCIA, fatos({ rendaPerCapita: 401 }), CALCULADO_EM);

    expect(pontosDe(extrema, 'RENDA_PER_CAPITA')).toBe(30);
    expect(pontosDe(acima, 'RENDA_PER_CAPITA')).toBe(20);
  });

  it('limita critério progressivo ao teto de unidades', () => {
    const resultado = calcularPontuacao(REFERENCIA, fatos({ quantidadeMenores: 9 }), CALCULADO_EM);

    expect(pontosDe(resultado, 'MENORES_NO_DOMICILIO')).toBe(15);
  });

  it('nunca entrega mais pontos que o peso do critério', () => {
    const resultado = calcularPontuacao(
      REFERENCIA,
      fatos({ mesesResidenciaMunicipio: 600 }),
      CALCULADO_EM,
    );

    const item = itemDe(resultado, 'TEMPO_RESIDENCIA');
    expect(item.pontos).toBeLessThanOrEqual(item.peso);
    expect(item.pontos).toBe(10);
  });

  it('não pontua situação de risco sem laudo registrado', () => {
    const semLaudo = calcularPontuacao(REFERENCIA, fatos({ situacaoRisco: true }), CALCULADO_EM);
    const item = itemDe(semLaudo, 'SITUACAO_RISCO');

    expect(item.pontos).toBe(0);
    expect(item.observacao).toMatch(/evidência/i);
  });

  it('pontua situação de risco quando o laudo existe', () => {
    const comLaudo = calcularPontuacao(
      REFERENCIA,
      fatos({ situacaoRisco: true, laudoRiscoRegistrado: true }),
      CALCULADO_EM,
    );

    expect(pontosDe(comLaudo, 'SITUACAO_RISCO')).toBe(10);
  });

  it('é determinístico: mesmos fatos e mesma versão produzem a mesma nota', () => {
    const entrada = fatos({ rendaPerCapita: 218, quantidadeMenores: 3, mulherChefeFamilia: true });

    const primeira = calcularPontuacao(REFERENCIA, entrada, CALCULADO_EM);
    const segunda = calcularPontuacao(REFERENCIA, entrada, CALCULADO_EM);

    expect(primeira).toEqual(segunda);
  });

  it('explica a nota item a item, com a base que a produziu', () => {
    const resultado = calcularPontuacao(
      REFERENCIA,
      fatos({ rendaPerCapita: 218, mulherChefeFamilia: true }),
      CALCULADO_EM,
    );

    expect(itemDe(resultado, 'RENDA_PER_CAPITA').base).toBe(218);
    expect(itemDe(resultado, 'MULHER_CHEFE_FAMILIA').base).toBe(true);
  });

  it('recusa critério numérico apontado para fato booleano', () => {
    const versaoInvalida: VersaoCriterio = {
      versao: 2,
      publicadoEm: CALCULADO_EM,
      criterios: [
        {
          codigo: 'ERRADO',
          rotulo: 'Faixa sobre booleano',
          tipo: 'FAIXA',
          peso: 10,
          fonte: 'temIdoso',
          faixas: [{ ate: null, pontos: 10 }],
        },
      ],
    };

    expect(() => calcularPontuacao(versaoInvalida, fatos(), CALCULADO_EM)).toThrow(/temIdoso/);
  });
});

describe('validarVersaoCriterio', () => {
  it('aceita o modelo de referência', () => {
    expect(validarVersaoCriterio(REFERENCIA)).toEqual([]);
  });

  it('recusa versão sem critério', () => {
    const vazia: VersaoCriterio = { versao: 1, publicadoEm: CALCULADO_EM, criterios: [] };

    expect(validarVersaoCriterio(vazia)).toHaveLength(1);
  });

  it('acusa código duplicado, peso zerado e faixa fora de ordem', () => {
    const invalida: VersaoCriterio = {
      versao: 1,
      publicadoEm: CALCULADO_EM,
      criterios: [
        {
          codigo: 'RENDA',
          rotulo: 'Renda',
          tipo: 'FAIXA',
          peso: 10,
          fonte: 'rendaPerCapita',
          faixas: [
            { ate: 500, pontos: 10 },
            { ate: 200, pontos: 5 },
          ],
        },
        { codigo: 'RENDA', rotulo: 'Renda de novo', tipo: 'FLAG', peso: 0, fonte: 'temIdoso' },
      ],
    };

    const erros = validarVersaoCriterio(invalida);
    expect(erros).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/duplicado/),
        expect.stringMatching(/peso maior que zero/),
        expect.stringMatching(/ordem crescente/),
      ]),
    );
  });

  it('exige que a faixa sem teto seja a última', () => {
    const invalida: VersaoCriterio = {
      versao: 1,
      publicadoEm: CALCULADO_EM,
      criterios: [
        {
          codigo: 'RENDA',
          rotulo: 'Renda',
          tipo: 'FAIXA',
          peso: 10,
          fonte: 'rendaPerCapita',
          faixas: [
            { ate: null, pontos: 10 },
            { ate: 500, pontos: 5 },
          ],
        },
      ],
    };

    expect(validarVersaoCriterio(invalida)).toContainEqual(
      expect.stringMatching(/sem teto precisa ser a última/),
    );
  });

  it('recusa faixa que pontua acima do peso', () => {
    const invalida: VersaoCriterio = {
      versao: 1,
      publicadoEm: CALCULADO_EM,
      criterios: [
        {
          codigo: 'RENDA',
          rotulo: 'Renda',
          tipo: 'FAIXA',
          peso: 10,
          fonte: 'rendaPerCapita',
          faixas: [{ ate: null, pontos: 40 }],
        },
      ],
    };

    expect(validarVersaoCriterio(invalida)).toContainEqual(
      expect.stringMatching(/acima do peso declarado/),
    );
  });

  it('cobra faixas em critério de faixa e pontos por unidade em progressivo', () => {
    const invalida: VersaoCriterio = {
      versao: 1,
      publicadoEm: CALCULADO_EM,
      criterios: [
        { codigo: 'SEM_FAIXA', rotulo: 'x', tipo: 'FAIXA', peso: 5, fonte: 'rendaPerCapita' },
        { codigo: 'SEM_UNIDADE', rotulo: 'y', tipo: 'PROGRESSIVO', peso: 5, fonte: 'mesesInscricao' },
      ],
    };

    const erros = validarVersaoCriterio(invalida);
    expect(erros).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/não declarou faixas/),
        expect.stringMatching(/não declarou pontos por unidade/),
      ]),
    );
  });
});

function itemDe(resultado: ReturnType<typeof calcularPontuacao>, codigo: string) {
  const item = resultado.itens.find((i) => i.codigo === codigo);
  if (!item) throw new Error(`Item ${codigo} ausente no resultado.`);
  return item;
}

function pontosDe(resultado: ReturnType<typeof calcularPontuacao>, codigo: string): number {
  return itemDe(resultado, codigo).pontos;
}
