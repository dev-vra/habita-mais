// Pós-entrega: acompanhamento da família na unidade e ocorrências de uso.
//
// Entregar a chave não encerra a responsabilidade da prefeitura — começa a parte que a lei chama
// de Trabalho Social e que o convênio cobra na prestação de contas. O que este módulo decide é
// quando a próxima visita vence e o que uma ocorrência significa; quem decide o que fazer com
// isso é sempre uma pessoa, com motivo registrado.

/**
 * Eixos do Trabalho Social (Portaria MDR 464/2018). São os mesmos quatro em qualquer programa —
 * o município escolhe as ações, não os eixos.
 */
export const EIXOS_TRABALHO_SOCIAL = [
  'MOBILIZACAO_ORGANIZACAO',
  'ACOMPANHAMENTO_GESTAO',
  'EDUCACAO_AMBIENTAL_PATRIMONIAL',
  'DESENVOLVIMENTO_SOCIOECONOMICO',
] as const;

export type EixoTrabalhoSocial = (typeof EIXOS_TRABALHO_SOCIAL)[number];

/** Prazo padrão da primeira visita depois da entrega, em dias. */
export const PRAZO_PRIMEIRA_VISITA_DIAS = 90;
/** Intervalo padrão entre visitas de acompanhamento, em meses. */
export const PERIODICIDADE_VISITA_MESES = 6;
/** Janela de aviso antes de a visita vencer. */
const DIAS_AVISO_VISITA = 30;

export type SituacaoAcompanhamento =
  | 'SEM_ACOMPANHAMENTO'
  | 'AGUARDANDO_PRIMEIRA'
  | 'EM_DIA'
  | 'VENCENDO'
  | 'VENCIDA';

export interface EstadoAcompanhamento {
  /** Data da entrega. Sem ela não há pós-entrega — a contagem começa aqui. */
  entregueEm?: string | null;
  ultimaVisitaEm?: string | null;
  /** Situação atual da unidade: só quem tem morador declarado exige acompanhamento. */
  exigeAcompanhamento: boolean;
}

export interface Periodicidade {
  prazoPrimeiraVisitaDias?: number;
  periodicidadeMeses?: number;
}

export interface AvaliacaoAcompanhamento {
  situacao: SituacaoAcompanhamento;
  /** Quando a próxima visita vence. Null quando não há acompanhamento a fazer. */
  proximaVisitaEm: string | null;
  /** Negativo quer dizer atrasada. Null quando não há prazo em curso. */
  diasParaProxima: number | null;
}

/**
 * Quando a próxima visita vence e em que pé está o acompanhamento.
 *
 * A primeira visita conta da entrega, não da última visita — é a diferença entre "a família nunca
 * foi visitada" e "está no intervalo normal". Sem essa distinção, uma unidade entregue e esquecida
 * apareceria em dia para sempre, porque nunca teve visita para vencer.
 */
export function avaliarAcompanhamento(
  estado: EstadoAcompanhamento,
  agora: Date,
  periodicidade: Periodicidade = {},
): AvaliacaoAcompanhamento {
  if (!estado.exigeAcompanhamento || !estado.entregueEm) {
    return { situacao: 'SEM_ACOMPANHAMENTO', proximaVisitaEm: null, diasParaProxima: null };
  }

  const prazoPrimeira = periodicidade.prazoPrimeiraVisitaDias ?? PRAZO_PRIMEIRA_VISITA_DIAS;
  const meses = periodicidade.periodicidadeMeses ?? PERIODICIDADE_VISITA_MESES;

  const proxima = estado.ultimaVisitaEm
    ? somarMeses(new Date(estado.ultimaVisitaEm), meses)
    : somarDias(new Date(estado.entregueEm), prazoPrimeira);

  const dias = diasEntre(agora, proxima);
  const nunca = !estado.ultimaVisitaEm;

  const situacao: SituacaoAcompanhamento =
    dias < 0 ? 'VENCIDA' : nunca ? 'AGUARDANDO_PRIMEIRA' : dias <= DIAS_AVISO_VISITA ? 'VENCENDO' : 'EM_DIA';

  return {
    situacao,
    proximaVisitaEm: proxima.toISOString(),
    diasParaProxima: dias,
  };
}

export const TIPOS_OCORRENCIA = [
  'CESSAO_TERCEIRO',
  'ALUGUEL',
  'VENDA_TRANSFERENCIA',
  'ABANDONO',
  'USO_COMERCIAL',
  'OBRA_IRREGULAR',
  'MUDANCA_COMPOSICAO',
  'OBITO_TITULAR',
  'OUTRA',
] as const;

export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number];

export type GravidadeOcorrencia = 'ADMINISTRATIVA' | 'LEVE' | 'GRAVE' | 'GRAVISSIMA';

interface RegraOcorrencia {
  gravidade: GravidadeOcorrencia;
  /** Dias para a família regularizar antes de o caso escalar. Null = não há o que regularizar. */
  prazoRegularizacaoDias: number | null;
  /** O que a prefeitura precisa fazer antes de decidir. Texto para a tela, não decisão automática. */
  encaminhamento: string;
}

/**
 * O que cada tipo de ocorrência significa.
 *
 * Vender ou passar a unidade adiante é o descumprimento mais grave porque desfaz o próprio objeto
 * da política: a casa saiu da mão de quem a fila escolheu. Já óbito do titular e mudança de
 * composição não são falta — são fato da vida que exige ato administrativo, e tratá-los como
 * infração puniria a família por ter envelhecido.
 */
