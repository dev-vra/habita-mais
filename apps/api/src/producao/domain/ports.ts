// Ports da produção habitacional. O domínio fala em convênio, obra e unidade; quem sabe de Prisma
// é o infra.

import type { habitacao } from '@habita/shared';

export const PRODUCAO_REPOSITORY = Symbol('ProducaoRepository');

export type OrigemRecurso =
  | 'FEDERAL'
  | 'ESTADUAL'
  | 'MUNICIPAL'
  | 'FGTS'
  | 'FINANCIAMENTO'
  | 'EMENDA_PARLAMENTAR'
  | 'OUTRA';

export type SituacaoObra =
  | 'NAO_INICIADA'
  | 'EM_EXECUCAO'
  | 'PARALISADA'
  | 'CONCLUIDA'
  | 'RESCINDIDA';

export interface DadosConvenio {
  numeroExterno?: string;
  objeto: string;
  origem: OrigemRecurso;
  orgaoRepassador: string;
  valorRepasse: number;
  valorContrapartida: number;
  vigenciaInicio: Date;
  vigenciaFim: Date;
  observacao?: string;
}

export interface DadosEmpreendimento {
  nome: string;
  convenioId?: string;
  programaId?: string;
  endereco: string;
  bairro: string;
  cep?: string;
  unidadesPrevistas: number;
  previsaoEntrega?: Date;
  observacao?: string;
}

export interface DadosObra {
  empreendimentoId: string;
  descricao: string;
  executoraNome: string;
  executoraCnpj: string;
  numeroContrato: string;
  artRrt?: string;
  valorContrato: number;
  inicioPrevisto: Date;
  terminoPrevisto: Date;
}

export interface DadosEtapa {
  codigo: string;
  nome: string;
  peso: number;
  previstaAte: Date;
}

export interface DadosMedicao {
  obraId: string;
  periodoInicio: Date;
  periodoFim: Date;
  percentualAcumulado: number;
  valor: number;
  fiscalNome: string;
}

export interface EstadoObraParaMedicao {
  obraId: string;
  valorContrato: number;
  valorMedidoAcumulado: number;
  percentualAcumuladoAnterior: number;
  proximoNumero: number;
  etapas: habitacao.EtapaCronograma[];
  situacao: SituacaoObra;
}

export interface DadosUnidade {
  empreendimentoId: string;
  identificacao: string;
  quadra?: string;
  lote?: string;
  endereco: string;
  cep?: string;
  tipologia?: string;
  areaConstruida?: number;
  areaTerreno?: number;
  matricula?: string;
  cartorio?: string;
  inscricaoImobiliaria?: string;
  valorAvaliado?: number;
}

/**
 * Escrita da produção. Tudo roda dentro da transação do request (o `runWithContext` já abriu), e é
 * por isso que a trilha grava junto: efeito e registro caem ou sobrevivem juntos.
 */
export interface ProducaoRepository {
  criarConvenio(protocolo: string, dados: DadosConvenio): Promise<{ id: string }>;
  criarEmpreendimento(
    protocolo: string,
    slug: string,
    dados: DadosEmpreendimento,
  ): Promise<{ id: string; slug: string }>;
  slugEmUso(slug: string): Promise<boolean>;

  criarObra(dados: DadosObra): Promise<{ id: string }>;
  definirEtapas(obraId: string, etapas: DadosEtapa[]): Promise<void>;
  atualizarExecucaoEtapa(etapaId: string, executado: number, concluidaEm: Date | null): Promise<void>;
  etapaDaObra(etapaId: string): Promise<{ obraId: string; nome: string } | null>;
  recalcularAvancoDaObra(obraId: string, percentual: number): Promise<void>;
  definirSituacaoObra(obraId: string, situacao: SituacaoObra, motivo?: string): Promise<void>;

  estadoParaMedicao(obraId: string): Promise<EstadoObraParaMedicao | null>;
  criarMedicao(protocolo: string, numero: number, dados: DadosMedicao): Promise<{ id: string }>;
  aprovarMedicao(medicaoId: string, aprovadaPor: string): Promise<void>;
  encerrarMedicao(
    medicaoId: string,
    situacao: 'REJEITADA' | 'CANCELADA',
    motivo: string,
  ): Promise<void>;
  medicao(
    medicaoId: string,
  ): Promise<{ id: string; obraId: string; situacao: string; valor: number; percentualAcumulado: number } | null>;
  somarMedicoesAprovadas(obraId: string): Promise<{ valor: number; percentual: number }>;
  registrarAcumuladoDaObra(obraId: string, valorMedido: number): Promise<void>;

  criarUnidade(protocolo: string, dados: DadosUnidade): Promise<{ id: string }>;
  unidade(unidadeId: string): Promise<{
    id: string;
    situacao: habitacao.SituacaoUnidade;
    familiaId: string | null;
    identificacao: string;
  } | null>;
  moverUnidade(
    unidadeId: string,
    situacao: habitacao.SituacaoUnidade,
    motivo: string,
    familiaId?: string | null,
    entregueEm?: Date | null,
  ): Promise<void>;
  gerarUnidadesEmLote(
    empreendimentoId: string,
    unidades: { protocolo: string; dados: DadosUnidade }[],
  ): Promise<number>;
}
