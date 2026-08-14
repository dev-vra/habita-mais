// Motor de pontuação da fila habitacional — núcleo do produto (spec §6.1, §8 "fila manipulável").
//
// Três invariantes sustentam a defesa da prefeitura em auditoria, e estão codificadas aqui:
//  1. O cálculo é puro e determinístico: mesmos fatos + mesma versão de critério = mesma nota.
//  2. Nenhum critério rende mais que o próprio peso — não existe nota "extra" fora do publicado.
//  3. Critério que exige evidência (situação de risco) não pontua sem ela. Sem laudo da Defesa
//     Civil não há prioridade; a decisão vira um item com pontos zero e observação, não um
//     silêncio. Ver spec §6.3.
//
// O tempo entra por parâmetro (`calculadoEm`), nunca por relógio interno: o snapshot precisa ser
// reproduzível anos depois, quando o órgão de controle pedir a conta.

/** Casas decimais da nota publicada. A tela e o ofício mostram "97,0". */
const CASAS_DECIMAIS_NOTA = 1;

const FATOR_ARREDONDAMENTO = 10 ** CASAS_DECIMAIS_NOTA;

export type TipoCriterio = 'FAIXA' | 'FLAG' | 'PROGRESSIVO';

/**
 * Fatos objetivos da família, apurados da ficha social. É a única entrada do cálculo:
 * o que não estiver aqui não pode influenciar a nota.
 */
export interface FatosFamilia {
  rendaPerCapita: number;
  mesesResidenciaMunicipio: number;
  mesesInscricao: number;
  quantidadeMenores: number;
  temPessoaComDeficiencia: boolean;
  temIdoso: boolean;
  mulherChefeFamilia: boolean;
  moradiaInadequada: boolean;
  situacaoRisco: boolean;
  laudoRiscoRegistrado: boolean;
}

export type CampoFato = keyof FatosFamilia;

/** Faixa de pontuação por limite superior inclusivo. `ate: null` = faixa sem teto. */
export interface FaixaCriterio {
  ate: number | null;
  pontos: number;
}

export interface DefinicaoCriterio {
  codigo: string;
  rotulo: string;
  tipo: TipoCriterio;
  /** Teto de pontos do critério. Nenhum caminho de cálculo entrega mais que isto. */
  peso: number;
  fonte: CampoFato;
  /** Fato booleano que comprova o critério. Ausente = critério não exige evidência. */
  evidencia?: CampoFato;
  faixas?: FaixaCriterio[];
  pontosPorUnidade?: number;
  unidadeMaxima?: number;
}

/**
 * Conjunto de critérios publicado para um programa. Versão é imutável depois de publicada:
 * mudar peso exige nova versão, e o snapshot guarda qual valia. Ver spec §8.
 */
export interface VersaoCriterio {
  versao: number;
  publicadoEm: string;
  criterios: DefinicaoCriterio[];
}

export interface ItemPontuacao {
  codigo: string;
  rotulo: string;
  pontos: number;
  peso: number;
  /** Valor do fato que produziu os pontos — é o que torna a nota explicável linha a linha. */
  base: number | boolean;
  observacao?: string;
}

export interface PontuacaoCalculada {
  total: number;
  totalMaximo: number;
  versaoCriterio: number;
  calculadoEm: string;
  itens: ItemPontuacao[];
}

const OBSERVACAO_SEM_EVIDENCIA = 'Não pontuado: evidência exigida não foi registrada.';

function arredondarNota(valor: number): number {
  return Math.round(valor * FATOR_ARREDONDAMENTO) / FATOR_ARREDONDAMENTO;
}

function lerNumero(fatos: FatosFamilia, campo: CampoFato): number {
  const valor = fatos[campo];
  if (typeof valor !== 'number') {
    throw new Error(`Critério numérico aponta o fato booleano "${campo}".`);
  }
  return valor;
}

function lerBooleano(fatos: FatosFamilia, campo: CampoFato): boolean {
  const valor = fatos[campo];
  if (typeof valor !== 'boolean') {
    throw new Error(`Critério de flag aponta o fato numérico "${campo}".`);
  }
  return valor;
}

function pontosPorFaixa(criterio: DefinicaoCriterio, valor: number): number {
  const faixas = criterio.faixas ?? [];
  const faixa = faixas.find((f) => f.ate === null || valor <= f.ate);
  return faixa ? faixa.pontos : 0;
}

