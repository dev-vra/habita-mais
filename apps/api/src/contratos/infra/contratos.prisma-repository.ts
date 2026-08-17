import { Injectable } from '@nestjs/common';
import {
  FormaPagamento,
  IndiceReajuste,
  MotivoTransferencia,
  Prisma,
  SituacaoContrato,
  SituacaoParcela,
} from '@prisma/client';
import type { habitacao } from '@habita/shared';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ContratosRepository,
  DadosBaixa,
  DadosContrato,
  DadosRenegociacao,
  DadosTransferencia,
  EstadoContrato,
  EstadoParcela,
} from '../domain/ports';

const numero = (valor: Prisma.Decimal | null): number => (valor ? Number(valor) : 0);

/** Situações de parcela que ainda podem ser renegociadas — o que não foi pago nem encerrado. */
const RENEGOCIAVEIS: SituacaoParcela[] = [
  SituacaoParcela.ABERTA,
  SituacaoParcela.VENCIDA,
  SituacaoParcela.PAGA_PARCIAL,
];

@Injectable()
export class ContratosPrismaRepository implements ContratosRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get tenantId(): string {
    return getActiveContext().tenantId ?? '';
  }

  async criar(
    protocolo: string,
    dados: DadosContrato,
    valorFinanciado: number,
    valorParcela: number,
  ): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.contratoMutuario.create({
      data: {
        tenantId: this.tenantId,
        protocolo,
        unidadeId: dados.unidadeId,
        familiaId: dados.familiaId,
        titularId: dados.titularId,
        valorUnidade: new Prisma.Decimal(dados.valorUnidade),
        valorSubsidio: new Prisma.Decimal(dados.valorSubsidio),
        valorEntrada: new Prisma.Decimal(dados.valorEntrada),
        valorFinanciado: new Prisma.Decimal(valorFinanciado),
        quantidadeParcelas: dados.quantidadeParcelas,
        valorParcela: new Prisma.Decimal(valorParcela),
        diaVencimento: dados.diaVencimento,
        indiceReajuste: dados.indiceReajuste as IndiceReajuste,
        assinadoEm: dados.assinadoEm,
        primeiraCompetencia: dados.primeiraCompetencia,
        situacao: SituacaoContrato.VIGENTE,
        tituloGarantiaKey: dados.tituloGarantiaKey ?? null,
        observacao: dados.observacao ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async gerarParcelas(
    contratoId: string,
    parcelas: habitacao.ParcelaGerada[],
  ): Promise<number> {
    const ator = actorId();

    const resultado = await this.prisma.tx.parcelaContrato.createMany({
      data: parcelas.map((parcela) => ({
        tenantId: this.tenantId,
        contratoId,
        numero: parcela.numero,
        competencia: parcela.competencia,
        vencimento: new Date(`${parcela.vencimento}T00:00:00.000Z`),
        valor: new Prisma.Decimal(parcela.valor),
        createdBy: ator,
        updatedBy: ator,
      })),
      skipDuplicates: true,
    });

    return resultado.count;
  }

  async contrato(contratoId: string): Promise<EstadoContrato | null> {
    const contrato = await this.prisma.tx.contratoMutuario.findUnique({
      where: { id: contratoId },
      select: {
        id: true,
        protocolo: true,
        situacao: true,
        unidadeId: true,
        familiaId: true,
        titularId: true,
        valorFinanciado: true,
        diaVencimento: true,
        parcelas: {
          orderBy: { numero: 'asc' },
          select: {
            numero: true,
            vencimento: true,
            valor: true,
            valorPago: true,
            situacao: true,
          },
        },
      },
    });

    if (!contrato) return null;

    return {
      id: contrato.id,
      protocolo: contrato.protocolo,
      situacao: contrato.situacao as habitacao.SituacaoContrato,
      unidadeId: contrato.unidadeId,
      familiaId: contrato.familiaId,
      titularId: contrato.titularId,
      valorFinanciado: numero(contrato.valorFinanciado),
      diaVencimento: contrato.diaVencimento,
      parcelas: contrato.parcelas.map((parcela) => ({
        numero: parcela.numero,
        vencimento: parcela.vencimento.toISOString(),
        valor: numero(parcela.valor),
        valorPago: numero(parcela.valorPago),
        situacao: parcela.situacao as habitacao.SituacaoParcela,
      })),
    };
  }

  async contratoDaUnidade(unidadeId: string): Promise<{ id: string; protocolo: string } | null> {
    return this.prisma.tx.contratoMutuario.findFirst({
      where: {
        unidadeId,
        deletedAt: null,
        situacao: { notIn: [SituacaoContrato.RESCINDIDO, SituacaoContrato.TRANSFERIDO] },
      },
      select: { id: true, protocolo: true },
    });
  }

  async definirSituacao(
    contratoId: string,
    situacao: habitacao.SituacaoContrato,
    motivo?: string,
  ): Promise<void> {
    await this.prisma.tx.contratoMutuario.update({
      where: { id: contratoId },
      data: {
        situacao: situacao as SituacaoContrato,
        motivoSituacao: motivo ?? undefined,
        updatedBy: actorId(),
      },
    });
  }

  async parcela(parcelaId: string): Promise<EstadoParcela | null> {
    const parcela = await this.prisma.tx.parcelaContrato.findUnique({
      where: { id: parcelaId },
      select: {
        id: true,
        contratoId: true,
        numero: true,
        vencimento: true,
        valor: true,
        valorPago: true,
        situacao: true,
        contrato: { select: { situacao: true } },
      },
    });

    if (!parcela) return null;

    return {
      id: parcela.id,
      contratoId: parcela.contratoId,
      numero: parcela.numero,
      vencimento: parcela.vencimento.toISOString(),
      valor: numero(parcela.valor),
      valorPago: numero(parcela.valorPago),
      situacao: parcela.situacao as habitacao.SituacaoParcela,
      situacaoContrato: parcela.contrato.situacao as habitacao.SituacaoContrato,
    };
  }

  async registrarBaixa(dados: DadosBaixa, baixadoPor: string): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.pagamentoParcela.create({
      data: {
        tenantId: this.tenantId,
        parcelaId: dados.parcelaId,
        valor: new Prisma.Decimal(dados.valor),
        pagoEm: dados.pagoEm,
        forma: dados.forma as FormaPagamento,
        comprovanteKey: dados.comprovanteKey ?? null,
        baixadoPor,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async atualizarParcelaAposBaixa(
    parcelaId: string,
    valorPagoTotal: number,
    situacao: habitacao.SituacaoParcela,
  ): Promise<void> {
    await this.prisma.tx.parcelaContrato.update({
      where: { id: parcelaId },
      data: {
        valorPago: new Prisma.Decimal(valorPagoTotal),
        situacao: situacao as SituacaoParcela,
        updatedBy: actorId(),
      },
    });
  }

  /** Só pagamento não estornado conta. É o que faz o estorno devolver a parcela ao aberto. */
  async somarPagamentos(parcelaId: string): Promise<number> {
    const soma = await this.prisma.tx.pagamentoParcela.aggregate({
      where: { parcelaId, estornadoEm: null },
      _sum: { valor: true },
    });

    return numero(soma._sum.valor);
  }

  async pagamento(pagamentoId: string) {
    const pagamento = await this.prisma.tx.pagamentoParcela.findUnique({
      where: { id: pagamentoId },
      select: { id: true, parcelaId: true, valor: true, estornadoEm: true },
    });

    if (!pagamento) return null;

    return {
      id: pagamento.id,
      parcelaId: pagamento.parcelaId,
      valor: numero(pagamento.valor),
      estornado: pagamento.estornadoEm !== null,
    };
  }

  async estornarPagamento(
    pagamentoId: string,
    motivo: string,
    estornadoPor: string,
  ): Promise<void> {
    await this.prisma.tx.pagamentoParcela.update({
      where: { id: pagamentoId },
      data: {
        estornadoEm: new Date(),
        estornadoPor,
        motivoEstorno: motivo,
        updatedBy: actorId(),
      },
    });
  }

  /**
   * Marca como RENEGOCIADAS as parcelas em aberto e devolve o saldo que elas somavam.
   *
   * O que já foi pago fica: renegociação é sobre o que resta dever, e apagar o histórico de
   * inadimplência junto seria perder a única prova de que a prefeitura cobrou antes.
   */
  async substituirParcelasAbertas(
    contratoId: string,
  ): Promise<{ saldo: number; substituidas: number }> {
    const parcelas = await this.prisma.tx.parcelaContrato.findMany({
      where: { contratoId, situacao: { in: RENEGOCIAVEIS } },
      select: { id: true, valor: true, valorPago: true },
    });

    const saldo = parcelas.reduce(
      (total, parcela) => total + (numero(parcela.valor) - numero(parcela.valorPago)),
      0,
    );

    await this.prisma.tx.parcelaContrato.updateMany({
      where: { id: { in: parcelas.map((parcela) => parcela.id) } },
      data: { situacao: SituacaoParcela.RENEGOCIADA, updatedBy: actorId() },
    });

    return { saldo: Math.round(saldo * 100) / 100, substituidas: parcelas.length };
  }

  async registrarRenegociacao(
    contratoId: string,
    dados: DadosRenegociacao & { saldo: number; substituidas: number; valorParcela: number },
    autorizadaPor: string,
  ): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.renegociacaoContrato.create({
      data: {
        tenantId: this.tenantId,
        contratoId,
        saldoRenegociado: new Prisma.Decimal(dados.saldo),
        parcelasSubstituidas: dados.substituidas,
        novaQuantidade: dados.novaQuantidade,
        novoValorParcela: new Prisma.Decimal(dados.valorParcela),
        primeiraCompetencia: dados.primeiraCompetencia,
        motivo: dados.motivo,
        autorizadaPor,
        acordoKey: dados.acordoKey ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async proximoNumeroDeParcela(contratoId: string): Promise<number> {
    const maior = await this.prisma.tx.parcelaContrato.aggregate({
      where: { contratoId },
      _max: { numero: true },
    });

    return (maior._max.numero ?? 0) + 1;
  }

  async registrarTransferencia(
    contratoId: string,
    dados: DadosTransferencia & { deTitularId: string; deFamiliaId: string },
    autorizadaPor: string,
  ): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.transferenciaTitularidade.create({
      data: {
        tenantId: this.tenantId,
        contratoId,
        motivo: dados.motivo as MotivoTransferencia,
        deTitularId: dados.deTitularId,
        paraTitularId: dados.paraTitularId,
        deFamiliaId: dados.deFamiliaId,
        paraFamiliaId: dados.paraFamiliaId,
        fundamentacao: dados.fundamentacao,
        autorizadaPor,
        efetivadaEm: new Date(),
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async trocarTitular(contratoId: string, titularId: string, familiaId: string): Promise<void> {
    await this.prisma.tx.contratoMutuario.update({
      where: { id: contratoId },
      data: { titularId, familiaId, updatedBy: actorId() },
    });
  }

  async vincularUnidadeAFamilia(
    unidadeId: string,
    familiaId: string,
    motivo: string,
  ): Promise<void> {
    await this.prisma.tx.unidadeHabitacional.update({
      where: { id: unidadeId },
      data: { familiaId, motivoSituacao: motivo, updatedBy: actorId() },
    });
  }

  /** Escada de cobrança por prefeitura; sem parâmetro, o padrão do domínio. */
  async escadaDaPrefeitura(): Promise<habitacao.EscadaCobranca> {
    const tenant = await this.prisma.tx.tenant.findUnique({
      where: { id: this.tenantId },
      select: { parametros: true },
    });

    const parametros = (tenant?.parametros ?? {}) as { cobranca?: habitacao.EscadaCobranca };
    return parametros.cobranca ?? {};
  }
}
