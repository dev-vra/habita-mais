// Ports do pós-entrega. O domínio fala em visita e ocorrência; Prisma fica no infra.

import type { habitacao } from '@habita/shared';

export const POS_ENTREGA_REPOSITORY = Symbol('PosEntregaRepository');

export type TipoAcompanhamento = 'INICIAL' | 'PERIODICA' | 'EXTRAORDINARIA' | 'APURACAO';

export interface AvaliacaoEixo {
  eixo: habitacao.EixoTrabalhoSocial;
  situacao: 'ADEQUADA' | 'ATENCAO' | 'CRITICA' | 'NAO_AVALIADA';
  observacao?: string;
}

export interface DadosAcompanhamento {
  unidadeId: string;
  visitadaEm: Date;
  tipo: TipoAcompanhamento;
  tecnicoNome: string;
  residenciaConfirmada: boolean;
  quemReside?: string;
  moradoresEncontrados?: number;
  parecer: string;
  latitude?: number;
  longitude?: number;
  fotos?: string[];
  eixos: AvaliacaoEixo[];
}

export interface DadosOcorrencia {
  unidadeId: string;
  tipo: habitacao.TipoOcorrencia;
  origem: 'VISITA' | 'DENUNCIA' | 'OFICIO' | 'CRUZAMENTO_CADASTRAL' | 'OUTRA';
  descricao: string;
  constatadaEm: Date;
  acompanhamentoId?: string;
}

export interface EstadoUnidadeParaVisita {
  unidadeId: string;
  situacao: habitacao.SituacaoUnidade;
  entregueEm: string | null;
  ultimaVisitaEm: string | null;
  familiaId: string | null;
}

export interface EstadoOcorrencia {
  id: string;
  unidadeId: string;
  tipo: habitacao.TipoOcorrencia;
  situacao: habitacao.SituacaoOcorrencia;
  notificadaEm: Date | null;
}

export interface PosEntregaRepository {
  estadoDaUnidade(unidadeId: string): Promise<EstadoUnidadeParaVisita | null>;
  registrarAcompanhamento(
    protocolo: string,
    dados: DadosAcompanhamento,
    proximaVisitaEm: Date | null,
  ): Promise<{ id: string }>;

  abrirOcorrencia(
    protocolo: string,
    dados: DadosOcorrencia,
    gravidade: habitacao.GravidadeOcorrencia,
  ): Promise<{ id: string }>;
  ocorrencia(ocorrenciaId: string): Promise<EstadoOcorrencia | null>;
  moverOcorrencia(
    ocorrenciaId: string,
    situacao: habitacao.SituacaoOcorrencia,
    dados: { notificadaEm?: Date; prazoRegularizacaoAte?: Date | null; motivo?: string },
  ): Promise<void>;
  vincularEncaminhamento(ocorrenciaId: string, encaminhamentoId: string): Promise<void>;

  parametrosAcompanhamento(): Promise<habitacao.Periodicidade>;
}
