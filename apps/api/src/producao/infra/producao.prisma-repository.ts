import { Injectable } from '@nestjs/common';
import { Prisma, SituacaoMedicao, SituacaoObra as SituacaoObraPrisma } from '@prisma/client';
import type { habitacao } from '@habita/shared';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DadosConvenio,
  DadosEmpreendimento,
  DadosEtapa,
  DadosMedicao,
  DadosObra,
  DadosUnidade,
  EstadoObraParaMedicao,
  ProducaoRepository,
  SituacaoObra,
} from '../domain/ports';

/** Decimal do Prisma vira number na fronteira do domínio — a regra pura não conhece Decimal. */
const numero = (valor: Prisma.Decimal | null): number => (valor ? Number(valor) : 0);

@Injectable()
export class ProducaoPrismaRepository implements ProducaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get tenantId(): string {
    return getActiveContext().tenantId ?? '';
  }

  async criarConvenio(protocolo: string, dados: DadosConvenio): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.convenio.create({
      data: {
        tenantId: this.tenantId,
        protocolo,
        numeroExterno: dados.numeroExterno ?? null,
        objeto: dados.objeto,
        origem: dados.origem,
        orgaoRepassador: dados.orgaoRepassador,
        valorRepasse: new Prisma.Decimal(dados.valorRepasse),
        valorContrapartida: new Prisma.Decimal(dados.valorContrapartida),
        vigenciaInicio: dados.vigenciaInicio,
        vigenciaFim: dados.vigenciaFim,
        observacao: dados.observacao ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async criarEmpreendimento(
    protocolo: string,
    slug: string,
    dados: DadosEmpreendimento,
  ): Promise<{ id: string; slug: string }> {
    const ator = actorId();

    return this.prisma.tx.empreendimento.create({
      data: {
        tenantId: this.tenantId,
        protocolo,
        slug,
        nome: dados.nome,
        convenioId: dados.convenioId ?? null,
        programaId: dados.programaId ?? null,
        endereco: dados.endereco,
        bairro: dados.bairro,
        cep: dados.cep ?? null,
        unidadesPrevistas: dados.unidadesPrevistas,
        previsaoEntrega: dados.previsaoEntrega ?? null,
        observacao: dados.observacao ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, slug: true },
    });
  }

  async slugEmUso(slug: string): Promise<boolean> {
    const achado = await this.prisma.tx.empreendimento.findFirst({
      where: { slug },
      select: { id: true },
    });
    return achado !== null;
  }

  async criarObra(dados: DadosObra): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.obra.create({
      data: {
        tenantId: this.tenantId,
        empreendimentoId: dados.empreendimentoId,
        descricao: dados.descricao,
        executoraNome: dados.executoraNome,
        executoraCnpj: dados.executoraCnpj,
        numeroContrato: dados.numeroContrato,
        artRrt: dados.artRrt ?? null,
        valorContrato: new Prisma.Decimal(dados.valorContrato),
        inicioPrevisto: dados.inicioPrevisto,
        terminoPrevisto: dados.terminoPrevisto,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  /**
   * Substitui o cronograma inteiro numa transação só. Apagar e recriar é intencional: etapa
   * renomeada ou repesada não é a mesma etapa, e manter a antiga produziria dois pesos para o
   * mesmo trecho da obra.
   */
  async definirEtapas(obraId: string, etapas: DadosEtapa[]): Promise<void> {
    const ator = actorId();

    await this.prisma.tx.etapaObra.deleteMany({ where: { obraId } });
    await this.prisma.tx.etapaObra.createMany({
      data: etapas.map((etapa, indice) => ({
        tenantId: this.tenantId,
        obraId,
        ordem: indice + 1,
        codigo: etapa.codigo,
        nome: etapa.nome,
        peso: new Prisma.Decimal(etapa.peso),
        previstaAte: etapa.previstaAte,
        createdBy: ator,
        updatedBy: ator,
      })),
    });
  }

  async atualizarExecucaoEtapa(
    etapaId: string,
    executado: number,
    concluidaEm: Date | null,
  ): Promise<void> {
    await this.prisma.tx.etapaObra.update({
      where: { id: etapaId },
      data: {
        executado: new Prisma.Decimal(executado),
        concluidaEm,
        updatedBy: actorId(),
      },
    });
  }

  async etapaDaObra(etapaId: string): Promise<{ obraId: string; nome: string } | null> {
    return this.prisma.tx.etapaObra.findUnique({
      where: { id: etapaId },
      select: { obraId: true, nome: true },
    });
  }

  async recalcularAvancoDaObra(obraId: string, percentual: number): Promise<void> {
    await this.prisma.tx.obra.update({
      where: { id: obraId },
      data: { percentualExecutado: new Prisma.Decimal(percentual), updatedBy: actorId() },
    });
  }

  async definirSituacaoObra(
    obraId: string,
    situacao: SituacaoObra,
    motivo?: string,
  ): Promise<void> {
    const agora = new Date();

    await this.prisma.tx.obra.update({
      where: { id: obraId },
      data: {
        situacao: situacao as SituacaoObraPrisma,
        motivoParalisacao: situacao === 'PARALISADA' || situacao === 'RESCINDIDA' ? (motivo ?? null) : null,
        inicioReal: situacao === 'EM_EXECUCAO' ? agora : undefined,
        terminoReal: situacao === 'CONCLUIDA' ? agora : undefined,
        updatedBy: actorId(),
      },
    });
  }

  async estadoParaMedicao(obraId: string): Promise<EstadoObraParaMedicao | null> {
    const obra = await this.prisma.tx.obra.findUnique({
      where: { id: obraId },
      select: {
        id: true,
        valorContrato: true,
        situacao: true,
        etapas: {
          orderBy: { ordem: 'asc' },
          select: {
            codigo: true,
            nome: true,
            peso: true,
            executado: true,
            previstaAte: true,
            concluidaEm: true,
          },
        },
        medicoes: {
          where: { situacao: SituacaoMedicao.APROVADA },
          orderBy: { numero: 'desc' },
          select: { numero: true, valor: true, percentualAcumulado: true },
        },
      },
    });

    if (!obra) return null;

    const ultimaAprovada = obra.medicoes[0];
    const maiorNumero = await this.prisma.tx.medicao.aggregate({
      where: { obraId },
      _max: { numero: true },
    });

    const etapas: habitacao.EtapaCronograma[] = obra.etapas.map((etapa) => ({
      codigo: etapa.codigo,
      nome: etapa.nome,
      peso: numero(etapa.peso),
      executado: numero(etapa.executado),
      previstaAte: etapa.previstaAte.toISOString(),
      concluidaEm: etapa.concluidaEm?.toISOString(),
    }));

    return {
      obraId: obra.id,
      valorContrato: numero(obra.valorContrato),
      valorMedidoAcumulado: obra.medicoes.reduce((soma, item) => soma + numero(item.valor), 0),
      percentualAcumuladoAnterior: ultimaAprovada ? numero(ultimaAprovada.percentualAcumulado) : 0,
      proximoNumero: (maiorNumero._max.numero ?? 0) + 1,
      etapas,
      situacao: obra.situacao as SituacaoObra,
    };
  }

  async criarMedicao(
    protocolo: string,
    numeroMedicao: number,
    dados: DadosMedicao,
  ): Promise<{ id: string }> {
    const ctx = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.medicao.create({
      data: {
        tenantId: this.tenantId,
        obraId: dados.obraId,
        protocolo,
        numero: numeroMedicao,
        periodoInicio: dados.periodoInicio,
        periodoFim: dados.periodoFim,
        percentualAcumulado: new Prisma.Decimal(dados.percentualAcumulado),
        valor: new Prisma.Decimal(dados.valor),
        fiscalNome: dados.fiscalNome,
        fiscalId: ctx.userId ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async aprovarMedicao(medicaoId: string, aprovadaPor: string): Promise<void> {
    await this.prisma.tx.medicao.update({
      where: { id: medicaoId },
      data: {
        situacao: SituacaoMedicao.APROVADA,
        aprovadaEm: new Date(),
        aprovadaPor,
        updatedBy: actorId(),
      },
    });
  }

  async encerrarMedicao(
    medicaoId: string,
    situacao: 'REJEITADA' | 'CANCELADA',
    motivo: string,
  ): Promise<void> {
    await this.prisma.tx.medicao.update({
      where: { id: medicaoId },
      data: { situacao: situacao as SituacaoMedicao, motivo, updatedBy: actorId() },
    });
  }

  async medicao(medicaoId: string) {
    const achada = await this.prisma.tx.medicao.findUnique({
      where: { id: medicaoId },
      select: {
        id: true,
        obraId: true,
        situacao: true,
        valor: true,
        percentualAcumulado: true,
      },
    });

    if (!achada) return null;

    return {
      id: achada.id,
      obraId: achada.obraId,
      situacao: achada.situacao,
      valor: numero(achada.valor),
      percentualAcumulado: numero(achada.percentualAcumulado),
    };
  }

  async somarMedicoesAprovadas(obraId: string): Promise<{ valor: number; percentual: number }> {
    const aprovadas = await this.prisma.tx.medicao.findMany({
      where: { obraId, situacao: SituacaoMedicao.APROVADA },
      orderBy: { numero: 'desc' },
      select: { valor: true, percentualAcumulado: true },
    });

    return {
      valor: aprovadas.reduce((soma, item) => soma + numero(item.valor), 0),
      percentual: aprovadas[0] ? numero(aprovadas[0].percentualAcumulado) : 0,
    };
  }

  async registrarAcumuladoDaObra(obraId: string, valorMedido: number): Promise<void> {
    await this.prisma.tx.obra.update({
      where: { id: obraId },
      data: { valorMedido: new Prisma.Decimal(valorMedido), updatedBy: actorId() },
    });
  }

  async criarUnidade(protocolo: string, dados: DadosUnidade): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.unidadeHabitacional.create({
      data: {
        tenantId: this.tenantId,
        protocolo,
        empreendimentoId: dados.empreendimentoId,
        identificacao: dados.identificacao,
        quadra: dados.quadra ?? null,
        lote: dados.lote ?? null,
        endereco: dados.endereco,
        cep: dados.cep ?? null,
        tipologia: dados.tipologia ?? null,
        areaConstruida: dados.areaConstruida ? new Prisma.Decimal(dados.areaConstruida) : null,
        areaTerreno: dados.areaTerreno ? new Prisma.Decimal(dados.areaTerreno) : null,
        matricula: dados.matricula ?? null,
        cartorio: dados.cartorio ?? null,
        inscricaoImobiliaria: dados.inscricaoImobiliaria ?? null,
        valorAvaliado: dados.valorAvaliado ? new Prisma.Decimal(dados.valorAvaliado) : null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async unidade(unidadeId: string) {
    const achada = await this.prisma.tx.unidadeHabitacional.findUnique({
      where: { id: unidadeId },
      select: { id: true, situacao: true, familiaId: true, identificacao: true },
    });

    if (!achada) return null;

    return {
      id: achada.id,
      situacao: achada.situacao as habitacao.SituacaoUnidade,
      familiaId: achada.familiaId,
      identificacao: achada.identificacao,
    };
  }

  async moverUnidade(
    unidadeId: string,
    situacao: habitacao.SituacaoUnidade,
    motivo: string,
    familiaId?: string | null,
    entregueEm?: Date | null,
  ): Promise<void> {
    await this.prisma.tx.unidadeHabitacional.update({
      where: { id: unidadeId },
      data: {
        situacao,
        motivoSituacao: motivo,
        familiaId: familiaId === undefined ? undefined : familiaId,
        entregueEm: entregueEm === undefined ? undefined : entregueEm,
        updatedBy: actorId(),
      },
    });
  }

  /**
   * `skipDuplicates` deixa a geração ser repetida sem produzir unidade duplicada: quem clicou duas
   * vezes recebe a mesma casa uma vez só.
   */
  async gerarUnidadesEmLote(
    empreendimentoId: string,
    unidades: { protocolo: string; dados: DadosUnidade }[],
  ): Promise<number> {
    const ator = actorId();

    const resultado = await this.prisma.tx.unidadeHabitacional.createMany({
      data: unidades.map(({ protocolo, dados }) => ({
        tenantId: this.tenantId,
        protocolo,
        empreendimentoId,
        identificacao: dados.identificacao,
        quadra: dados.quadra ?? null,
        lote: dados.lote ?? null,
        endereco: dados.endereco,
        cep: dados.cep ?? null,
        tipologia: dados.tipologia ?? null,
        areaConstruida: dados.areaConstruida ? new Prisma.Decimal(dados.areaConstruida) : null,
        areaTerreno: dados.areaTerreno ? new Prisma.Decimal(dados.areaTerreno) : null,
        valorAvaliado: dados.valorAvaliado ? new Prisma.Decimal(dados.valorAvaliado) : null,
        createdBy: ator,
        updatedBy: ator,
      })),
      skipDuplicates: true,
    });

    return resultado.count;
  }
}
