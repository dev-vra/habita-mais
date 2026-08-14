// Ordenação da fila e montagem da lista de convocação (spec §6.1).
//
// O desempate é regra publicada, não detalhe de implementação: duas famílias com a mesma nota
// precisam de uma ordem que a prefeitura consiga justificar. A sequência abaixo é a que vai no
// regulamento do programa — mudar aqui significa mudar o regulamento.

export interface ItemFila {
  inscricaoId: string;
  protocolo: string;
  pontuacao: number;
  /** ISO. Data em que a inscrição foi deferida — o critério de desempate mais antigo. */
  inscritaEm: string;
  mesesResidenciaMunicipio: number;
  apta: boolean;
}

export interface PosicaoFila extends ItemFila {
  posicao: number;
}

/**
 * Ordem de desempate, nesta sequência:
 *  1. maior pontuação;
 *  2. inscrição mais antiga;
 *  3. maior tempo de residência no município;
 *  4. protocolo, que é único e estável — garante ordem total e reproduzível.
 */
export function compararParaRanking(a: ItemFila, b: ItemFila): number {
  if (a.pontuacao !== b.pontuacao) return b.pontuacao - a.pontuacao;
  if (a.inscritaEm !== b.inscritaEm) return a.inscritaEm < b.inscritaEm ? -1 : 1;
  if (a.mesesResidenciaMunicipio !== b.mesesResidenciaMunicipio) {
    return b.mesesResidenciaMunicipio - a.mesesResidenciaMunicipio;
  }
  return a.protocolo.localeCompare(b.protocolo);
}

/** Classifica apenas as inscrições aptas — pendência e indeferimento não ocupam posição. */
export function classificarFila(itens: readonly ItemFila[]): PosicaoFila[] {
  return itens
    .filter((item) => item.apta)
    .slice()
    .sort(compararParaRanking)
    .map((item, indice) => ({ ...item, posicao: indice + 1 }));
}

/**
 * Próximos a convocar, em ordem estrita de classificação. A convocação fora de ordem NÃO passa
 * por aqui: ela é um ato à parte, com capacidade própria e motivo obrigatório (spec §9), e de
 * propósito não reordena a fila — o ranking permanece o que foi publicado.
 */
export function montarListaConvocacao(
  classificados: readonly PosicaoFila[],
  vagas: number,
): PosicaoFila[] {
  if (vagas <= 0) return [];
  return classificados.slice(0, vagas);
}
