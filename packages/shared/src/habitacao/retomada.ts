// Retomada de unidade: o processo administrativo que pode tirar a casa de uma família.
//
// É o ato mais grave do sistema, e por isso o módulo inteiro existe para impedir atalho. A
// Constituição (art. 5º, LV) e a Lei 9.784/99 garantem contraditório e ampla defesa em processo
// administrativo — o que aqui significa: sem notificação válida e sem prazo cumprido, não existe
// decisão. Nenhuma função deste arquivo decide nada sozinha; elas dizem o que ainda falta.

/** Prazo padrão de defesa, em dias corridos da ciência (Lei 9.784/99, art. 26 §2º e art. 44). */
export const PRAZO_DEFESA_DIAS = 15;
/** Tentativas de notificação pessoal/AR antes de o edital ser admissível. */
export const TENTATIVAS_ANTES_DO_EDITAL = 2;

export const FASES_RETOMADA = [
  'ABERTO',
  'NOTIFICADO',
  'EM_DEFESA',
  'EM_ANALISE',
  'DECIDIDO',
  'ENCERRADO',
] as const;

export type FaseRetomada = (typeof FASES_RETOMADA)[number];

/**
 * Caminho do caso.
 *
 * NOTIFICADO e EM_DEFESA são fases distintas de propósito: a primeira diz que a família foi
 * cientificada, a segunda que ela respondeu. Fundir as duas apagaria a diferença entre revelia e
 * defesa apresentada — e essa diferença é o que um juiz olha primeiro.
 */
const TRANSICOES: Readonly<Record<FaseRetomada, readonly FaseRetomada[]>> = {
  ABERTO: ['NOTIFICADO', 'ENCERRADO'],
  NOTIFICADO: ['EM_DEFESA', 'EM_ANALISE', 'ENCERRADO'],
  EM_DEFESA: ['EM_ANALISE', 'ENCERRADO'],
  EM_ANALISE: ['DECIDIDO'],
  DECIDIDO: ['ENCERRADO'],
  ENCERRADO: [],
};

export function podeTransicionarCaso(de: FaseRetomada, para: FaseRetomada): boolean {
  return TRANSICOES[de].includes(para);
}

export function transicoesCaso(de: FaseRetomada): readonly FaseRetomada[] {
  return TRANSICOES[de];
}

export const FORMAS_NOTIFICACAO = ['PESSOAL', 'AR_CORREIO', 'EDITAL'] as const;
export type FormaNotificacao = (typeof FORMAS_NOTIFICACAO)[number];

export const DECISOES_RETOMADA = [
  'REGULARIZACAO',
  'ACORDO',
  'RESCISAO',
  'ARQUIVAMENTO',
] as const;

export type DecisaoRetomada = (typeof DECISOES_RETOMADA)[number];

/** Decisões que retiram a unidade da família. Só elas levam à retomada de fato. */
export function decisaoRetiraUnidade(decisao: DecisaoRetomada): boolean {
  return decisao === 'RESCISAO';
}

export interface EstadoCaso {
  fase: FaseRetomada;
  notificadoEm?: string | null;
  formaNotificacao?: FormaNotificacao | null;
  /** Tentativas de notificação pessoal ou por AR já registradas e frustradas. */
  tentativasFrustradas?: number;
  prazoDefesaAte?: string | null;
  defesaApresentadaEm?: string | null;
}

export type ImpedimentoDecisao =
  | 'SEM_NOTIFICACAO'
  | 'PRAZO_DE_DEFESA_EM_CURSO'
  | 'FASE_NAO_PERMITE'
  | 'EDITAL_SEM_TENTATIVAS';

export interface AvaliacaoCaso {
  /** Pode ser decidido agora? Falso vem sempre com o motivo. */
  podeDecidir: boolean;
  impedimentos: ImpedimentoDecisao[];
  /** Prazo vencido sem defesa. Não autoriza nada por si — só registra o fato. */
  revelia: boolean;
  diasParaDefesa: number | null;
}