function pontosPorProgressao(criterio: DefinicaoCriterio, valor: number): number {
  const porUnidade = criterio.pontosPorUnidade ?? 0;
  const teto = criterio.unidadeMaxima ?? Number.POSITIVE_INFINITY;
  return Math.min(valor, teto) * porUnidade;
}

function pontosBrutos(criterio: DefinicaoCriterio, fatos: FatosFamilia): number {
  switch (criterio.tipo) {
    case 'FAIXA':
      return pontosPorFaixa(criterio, lerNumero(fatos, criterio.fonte));
    case 'FLAG':
      return lerBooleano(fatos, criterio.fonte) ? criterio.peso : 0;
    case 'PROGRESSIVO':
      return pontosPorProgressao(criterio, lerNumero(fatos, criterio.fonte));
  }
}

function avaliarCriterio(criterio: DefinicaoCriterio, fatos: FatosFamilia): ItemPontuacao {
  const base = fatos[criterio.fonte];
  const item: ItemPontuacao = {
    codigo: criterio.codigo,
    rotulo: criterio.rotulo,
    peso: criterio.peso,
    base,
    pontos: 0,
  };

  const evidenciaAusente = criterio.evidencia !== undefined && !lerBooleano(fatos, criterio.evidencia);
  if (evidenciaAusente) {
    return { ...item, observacao: OBSERVACAO_SEM_EVIDENCIA };
  }

  const pontos = Math.min(pontosBrutos(criterio, fatos), criterio.peso);
  return { ...item, pontos: arredondarNota(Math.max(pontos, 0)) };
}

/**
 * Calcula a nota da família sob uma versão de critério. O resultado é o conteúdo do
 * PontuacaoSnapshot — congelado no banco, nunca recalculado sob demanda para exibição.
 */
export function calcularPontuacao(
  versao: VersaoCriterio,
  fatos: FatosFamilia,
  calculadoEm: string,
): PontuacaoCalculada {
  const itens = versao.criterios.map((criterio) => avaliarCriterio(criterio, fatos));
  const total = arredondarNota(itens.reduce((soma, item) => soma + item.pontos, 0));
  const totalMaximo = arredondarNota(
    versao.criterios.reduce((soma, criterio) => soma + criterio.peso, 0),
  );

  return { total, totalMaximo, versaoCriterio: versao.versao, calculadoEm, itens };
}

/**
 * Valida uma versão de critério antes da publicação. Publicar é irreversível na prática —
 * a inscrição abre em cima dela —, então o erro precisa aparecer aqui e não no ranking.
 */
export function validarVersaoCriterio(versao: VersaoCriterio): string[] {
  const erros: string[] = [];

  if (versao.criterios.length === 0) {
    erros.push('A versão precisa de ao menos um critério.');
  }

  const codigosVistos = new Set<string>();
  for (const criterio of versao.criterios) {
    if (codigosVistos.has(criterio.codigo)) {
      erros.push(`Critério "${criterio.codigo}" está duplicado na versão.`);
    }
    codigosVistos.add(criterio.codigo);

    if (criterio.peso <= 0) {
      erros.push(`Critério "${criterio.codigo}" precisa de peso maior que zero.`);
    }
    if (criterio.tipo === 'FAIXA' && !criterio.faixas?.length) {
      erros.push(`Critério "${criterio.codigo}" é de faixa e não declarou faixas.`);
    }
    if (criterio.tipo === 'PROGRESSIVO' && !criterio.pontosPorUnidade) {
      erros.push(`Critério "${criterio.codigo}" é progressivo e não declarou pontos por unidade.`);
    }
    erros.push(...validarOrdemDasFaixas(criterio));
  }

  return erros;
}

function validarOrdemDasFaixas(criterio: DefinicaoCriterio): string[] {
  const faixas = criterio.faixas ?? [];
  const erros: string[] = [];
  let limiteAnterior = Number.NEGATIVE_INFINITY;

  for (const [indice, faixa] of faixas.entries()) {
    const ehUltima = indice === faixas.length - 1;
    if (faixa.ate === null && !ehUltima) {
      erros.push(`Critério "${criterio.codigo}": faixa sem teto precisa ser a última.`);
      continue;
    }
    if (faixa.ate !== null && faixa.ate <= limiteAnterior) {
      erros.push(`Critério "${criterio.codigo}": faixas precisam estar em ordem crescente.`);
    }
    if (faixa.pontos > criterio.peso) {
      erros.push(`Critério "${criterio.codigo}": faixa pontua acima do peso declarado.`);
    }
    if (faixa.ate !== null) limiteAnterior = faixa.ate;
  }

  return erros;
}
