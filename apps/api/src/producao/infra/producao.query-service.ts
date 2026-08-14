import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SituacaoMedicao } from '@prisma/client';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

const numero = (valor: Prisma.Decimal | null): number => (valor ? Number(valor) : 0);

/**
 * Leitura da produção.
 *
 * Os percentuais vêm do domínio compartilhado, nunca de uma conta escrita aqui: a mesma função que
 * a tela usa para desenhar a barra é a que a API usa para decidir se a medição passa.
 */
@Injectable()
export class ProducaoQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listarConvenios() {
    const convenios = await this.prisma.tx.convenio.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        protocolo: true,
        numeroExterno: true,
        objeto: true,
        origem: true,
        orgaoRepassador: true,
        valorRepasse: true,
        valorContrapartida: true,
        vigenciaInicio: true,
        vigenciaFim: true,
        situacao: true,
        _count: { select: { empreendimentos: true } },
      },
    });

    return convenios.map((convenio) => ({
      id: convenio.id,
      protocolo: convenio.protocolo,
      numeroExterno: convenio.numeroExterno,
      objeto: convenio.objeto,
      origem: convenio.origem,
      orgaoRepassador: convenio.orgaoRepassador,
      valorRepasse: numero(convenio.valorRepasse),
      valorContrapartida: numero(convenio.valorContrapartida),
      vigenciaInicio: convenio.vigenciaInicio.toISOString(),
      vigenciaFim: convenio.vigenciaFim.toISOString(),
      situacao: convenio.situacao,
      empreendimentos: convenio._count.empreendimentos,
      /** Vigência vencida com obra em andamento é o que trava a prestação de contas. */
      vigenciaVencida: convenio.vigenciaFim < new Date(),
    }));
  }

  async listarEmpreendimentos() {
    const empreendimentos = await this.prisma.tx.empreendimento.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        protocolo: true,
        nome: true,
        slug: true,
        bairro: true,
        situacao: true,
        unidadesPrevistas: true,
        previsaoEntrega: true,
        programa: { select: { id: true, nome: true, slug: true } },
        convenio: { select: { id: true, protocolo: true, objeto: true } },
        obras: { select: { percentualExecutado: true, situacao: true } },
        unidades: { select: { situacao: true } },
      },
    });

    return empreendimentos.map((empreendimento) => {
      const unidadesEntregues = empreendimento.unidades.filter(
        (unidade) => unidade.situacao === 'ENTREGUE',
      ).length;

      return {
        id: empreendimento.id,
        protocolo: empreendimento.protocolo,
        nome: empreendimento.nome,
        slug: empreendimento.slug,
        bairro: empreendimento.bairro,
        situacao: empreendimento.situacao,
        unidadesPrevistas: empreendimento.unidadesPrevistas,
        unidadesCadastradas: empreendimento.unidades.length,
        unidadesEntregues,
        previsaoEntrega: empreendimento.previsaoEntrega?.toISOString() ?? null,
        programa: empreendimento.programa,
        convenio: empreendimento.convenio,
        // Média simples entre obras: cada contrato tem seu cronograma, e ponderar por valor
        // esconderia uma obra pequena parada atrás de uma grande adiantada.
        percentualObras: media(
          empreendimento.obras.map((obra) => numero(obra.percentualExecutado)),
        ),
        obrasParalisadas: empreendimento.obras.filter((obra) => obra.situacao === 'PARALISADA')
          .length,
      };
    });
  }

  async detalheEmpreendimento(slug: string) {
    const empreendimento = await this.prisma.tx.empreendimento.findFirst({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        protocolo: true,
        nome: true,
        slug: true,
        endereco: true,
        bairro: true,
        cep: true,
        situacao: true,
        unidadesPrevistas: true,
        previsaoEntrega: true,
        entregueEm: true,
        observacao: true,
        programa: { select: { id: true, nome: true, slug: true } },
        convenio: {
          select: {
            id: true,
            protocolo: true,
            objeto: true,
            orgaoRepassador: true,
            valorRepasse: true,
            vigenciaFim: true,
            situacao: true,
          },
        },
      },
    });

    if (!empreendimento) throw new NotFoundException('Empreendimento não encontrado.');

    const [obras, unidades, candidatas] = await Promise.all([
      this.obrasDoEmpreendimento(empreendimento.id),
      this.unidadesDoEmpreendimento(empreendimento.id),
      this.candidatasParaEntrega(empreendimento.id),
    ]);

    return {
      ...empreendimento,
      previsaoEntrega: empreendimento.previsaoEntrega?.toISOString() ?? null,
      entregueEm: empreendimento.entregueEm?.toISOString() ?? null,
      convenio: empreendimento.convenio
        ? {
            ...empreendimento.convenio,
            valorRepasse: numero(empreendimento.convenio.valorRepasse),
            vigenciaFim: empreendimento.convenio.vigenciaFim.toISOString(),
          }
        : null,
      obras,
      unidades,
      candidatas,
      resumoUnidades: resumirUnidades(unidades.map((unidade) => unidade.situacao)),
    };
  }

  /**
   * Quem pode receber uma casa deste conjunto.
   *
   * São as famílias contempladas ou convocadas no programa vinculado, e que ainda não têm unidade.
   * Oferecer a lista inteira de famílias seria abrir a porta para entregar fora da fila — a tela
   * não deve tornar fácil o que a regra proíbe.
   */
  async candidatasParaEntrega(empreendimentoId: string) {
    const empreendimento = await this.prisma.tx.empreendimento.findFirst({
      where: { id: empreendimentoId, deletedAt: null },
      select: { programaId: true },
    });

    if (!empreendimento?.programaId) return [];

    const inscricoes = await this.prisma.tx.inscricaoFila.findMany({
      where: {
        programaId: empreendimento.programaId,
        situacao: { in: ['CONTEMPLADA', 'CONVOCADA'] },
        familia: { unidades: { none: { situacao: 'ENTREGUE' } } },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        protocolo: true,
        situacao: true,
        familia: {
          select: { id: true, codigo: true, responsavel: { select: { nome: true } } },
        },
      },
    });

    return inscricoes.map((inscricao) => ({
      familiaId: inscricao.familia.id,
      codigo: inscricao.familia.codigo,
      responsavel: inscricao.familia.responsavel.nome,
      protocolo: inscricao.protocolo,
      situacao: inscricao.situacao,
    }));
  }

  /** Endereço e CEP do conjunto — base da geração de unidades em lote. */
  async detalheEmpreendimentoPorId(empreendimentoId: string) {
    const empreendimento = await this.prisma.tx.empreendimento.findFirst({
      where: { id: empreendimentoId, deletedAt: null },
      select: { id: true, endereco: true, cep: true, unidadesPrevistas: true },
    });

    if (!empreendimento) throw new NotFoundException('Empreendimento não encontrado.');
    return empreendimento;
  }

  private async obrasDoEmpreendimento(empreendimentoId: string) {
    const obras = await this.prisma.tx.obra.findMany({
      where: { empreendimentoId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        descricao: true,
        executoraNome: true,
        executoraCnpj: true,
        numeroContrato: true,
        artRrt: true,
        valorContrato: true,
        valorMedido: true,
        situacao: true,
        motivoParalisacao: true,
        inicioPrevisto: true,
        terminoPrevisto: true,
        etapas: {
          orderBy: { ordem: 'asc' },
          select: {
            id: true,
            codigo: true,
            nome: true,
            peso: true,
            executado: true,
            previstaAte: true,
            concluidaEm: true,
          },
        },
        medicoes: {
          orderBy: { numero: 'desc' },
          select: {
            id: true,
            protocolo: true,
            numero: true,
            periodoInicio: true,
            periodoFim: true,
            percentualAcumulado: true,
            valor: true,
            situacao: true,
            fiscalNome: true,
            aprovadaEm: true,
            aprovadaPor: true,
            motivo: true,
          },
        },
      },
    });

    const agora = new Date();

    return obras.map((obra) => {
      const etapas: habitacao.EtapaCronograma[] = obra.etapas.map((etapa) => ({
        codigo: etapa.codigo,
        nome: etapa.nome,
        peso: numero(etapa.peso),
        executado: numero(etapa.executado),
        previstaAte: etapa.previstaAte.toISOString(),
        concluidaEm: etapa.concluidaEm?.toISOString(),
      }));

      const resumo = habitacao.resumirObra({
        etapas,
        valorContrato: numero(obra.valorContrato),
        valorMedidoAcumulado: numero(obra.valorMedido),
        agora,
      });

      return {
        id: obra.id,
        descricao: obra.descricao,
        executoraNome: obra.executoraNome,
        executoraCnpj: obra.executoraCnpj,
        numeroContrato: obra.numeroContrato,
        artRrt: obra.artRrt,
        valorContrato: numero(obra.valorContrato),
        valorMedido: numero(obra.valorMedido),
        situacao: obra.situacao,
        motivoParalisacao: obra.motivoParalisacao,
        inicioPrevisto: obra.inicioPrevisto.toISOString(),
        terminoPrevisto: obra.terminoPrevisto.toISOString(),
        resumo,
        etapas: habitacao.avaliarEtapas(etapas, agora).map((etapa, indice) => ({
          ...etapa,
          id: obra.etapas[indice]?.id ?? '',
        })),
        medicoes: obra.medicoes.map((medicao) => ({
          id: medicao.id,
          protocolo: medicao.protocolo,
          numero: medicao.numero,
          periodoInicio: medicao.periodoInicio.toISOString(),
          periodoFim: medicao.periodoFim.toISOString(),
          percentualAcumulado: numero(medicao.percentualAcumulado),
          valor: numero(medicao.valor),
          situacao: medicao.situacao,
          fiscalNome: medicao.fiscalNome,
          aprovadaEm: medicao.aprovadaEm?.toISOString() ?? null,
          aprovadaPor: medicao.aprovadaPor,
          motivo: medicao.motivo,
        })),
        medicoesPendentes: obra.medicoes.filter(
          (medicao) => medicao.situacao === SituacaoMedicao.RASCUNHO,
        ).length,
      };
    });
  }

  private async unidadesDoEmpreendimento(empreendimentoId: string) {
    const unidades = await this.prisma.tx.unidadeHabitacional.findMany({
      where: { empreendimentoId, deletedAt: null },
      orderBy: { identificacao: 'asc' },
      select: {
        id: true,
        protocolo: true,
        identificacao: true,
        quadra: true,
        lote: true,
        endereco: true,
        tipologia: true,
        areaConstruida: true,
        matricula: true,
        valorAvaliado: true,
        situacao: true,
        entregueEm: true,
        motivoSituacao: true,
        familia: {
          select: { id: true, codigo: true, responsavel: { select: { nome: true } } },
        },
      },
    });

    return unidades.map((unidade) => ({
      id: unidade.id,
      protocolo: unidade.protocolo,
      identificacao: unidade.identificacao,
      quadra: unidade.quadra,
      lote: unidade.lote,
      endereco: unidade.endereco,
      tipologia: unidade.tipologia,
      areaConstruida: unidade.areaConstruida ? numero(unidade.areaConstruida) : null,
      matricula: unidade.matricula,
      valorAvaliado: unidade.valorAvaliado ? numero(unidade.valorAvaliado) : null,
      situacao: unidade.situacao as habitacao.SituacaoUnidade,
      entregueEm: unidade.entregueEm?.toISOString() ?? null,
      motivoSituacao: unidade.motivoSituacao,
      familia: unidade.familia
        ? {
            id: unidade.familia.id,
            codigo: unidade.familia.codigo,
            responsavel: unidade.familia.responsavel.nome,
          }
        : null,
      transicoes: habitacao.transicoesUnidade(unidade.situacao as habitacao.SituacaoUnidade),
      exigeAcompanhamento: habitacao.exigeAcompanhamento(
        unidade.situacao as habitacao.SituacaoUnidade,
      ),
    }));
  }
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Math.round((valores.reduce((soma, valor) => soma + valor, 0) / valores.length) * 100) / 100;
}

function resumirUnidades(situacoes: habitacao.SituacaoUnidade[]) {
  const contagem = {} as Record<habitacao.SituacaoUnidade, number>;
  for (const situacao of habitacao.SITUACOES_UNIDADE) contagem[situacao] = 0;
  for (const situacao of situacoes) contagem[situacao] += 1;

  return contagem;
}
