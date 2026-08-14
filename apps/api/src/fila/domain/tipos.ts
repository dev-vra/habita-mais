// Tipos do domínio da fila. Nada de Prisma aqui: o que entra e sai dos casos de uso é linguagem
// de negócio, e a tradução do banco fica na camada de infra.

import type {
  DefinicaoCriterio,
  FatosFamilia,
  ItemPontuacao,
  SituacaoInscricao,
} from '@habita/shared/habitacao';

export interface Programa {
  id: string;
  nome: string;
  slug: string;
  vagas: number;
  situacao: string;
  inscricaoInicio: Date;
  inscricaoFim: Date;
}

export interface VersaoPublicada {
  id: string;
  versao: number;
  publicadoEm: string;
  criterios: DefinicaoCriterio[];
}

/** Inscrição com tudo que o cálculo precisa — o repositório já entrega os fatos apurados. */
export interface InscricaoParaCalculo {
  id: string;
  protocolo: string;
  familiaId: string;
  situacao: SituacaoInscricao;
  inscritaEm: Date;
  fatos: FatosFamilia;
  mesesResidenciaMunicipio: number;
  /** Total do snapshot vigente. Zero quando a inscrição ainda não foi pontuada. */
  pontuacaoVigente: number;
}

export interface SnapshotParaGravar {
  inscricaoId: string;
  versaoCriterioId: string;
  total: number;
  totalMaximo: number;
  itens: ItemPontuacao[];
  fatos: FatosFamilia;
  motivo: string;
}

export interface ItemRankingParaGravar {
  inscricaoId: string;
  protocolo: string;
  posicao: number;
  pontuacao: number;
}

export interface NovaConvocacao {
  inscricaoId: string;
  numeroOficio: string;
  prazoComparecimentoAte: Date;
  foraDeOrdem: boolean;
  motivoExcecao?: string;
}

export interface ConvocacaoRegistrada {
  id: string;
  inscricaoId: string;
  desfecho: string | null;
}
