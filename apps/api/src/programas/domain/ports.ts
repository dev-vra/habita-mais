import type { DefinicaoCriterio } from '@habita/shared/habitacao';

export const PROGRAMAS_ESCRITA_REPOSITORY = Symbol('ProgramasEscritaRepository');

export interface DadosPrograma {
  nome: string;
  fonteRecurso: string;
  vagas: number;
  inscricaoInicio: Date;
  inscricaoFim: Date;
  regulamentoKey?: string;
}

export interface ProgramaEstado {
  id: string;
  slug: string;
  situacao: string;
  temInscricoes: boolean;
}

export interface VersaoEstado {
  id: string;
  programaId: string;
  versao: number;
  situacao: string;
  definicoes: DefinicaoCriterio[];
}

export interface ProgramasEscritaRepository {
  criar(dados: DadosPrograma & { slug: string }): Promise<{ id: string; slug: string }>;
  atualizar(programaId: string, dados: Partial<DadosPrograma>): Promise<void>;
  estado(programaId: string): Promise<ProgramaEstado | null>;
  slugEmUso(slug: string): Promise<boolean>;
  definirSituacao(programaId: string, situacao: string): Promise<void>;

  proximaVersao(programaId: string): Promise<number>;
  criarVersao(dados: {
    programaId: string;
    versao: number;
    definicoes: DefinicaoCriterio[];
  }): Promise<{ id: string; versao: number }>;
  versao(versaoId: string): Promise<VersaoEstado | null>;
  atualizarRascunho(versaoId: string, definicoes: DefinicaoCriterio[]): Promise<void>;
  /** Publica a nova e marca a publicada anterior como substituída, na mesma transação. */
  publicarVersao(versaoId: string, programaId: string, publicadoEm: Date): Promise<void>;
}