const REGRAS: Readonly<Record<TipoOcorrencia, RegraOcorrencia>> = {
  VENDA_TRANSFERENCIA: {
    gravidade: 'GRAVISSIMA',
    prazoRegularizacaoDias: null,
    encaminhamento: 'Apurar com vistoria e consulta cadastral; se confirmado, notificar para defesa.',
  },
  ALUGUEL: {
    gravidade: 'GRAVE',
    prazoRegularizacaoDias: 30,
    encaminhamento: 'Notificar para desocupação do terceiro e retorno do titular no prazo.',
  },
  CESSAO_TERCEIRO: {
    gravidade: 'GRAVE',
    prazoRegularizacaoDias: 30,
    encaminhamento: 'Apurar o vínculo com o ocupante; cessão sem autorização exige notificação.',
  },
  ABANDONO: {
    gravidade: 'GRAVE',
    prazoRegularizacaoDias: 60,
    encaminhamento: 'Confirmar a desocupação em duas visitas antes de notificar.',
  },
  USO_COMERCIAL: {
    gravidade: 'LEVE',
    prazoRegularizacaoDias: 90,
    encaminhamento:
      'Verificar se o uso convive com a moradia; comércio familiar em casa costuma ser regularizável.',
  },
  OBRA_IRREGULAR: {
    gravidade: 'LEVE',
    prazoRegularizacaoDias: 120,
    encaminhamento: 'Encaminhar ao setor de Obras para orientação e regularização do que foi feito.',
  },
  MUDANCA_COMPOSICAO: {
    gravidade: 'ADMINISTRATIVA',
    prazoRegularizacaoDias: 60,
    encaminhamento: 'Atualizar a ficha social da família.',
  },
  OBITO_TITULAR: {
    gravidade: 'ADMINISTRATIVA',
    prazoRegularizacaoDias: 180,
    encaminhamento: 'Instruir sucessão da titularidade para quem já residia na unidade.',
  },
  OUTRA: {
    gravidade: 'LEVE',
    prazoRegularizacaoDias: 60,
    encaminhamento: 'Descrever o fato e definir o encaminhamento no parecer.',
  },
};

export function regraDaOcorrencia(tipo: TipoOcorrencia): RegraOcorrencia {
  return REGRAS[tipo];
}

/**
 * Ocorrência que não se resolve no balcão: precisa de apuração formal antes de qualquer decisão.
 * É o filtro que impede alguém de encaminhar uma família ao jurídico com base em uma denúncia
 * anônima e nada mais.
 */
export function exigeApuracao(tipo: TipoOcorrencia): boolean {
  const gravidade = REGRAS[tipo].gravidade;
  return gravidade === 'GRAVE' || gravidade === 'GRAVISSIMA';
}

/** Prazo de regularização a partir da notificação. Null quando o tipo não admite regularizar. */
export function prazoRegularizacao(tipo: TipoOcorrencia, notificadaEm: Date): Date | null {
  const dias = REGRAS[tipo].prazoRegularizacaoDias;
  return dias === null ? null : somarDias(notificadaEm, dias);
}

export const SITUACOES_OCORRENCIA = [
  'ABERTA',
  'EM_APURACAO',
  'NOTIFICADA',
  'REGULARIZADA',
  'IMPROCEDENTE',
  'ENCAMINHADA_JURIDICO',
] as const;

export type SituacaoOcorrencia = (typeof SITUACOES_OCORRENCIA)[number];

/**
 * Caminho da ocorrência.
 *
 * Nada vai direto de "alguém contou" para "encaminhado ao jurídico": entre os dois existe apuração
 * e notificação, porque retirar moradia é o ato mais grave do sistema e ele não pode nascer de um
 * clique. Improcedente e regularizada encerram — reabrir exige ocorrência nova, com fato novo.
 */
const TRANSICOES_OCORRENCIA: Readonly<Record<SituacaoOcorrencia, readonly SituacaoOcorrencia[]>> = {
  ABERTA: ['EM_APURACAO', 'IMPROCEDENTE'],
  EM_APURACAO: ['NOTIFICADA', 'REGULARIZADA', 'IMPROCEDENTE'],
  NOTIFICADA: ['REGULARIZADA', 'ENCAMINHADA_JURIDICO', 'IMPROCEDENTE'],
  REGULARIZADA: [],
  IMPROCEDENTE: [],
  ENCAMINHADA_JURIDICO: ['REGULARIZADA'],
};

export function podeTransicionarOcorrencia(
  de: SituacaoOcorrencia,
  para: SituacaoOcorrencia,
): boolean {
  return TRANSICOES_OCORRENCIA[de].includes(para);
}

export function transicoesOcorrencia(de: SituacaoOcorrencia): readonly SituacaoOcorrencia[] {
  return TRANSICOES_OCORRENCIA[de];
}

/** Situações em que a ocorrência ainda pesa sobre a unidade. */
export function ocorrenciaEmAberto(situacao: SituacaoOcorrencia): boolean {
  return situacao === 'ABERTA' || situacao === 'EM_APURACAO' || situacao === 'NOTIFICADA';
}

function somarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

/**
 * Soma meses preservando o fim do mês: 31/01 + 1 mês é 28/02, não 03/03. Sem isso, uma visita
 * feita no dia 31 empurraria o prazo para o mês seguinte a cada ciclo.
 */
function somarMeses(data: Date, meses: number): Date {
  const dia = data.getUTCDate();
  const resultado = new Date(data);
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);

  const ultimoDiaDoMes = new Date(
    Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0),
  ).getUTCDate();

  resultado.setUTCDate(Math.min(dia, ultimoDiaDoMes));
  return resultado;
}

function diasEntre(inicio: Date, fim: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.floor((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}