/**
 * O que falta para o caso poder ser decidido.
 *
 * A revelia é registrada, nunca aplicada: prazo vencido sem defesa não vira rescisão automática.
 * Quem não respondeu pode não ter sido encontrado, e é justamente aí que a notificação por edital
 * precisa ter sido feita direito — daí a exigência de tentativas anteriores.
 */
export function avaliarCaso(estado: EstadoCaso, agora: Date): AvaliacaoCaso {
  const impedimentos: ImpedimentoDecisao[] = [];

  if (!estado.notificadoEm) impedimentos.push('SEM_NOTIFICACAO');

  if (
    estado.formaNotificacao === 'EDITAL' &&
    (estado.tentativasFrustradas ?? 0) < TENTATIVAS_ANTES_DO_EDITAL
  ) {
    impedimentos.push('EDITAL_SEM_TENTATIVAS');
  }

  const diasParaDefesa = estado.prazoDefesaAte ? diasEntre(agora, new Date(estado.prazoDefesaAte)) : null;
  const prazoEmCurso = diasParaDefesa !== null && diasParaDefesa >= 0;

  // Defesa apresentada encerra a espera: não há por que esperar o prazo de quem já respondeu.
  if (prazoEmCurso && !estado.defesaApresentadaEm) {
    impedimentos.push('PRAZO_DE_DEFESA_EM_CURSO');
  }

  if (estado.fase !== 'EM_ANALISE') impedimentos.push('FASE_NAO_PERMITE');

  return {
    podeDecidir: impedimentos.length === 0,
    impedimentos,
    revelia: Boolean(estado.notificadoEm) && !estado.defesaApresentadaEm && diasParaDefesa !== null && diasParaDefesa < 0,
    diasParaDefesa,
  };
}

export const MOTIVOS_IMPEDIMENTO: Readonly<Record<ImpedimentoDecisao, string>> = {
  SEM_NOTIFICACAO: 'A família ainda não foi notificada. Sem ciência não há defesa, e sem defesa não há decisão.',
  PRAZO_DE_DEFESA_EM_CURSO: 'O prazo de defesa ainda está correndo. Decidir agora anula o processo.',
  FASE_NAO_PERMITE: 'O caso precisa estar em análise para ser decidido.',
  EDITAL_SEM_TENTATIVAS: `Notificação por edital exige ao menos ${TENTATIVAS_ANTES_DO_EDITAL} tentativas pessoais ou por AR registradas antes.`,
};

/** Prazo de defesa a partir da ciência. */
export function prazoDefesa(notificadoEm: Date, dias: number = PRAZO_DEFESA_DIAS): Date {
  const prazo = new Date(notificadoEm);
  prazo.setUTCDate(prazo.getUTCDate() + dias);
  return prazo;
}

/**
 * Notificação por edital só depois de tentar encontrar a pessoa.
 *
 * Publicar edital sem procurar é a forma mais fácil de tirar a casa de alguém que nunca soube do
 * processo — e a mais fácil de anular depois.
 */
export function editalAdmissivel(tentativasFrustradas: number): boolean {
  return tentativasFrustradas >= TENTATIVAS_ANTES_DO_EDITAL;
}

/**
 * Documentos que a pilha do caso precisa reunir antes de o Jurídico assumir a retomada.
 *
 * A lista é a mesma para todo caso porque é dela que depende a validade do processo: falta de
 * comprovante de notificação derruba a ação, não o mérito.
 */
export const EXIGENCIAS_PILHA_RETOMADA = [
  'CONSTATACAO_VISTORIA',
  'COMPROVANTE_NOTIFICACAO',
  'DEFESA_OU_CERTIDAO_REVELIA',
  'DECISAO_FUNDAMENTADA',
  'CONTRATO_OU_TERMO_ENTREGA',
] as const;

function diasEntre(inicio: Date, fim: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.floor((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}
