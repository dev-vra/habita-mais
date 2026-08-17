// Ports do processo de retomada.

import type { habitacao } from '@habita/shared';

export const RETOMADA_REPOSITORY = Symbol('RetomadaRepository');

export interface DadosAberturaCaso {
  unidadeId: string;
  ocorrenciaId?: string;
  fundamentacaoLegal: string;
  descricao: string;
}

export interface DadosNotificacao {
  forma: habitacao.FormaNotificacao;
  notificadoEm: Date;
  comprovanteKey?: string;
  prazoDefesaDias?: number;
}

export interface DadosDefesa {
  apresentadaEm: Date;
  teor: string;
  apresentadaPor: string;
  arquivoKey?: string;
}

export interface DadosDecisao {
  decisao: habitacao.DecisaoRetomada;
  fundamentacao: string;
}

export interface EstadoCasoCompleto extends habitacao.EstadoCaso {
  id: string;
  unidadeId: string;
  familiaId: string | null;
  protocolo: string;
  situacaoUnidade: habitacao.SituacaoUnidade;
}

export interface RetomadaRepository {
  abrirCaso(protocolo: string, dados: DadosAberturaCaso): Promise<{ id: string }>;
  caso(casoId: string): Promise<EstadoCasoCompleto | null>;
  casoAbertoNaUnidade(unidadeId: string): Promise<{ id: string; protocolo: string } | null>;

  registrarNotificacao(casoId: string, dados: DadosNotificacao, prazoAte: Date): Promise<void>;
  registrarTentativaFrustrada(casoId: string): Promise<number>;
  registrarDefesa(casoId: string, dados: DadosDefesa): Promise<void>;
  registrarDecisao(casoId: string, dados: DadosDecisao, decididoPor: string): Promise<void>;
  moverFase(casoId: string, fase: habitacao.FaseRetomada): Promise<void>;
  encerrarCaso(casoId: string, motivo: string): Promise<void>;

  /** Linha do tempo em português — o que a família e o juiz leem. */
  registrarAto(
    casoId: string,
    ato: { titulo: string; detalhe?: string; autor: string; ocorridoEm?: Date },
  ): Promise<void>;

  prazoDefesaPadrao(): Promise<number>;
}
