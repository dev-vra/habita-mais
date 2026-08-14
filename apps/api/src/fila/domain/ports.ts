// Ports do domínio da fila. Os casos de uso dependem destas interfaces, nunca do Prisma —
// a implementação vive em infra/ e é trocada pelo módulo.

import type { SituacaoInscricao } from '@habita/shared/habitacao';
import type {
  ConvocacaoRegistrada,
  InscricaoParaCalculo,
  ItemRankingParaGravar,
  NovaConvocacao,
  Programa,
  SnapshotParaGravar,
  VersaoPublicada,
} from './tipos';

export const PROGRAMAS_REPOSITORY = Symbol('ProgramasRepository');
export const INSCRICOES_REPOSITORY = Symbol('InscricoesRepository');
export const CONVOCACOES_REPOSITORY = Symbol('ConvocacoesRepository');
export const RECURSOS_REPOSITORY = Symbol('RecursosRepository');
export const TRILHA_AUDITORIA = Symbol('TrilhaAuditoria');
export const GERADOR_PROTOCOLO = Symbol('GeradorProtocolo');

/** Trilha vista de dentro do domínio: registrar é parte do ato, não um efeito colateral opcional. */
export interface TrilhaAuditoria {
  registrar(evento: {
    operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'READ';
    entidade: string;
    entidadeId: string;
    diff?: Record<string, unknown>;
  }): Promise<void>;
}

export interface GeradorProtocolo {
  proximo(serie: 'HAB' | 'AUX' | 'MUT' | 'REA' | 'FIS' | 'OFC' | 'REC', ano: number): Promise<string>;
}

export interface ProgramasRepository {
  buscarPorId(id: string): Promise<Programa | null>;
  /** Versão vigente do critério. Ausente = programa ainda não publicou regra e não aceita fila. */
  versaoPublicada(programaId: string): Promise<VersaoPublicada | null>;
}

export interface InscricoesRepository {
  existeParaFamilia(programaId: string, familiaId: string): Promise<boolean>;
  criar(dados: {
    programaId: string;
    familiaId: string;
    protocolo: string;
    inscritaEm: Date;
  }): Promise<{ id: string; protocolo: string }>;
  buscarParaCalculo(inscricaoId: string): Promise<InscricaoParaCalculo | null>;
  listarParaCalculo(programaId: string): Promise<InscricaoParaCalculo[]>;
  atualizarSituacao(
    inscricaoId: string,
    situacao: SituacaoInscricao,
    motivo?: string,
  ): Promise<void>;
  /** Encerra o snapshot vigente e grava o novo, na mesma transação. */
  registrarSnapshot(snapshot: SnapshotParaGravar): Promise<{ id: string; total: number }>;
}

export interface ConvocacoesRepository {
  publicarRanking(dados: {
    programaId: string;
    versaoCriterioId: string;
    prazoRecursoAte: Date;
    itens: ItemRankingParaGravar[];
  }): Promise<{ id: string; total: number }>;
  criarConvocacao(dados: NovaConvocacao): Promise<ConvocacaoRegistrada>;
  buscarConvocacao(id: string): Promise<ConvocacaoRegistrada | null>;
  registrarDesfecho(dados: {
    convocacaoId: string;
    desfecho: string;
    motivo?: string;
  }): Promise<void>;
  /** Convocações fora de ordem já emitidas no programa — alimenta o contador do painel (§9). */
  contarForaDeOrdem(programaId: string): Promise<number>;
}

export interface RecursoEmAnalise {
  id: string;
  inscricaoId: string;
  situacaoAnterior: SituacaoInscricao;
  decidido: boolean;
}

export interface RecursosRepository {
  criar(dados: {
    inscricaoId: string;
    protocolo: string;
    motivo: string;
    situacaoAnterior: SituacaoInscricao;
    apresentadoPor: string;
    prazoRespostaAte: Date;
  }): Promise<{ id: string; protocolo: string }>;
  buscar(recursoId: string): Promise<RecursoEmAnalise | null>;
  decidir(dados: { recursoId: string; decisao: string; fundamentacao: string }): Promise<void>;
}
