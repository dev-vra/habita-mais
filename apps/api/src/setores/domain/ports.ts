export const SETORES_REPOSITORY = Symbol('SetoresRepository');

export interface SetorResumo {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  secretaria: string | null;
  ativo: boolean;
}

export interface EncaminhamentoEstado {
  id: string;
  numero: string;
  setorDestinoId: string;
  situacao: string;
  tipoSolicitacao: string;
  entidade: string;
  entidadeId: string;
}

export interface SetoresRepository {
  listarSetores(): Promise<SetorResumo[]>;
  buscarSetor(setorId: string): Promise<SetorResumo | null>;
  /** Setor de tipo HABITACAO — a origem padrão de quem encaminha de dentro do sistema. */
  setorDaHabitacao(): Promise<string | null>;
  criarSetor(dados: {
    nome: string;
    sigla: string;
    tipo: string;
    secretaria?: string;
    email?: string;
  }): Promise<{ id: string }>;
  desativarSetor(setorId: string): Promise<void>;

  criarEncaminhamento(dados: {
    numero: string;
    setorOrigemId: string;
    setorDestinoId: string;
    tipoSolicitacao: string;
    entidade: string;
    entidadeId: string;
    referenciaResumo: string;
    assunto: string;
    descricao: string;
    prazoAte: Date;
  }): Promise<{ id: string }>;
  buscarEncaminhamento(encaminhamentoId: string): Promise<EncaminhamentoEstado | null>;
  registrarResposta(dados: {
    encaminhamentoId: string;
    resposta: string;
    anexoKey?: string;
  }): Promise<void>;
  devolver(encaminhamentoId: string, motivo: string): Promise<void>;

  /** Efeito da resposta da Defesa Civil: o laudo passa a valer na ficha vigente da família. */
  anexarLaudoNaFichaVigente(familiaId: string, anexoKey: string): Promise<boolean>;
}
