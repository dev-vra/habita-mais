// Modelo de referência de critérios (100 pontos), usado como ponto de partida quando a
// prefeitura cria um programa e no seed de demonstração.
//
// Não é regra do produto: cada município publica os seus pesos no regulamento, e é isso que o
// versionamento existe para registrar. O modelo serve para que a tela de criação de programa não
// comece numa folha em branco — o gestor ajusta e publica.

import type { DefinicaoCriterio, VersaoCriterio } from './pontuacao.js';

const MESES_POR_ANO = 12;
const TETO_MENORES_PONTUAVEIS = 3;
const TETO_ANOS_RESIDENCIA = 10;
const TETO_ANOS_INSCRICAO = 5;

/**
 * Faixas de renda per capita em frações do salário mínimo vigente — recebido por parâmetro
 * porque congelar o valor no código faria o regulamento envelhecer sozinho.
 */
function criterioRenda(salarioMinimo: number): DefinicaoCriterio {
  return {
    codigo: 'RENDA_PER_CAPITA',
    rotulo: 'Renda per capita',
    tipo: 'FAIXA',
    peso: 30,
    fonte: 'rendaPerCapita',
    faixas: [
      { ate: salarioMinimo / 4, pontos: 30 },
      { ate: salarioMinimo / 2, pontos: 20 },
      { ate: salarioMinimo, pontos: 10 },
      { ate: null, pontos: 0 },
    ],
  };
}

export function montarCriteriosReferencia(salarioMinimo: number): DefinicaoCriterio[] {
  return [
    criterioRenda(salarioMinimo),
    {
      codigo: 'MENORES_NO_DOMICILIO',
      rotulo: 'Menores no domicílio',
      tipo: 'PROGRESSIVO',
      peso: 15,
      fonte: 'quantidadeMenores',
      pontosPorUnidade: 5,
      unidadeMaxima: TETO_MENORES_PONTUAVEIS,
    },
    {
      codigo: 'MULHER_CHEFE_FAMILIA',
      rotulo: 'Mulher chefe de família',
      tipo: 'FLAG',
      peso: 10,
      fonte: 'mulherChefeFamilia',
    },
    {
      codigo: 'TEMPO_RESIDENCIA',
      rotulo: 'Tempo de residência no município',
      tipo: 'PROGRESSIVO',
      peso: 10,
      fonte: 'mesesResidenciaMunicipio',
      pontosPorUnidade: 10 / (TETO_ANOS_RESIDENCIA * MESES_POR_ANO),
      unidadeMaxima: TETO_ANOS_RESIDENCIA * MESES_POR_ANO,
    },
    {
      codigo: 'TEMPO_INSCRICAO',
      rotulo: 'Tempo de inscrição na fila',
      tipo: 'PROGRESSIVO',
      peso: 10,
      fonte: 'mesesInscricao',
      pontosPorUnidade: 10 / (TETO_ANOS_INSCRICAO * MESES_POR_ANO),
      unidadeMaxima: TETO_ANOS_INSCRICAO * MESES_POR_ANO,
    },
    {
      codigo: 'SITUACAO_RISCO',
      rotulo: 'Situação de risco com laudo',
      tipo: 'FLAG',
      peso: 10,
      fonte: 'situacaoRisco',
      evidencia: 'laudoRiscoRegistrado',
    },
    {
      codigo: 'MORADIA_INADEQUADA',
      rotulo: 'Moradia inadequada',
      tipo: 'FLAG',
      peso: 5,
      fonte: 'moradiaInadequada',
    },
    {
      codigo: 'PESSOA_COM_DEFICIENCIA',
      rotulo: 'Pessoa com deficiência no domicílio',
      tipo: 'FLAG',
      peso: 5,
      fonte: 'temPessoaComDeficiencia',
    },
    {
      codigo: 'IDOSO_NO_DOMICILIO',
      rotulo: 'Idoso no domicílio',
      tipo: 'FLAG',
      peso: 5,
      fonte: 'temIdoso',
    },
  ];
}

export function versaoCriterioReferencia(
  salarioMinimo: number,
  publicadoEm: string,
): VersaoCriterio {
  return { versao: 1, publicadoEm, criterios: montarCriteriosReferencia(salarioMinimo) };
}
