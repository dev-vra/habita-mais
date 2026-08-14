// Situações da inscrição na fila e transições permitidas (spec §6.1).
// Transição fora deste mapa é erro de programação, não escolha do usuário — o caso de uso
// consulta `podeTransicionar` antes de gravar, e a auditoria registra o par (de → para).

export const SITUACOES_INSCRICAO = [
  'EM_ANALISE',
  'PENDENTE',
  'APTA',
  'EM_RECURSO',
  'CONVOCADA',
  'CONTEMPLADA',
  'INDEFERIDA',
  'INELEGIVEL',
  'DESISTENTE',
  'CANCELADA',
] as const;

export type SituacaoInscricao = (typeof SITUACOES_INSCRICAO)[number];

const TRANSICOES: Readonly<Record<SituacaoInscricao, readonly SituacaoInscricao[]>> = {
  EM_ANALISE: ['APTA', 'PENDENTE', 'INDEFERIDA'],
  // Saneada a pendência a inscrição volta a concorrer; vencido o prazo, é indeferida.
  PENDENTE: ['APTA', 'INDEFERIDA', 'CANCELADA'],
  APTA: ['CONVOCADA', 'PENDENTE', 'EM_RECURSO', 'INELEGIVEL', 'DESISTENTE', 'CANCELADA'],
  // O recurso pode confirmar a classificação (volta a APTA) ou reformá-la (indeferimento).
  EM_RECURSO: ['APTA', 'INDEFERIDA'],
  // Não compareceu ou recusou: volta à fila com motivo auditado e o sistema chama o próximo.
  CONVOCADA: ['CONTEMPLADA', 'APTA', 'INELEGIVEL', 'DESISTENTE'],
  CONTEMPLADA: [],
  INDEFERIDA: ['EM_RECURSO'],
  INELEGIVEL: ['EM_RECURSO'],
  DESISTENTE: [],
  // Baixa por recadastramento não atendido; reabre se a família se reapresenta.
  CANCELADA: ['EM_ANALISE'],
};

/** Situações que ocupam posição no ranking publicado. */
const SITUACOES_CLASSIFICAVEIS: readonly SituacaoInscricao[] = ['APTA', 'EM_RECURSO', 'CONVOCADA'];

export function podeTransicionar(de: SituacaoInscricao, para: SituacaoInscricao): boolean {
  return TRANSICOES[de].includes(para);
}

export function transicoesPossiveis(de: SituacaoInscricao): readonly SituacaoInscricao[] {
  return TRANSICOES[de];
}

/**
 * Inscrição em recurso continua classificada: retirar a família do ranking enquanto ela contesta
 * a própria classificação inverteria o ônus do devido processo (spec §8, "direito de recurso").
 */
export function ocupaPosicaoNaFila(situacao: SituacaoInscricao): boolean {
  return SITUACOES_CLASSIFICAVEIS.includes(situacao);
}

export const DESFECHOS_CONVOCACAO = [
  'COMPARECEU',
  'NAO_COMPARECEU',
  'RECUSOU',
  'INELEGIVEL',
] as const;

export type DesfechoConvocacao = (typeof DESFECHOS_CONVOCACAO)[number];

const SITUACAO_POR_DESFECHO: Readonly<Record<DesfechoConvocacao, SituacaoInscricao>> = {
  COMPARECEU: 'CONTEMPLADA',
  NAO_COMPARECEU: 'APTA',
  RECUSOU: 'DESISTENTE',
  INELEGIVEL: 'INELEGIVEL',
};

/**
 * Situação da inscrição após o desfecho da convocação. COMPARECEU só leva a CONTEMPLADA depois
 * da reconferência de elegibilidade no balcão — renda muda entre a inscrição e a chamada.
 */
export function situacaoAposConvocacao(desfecho: DesfechoConvocacao): SituacaoInscricao {
  return SITUACAO_POR_DESFECHO[desfecho];
}
