// Ports dos contratos de mutuário.

import type { habitacao } from '@habita/shared';

export const CONTRATOS_REPOSITORY = Symbol('ContratosRepository');

export interface DadosContrato {
  unidadeId: string;
  familiaId: string;
  titularId: string;
  valorUnidade: number;
  valorSubsidio: number;
  valorEntrada: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  indiceReajuste: 'SEM_REAJUSTE' | 'INPC' | 'IPCA' | 'TR' | 'SALARIO_MINIMO';
  assinadoEm: Date;
  primeiraCompetencia: string;
  tituloGarantiaKey?: string;
  observacao?: string;
}

export interface DadosBaixa {
  parcelaId: string;
  valor: number;
  pagoEm: Date;
  forma: 'BOLETO' | 'PIX' | 'DINHEIRO' | 'TRANSFERENCIA' | 'DESCONTO_FOLHA' | 'OUTRA';
  comprovanteKey?: string;
}

export interface DadosRenegociacao {
  motivo: string;
  novaQuantidade: number;
  primeiraCompetencia: string;
  diaVencimento?: number;
  acordoKey?: string;
}

export interface DadosTransferencia {
  motivo: habitacao.MotivoTransferencia;
  paraTitularId: string;
  paraFamiliaId: string;
  fundamentacao: string;
}

export interface EstadoContrato {
  id: string;
  protocolo: string;
  situacao: habitacao.SituacaoContrato;
  unidadeId: string;
  familiaId: string;
  titularId: string;
  valorFinanciado: number;
  diaVencimento: number;
  parcelas: habitacao.ParcelaAvaliavel[];
}

export interface EstadoParcela {
  id: string;
  contratoId: string;
  numero: number;
  vencimento: string;
  valor: number;
  valorPago: number;
  situacao: habitacao.SituacaoParcela;
  situacaoContrato: habitacao.SituacaoContrato;
}

export interface ContratosRepository {
  criar(
    protocolo: string,
    dados: DadosContrato,
    valorFinanciado: number,
    valorParcela: number,
  ): Promise<{ id: string }>;
  gerarParcelas(contratoId: string, parcelas: habitacao.ParcelaGerada[]): Promise<number>;

  contrato(contratoId: string): Promise<EstadoContrato | null>;
  contratoDaUnidade(unidadeId: string): Promise<{ id: string; protocolo: string } | null>;
  definirSituacao(
    contratoId: string,
    situacao: habitacao.SituacaoContrato,
    motivo?: string,
  ): Promise<void>;

  parcela(parcelaId: string): Promise<EstadoParcela | null>;
  registrarBaixa(dados: DadosBaixa, baixadoPor: string): Promise<{ id: string }>;
  atualizarParcelaAposBaixa(
    parcelaId: string,
    valorPagoTotal: number,
    situacao: habitacao.SituacaoParcela,
  ): Promise<void>;
  somarPagamentos(parcelaId: string): Promise<number>;
  pagamento(
    pagamentoId: string,
  ): Promise<{ id: string; parcelaId: string; valor: number; estornado: boolean } | null>;
  estornarPagamento(pagamentoId: string, motivo: string, estornadoPor: string): Promise<void>;

  substituirParcelasAbertas(contratoId: string): Promise<{ saldo: number; substituidas: number }>;
  registrarRenegociacao(
    contratoId: string,
    dados: DadosRenegociacao & { saldo: number; substituidas: number; valorParcela: number },
    autorizadaPor: string,
  ): Promise<{ id: string }>;
  proximoNumeroDeParcela(contratoId: string): Promise<number>;

  registrarTransferencia(
    contratoId: string,
    dados: DadosTransferencia & { deTitularId: string; deFamiliaId: string },
    autorizadaPor: string,
  ): Promise<{ id: string }>;
  trocarTitular(contratoId: string, titularId: string, familiaId: string): Promise<void>;
  vincularUnidadeAFamilia(unidadeId: string, familiaId: string, motivo: string): Promise<void>;

  escadaDaPrefeitura(): Promise<habitacao.EscadaCobranca>;
}
