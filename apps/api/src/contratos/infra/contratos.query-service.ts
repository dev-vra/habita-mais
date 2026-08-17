import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SituacaoContrato } from '@prisma/client';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

const numero = (valor: Prisma.Decimal | null): number => (valor ? Number(valor) : 0);

@Injectable()
export class ContratosQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private async escada(): Promise<habitacao.EscadaCobranca> {
    const tenant = await this.prisma.tx.tenant.findFirst({ select: { parametros: true } });
    const parametros = (tenant?.parametros ?? {}) as { cobranca?: habitacao.EscadaCobranca };
    return parametros.cobranca ?? {};
  }

  /**
   * Carteira de contratos.
   *
   * Ordena pelo maior atraso: a lista é de quem cobra, e a primeira linha precisa ser a família
   * que está há mais tempo sem pagar — não a que assinou primeiro.
   */
  async listar(filtro?: { situacao?: habitacao.SituacaoContrato; inadimplentes?: boolean }) {
    const [contratos, escada] = await Promise.all([
      this.prisma.tx.contratoMutuario.findMany({
        where: { deletedAt: null, ...(filtro?.situacao ? { situacao: filtro.situacao } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          protocolo: true,
          situacao: true,
          valorFinanciado: true,
          quantidadeParcelas: true,
          assinadoEm: true,
          titular: { select: { id: true, nome: true } },
          familia: { select: { id: true, codigo: true } },
          unidade: {
            select: {
              id: true,
              identificacao: true,
              empreendimento: { select: { nome: true, slug: true } },
            },
          },
          parcelas: {
            orderBy: { numero: 'asc' },
            select: { numero: true, vencimento: true, valor: true, valorPago: true, situacao: true },
          },
        },
      }),
      this.escada(),
    ]);

    const agora = new Date();

    const linhas = contratos.map((contrato) => {
      const resumo = habitacao.resumirContrato(
        contrato.parcelas.map((parcela) => ({
          numero: parcela.numero,
          vencimento: parcela.vencimento.toISOString(),
          valor: numero(parcela.valor),
          valorPago: numero(parcela.valorPago),
          situacao: parcela.situacao as habitacao.SituacaoParcela,
        })),
        agora,
      );

      return {
        id: contrato.id,
        protocolo: contrato.protocolo,
        situacao: contrato.situacao,
        valorFinanciado: numero(contrato.valorFinanciado),
        quantidadeParcelas: contrato.quantidadeParcelas,
        assinadoEm: contrato.assinadoEm.toISOString(),
        titular: contrato.titular,
        familia: contrato.familia,
        unidade: contrato.unidade,
        resumo,
        inadimplencia: habitacao.avaliarInadimplencia(resumo, escada),
      };
    });

    const visiveis = filtro?.inadimplentes
      ? linhas.filter((linha) => linha.inadimplencia.fase !== 'EM_DIA')
      : linhas;

    return {
      itens: visiveis.sort(
        (a, b) => b.inadimplencia.maiorAtrasoDias - a.inadimplencia.maiorAtrasoDias,
      ),
      resumo: {
        total: linhas.length,
        vigentes: linhas.filter((l) => l.situacao === SituacaoContrato.VIGENTE).length,
        quitados: linhas.filter((l) => l.situacao === SituacaoContrato.QUITADO).length,
        inadimplentes: linhas.filter((l) => l.inadimplencia.fase !== 'EM_DIA').length,
        aNotificar: linhas.filter(
          (l) =>
            l.inadimplencia.fase === 'NOTIFICACAO' || l.inadimplencia.fase === 'PASSIVEL_RESCISAO',
        ).length,
        valorEmAtraso:
          Math.round(linhas.reduce((soma, l) => soma + l.resumo.valorEmAtraso, 0) * 100) / 100,
        saldoTotal:
          Math.round(linhas.reduce((soma, l) => soma + l.resumo.saldoDevedor, 0) * 100) / 100,
      },
    };
  }

  async detalhe(contratoId: string) {
    const [contrato, escada] = await Promise.all([
      this.prisma.tx.contratoMutuario.findUnique({
        where: { id: contratoId },
        select: {
          id: true,
          protocolo: true,
          situacao: true,
          motivoSituacao: true,
          valorUnidade: true,
          valorSubsidio: true,
          valorEntrada: true,
          valorFinanciado: true,
          valorParcela: true,
          quantidadeParcelas: true,
          diaVencimento: true,
          indiceReajuste: true,
          ultimoReajusteEm: true,
          assinadoEm: true,
          primeiraCompetencia: true,
          tituloGarantiaKey: true,
          observacao: true,
          titular: { select: { id: true, nome: true, cpf: true } },
          familia: { select: { id: true, codigo: true } },
          unidade: {
            select: {
              id: true,
              identificacao: true,
              endereco: true,
              matricula: true,
              empreendimento: { select: { nome: true, slug: true } },
            },
          },
          parcelas: {
            orderBy: { numero: 'asc' },
            select: {
              id: true,
              numero: true,
              competencia: true,
              vencimento: true,
              valor: true,
              valorPago: true,
              situacao: true,
              observacao: true,
              pagamentos: {
                orderBy: { pagoEm: 'desc' },
                select: {
                  id: true,
                  valor: true,
                  pagoEm: true,
                  forma: true,
                  baixadoPor: true,
                  estornadoEm: true,
                  motivoEstorno: true,
                },
              },
            },
          },
          renegociacoes: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              saldoRenegociado: true,
              parcelasSubstituidas: true,
              novaQuantidade: true,
              novoValorParcela: true,
              motivo: true,
              autorizadaPor: true,
              createdAt: true,
            },
          },
          transferencias: {
            orderBy: { efetivadaEm: 'desc' },
            select: {
              id: true,
              motivo: true,
              fundamentacao: true,
              autorizadaPor: true,
              efetivadaEm: true,
            },
          },
        },
      }),
      this.escada(),
    ]);

    if (!contrato) throw new NotFoundException('Contrato não encontrado.');

    const agora = new Date();
    const paraDominio: habitacao.ParcelaAvaliavel[] = contrato.parcelas.map((parcela) => ({
      numero: parcela.numero,
      vencimento: parcela.vencimento.toISOString(),
      valor: numero(parcela.valor),
      valorPago: numero(parcela.valorPago),
      situacao: parcela.situacao as habitacao.SituacaoParcela,
    }));

    const avaliadas = habitacao.avaliarParcelas(paraDominio, agora);
    const resumo = habitacao.resumirContrato(paraDominio, agora);

    return {
      id: contrato.id,
      protocolo: contrato.protocolo,
      situacao: contrato.situacao,
      motivoSituacao: contrato.motivoSituacao,
      valores: {
        unidade: numero(contrato.valorUnidade),
        subsidio: numero(contrato.valorSubsidio),
        entrada: numero(contrato.valorEntrada),
        financiado: numero(contrato.valorFinanciado),
        parcela: numero(contrato.valorParcela),
      },
      quantidadeParcelas: contrato.quantidadeParcelas,
      diaVencimento: contrato.diaVencimento,
      indiceReajuste: contrato.indiceReajuste,
      ultimoReajusteEm: contrato.ultimoReajusteEm?.toISOString() ?? null,
      assinadoEm: contrato.assinadoEm.toISOString(),
      primeiraCompetencia: contrato.primeiraCompetencia,
      tituloGarantiaKey: contrato.tituloGarantiaKey,
      observacao: contrato.observacao,
      titular: contrato.titular,
      familia: contrato.familia,
      unidade: contrato.unidade,
      resumo,
      inadimplencia: habitacao.avaliarInadimplencia(resumo, escada),
      parcelas: contrato.parcelas.map((parcela, indice) => ({
        id: parcela.id,
        numero: parcela.numero,
        competencia: parcela.competencia,
        vencimento: parcela.vencimento.toISOString(),
        valor: numero(parcela.valor),
        valorPago: numero(parcela.valorPago),
        situacao: avaliadas[indice]?.situacaoEfetiva ?? parcela.situacao,
        diasEmAtraso: avaliadas[indice]?.diasEmAtraso ?? 0,
        saldo: avaliadas[indice]?.saldo ?? 0,
        observacao: parcela.observacao,
        pagamentos: parcela.pagamentos.map((pagamento) => ({
          id: pagamento.id,
          valor: numero(pagamento.valor),
          pagoEm: pagamento.pagoEm.toISOString(),
          forma: pagamento.forma,
          baixadoPor: pagamento.baixadoPor,
          estornadoEm: pagamento.estornadoEm?.toISOString() ?? null,
          motivoEstorno: pagamento.motivoEstorno,
        })),
      })),
      renegociacoes: contrato.renegociacoes.map((item) => ({
        ...item,
        saldoRenegociado: numero(item.saldoRenegociado),
        novoValorParcela: numero(item.novoValorParcela),
        createdAt: item.createdAt.toISOString(),
      })),
      transferencias: contrato.transferencias.map((item) => ({
        ...item,
        efetivadaEm: item.efetivadaEm.toISOString(),
      })),
      documentosPorMotivo: habitacao.DOCUMENTOS_POR_MOTIVO,
    };
  }
}
