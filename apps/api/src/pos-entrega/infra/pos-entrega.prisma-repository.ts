import { Injectable } from '@nestjs/common';
import {
  EixoTrabalhoSocial,
  GravidadeOcorrencia,
  OrigemOcorrencia,
  Prisma,
  SituacaoEixo,
  SituacaoOcorrenciaUso,
  TipoAcompanhamento as TipoAcompanhamentoPrisma,
  TipoOcorrenciaUso,
} from '@prisma/client';
import type { habitacao } from '@habita/shared';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DadosAcompanhamento,
  DadosOcorrencia,
  EstadoOcorrencia,
  EstadoUnidadeParaVisita,
  PosEntregaRepository,
} from '../domain/ports';

@Injectable()
export class PosEntregaPrismaRepository implements PosEntregaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get tenantId(): string {
    return getActiveContext().tenantId ?? '';
  }

  async estadoDaUnidade(unidadeId: string): Promise<EstadoUnidadeParaVisita | null> {
    const unidade = await this.prisma.tx.unidadeHabitacional.findUnique({
      where: { id: unidadeId },
      select: {
        id: true,
        situacao: true,
        entregueEm: true,
        familiaId: true,
        acompanhamentos: {
          where: { deletedAt: null },
          orderBy: { visitadaEm: 'desc' },
          take: 1,
          select: { visitadaEm: true },
        },
      },
    });

    if (!unidade) return null;

    return {
      unidadeId: unidade.id,
      situacao: unidade.situacao as habitacao.SituacaoUnidade,
      entregueEm: unidade.entregueEm?.toISOString() ?? null,
      ultimaVisitaEm: unidade.acompanhamentos[0]?.visitadaEm.toISOString() ?? null,
      familiaId: unidade.familiaId,
    };
  }

  async registrarAcompanhamento(
    protocolo: string,
    dados: DadosAcompanhamento,
    proximaVisitaEm: Date | null,
  ): Promise<{ id: string }> {
    const ctx = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.acompanhamentoUnidade.create({
      data: {
        tenantId: this.tenantId,
        unidadeId: dados.unidadeId,
        protocolo,
        visitadaEm: dados.visitadaEm,
        tipo: dados.tipo as TipoAcompanhamentoPrisma,
        tecnicoNome: dados.tecnicoNome,
        tecnicoId: ctx.userId ?? null,
        residenciaConfirmada: dados.residenciaConfirmada,
        quemReside: dados.quemReside ?? null,
        moradoresEncontrados: dados.moradoresEncontrados ?? null,
        parecer: dados.parecer,
        latitude: dados.latitude ? new Prisma.Decimal(dados.latitude) : null,
        longitude: dados.longitude ? new Prisma.Decimal(dados.longitude) : null,
        fotos: dados.fotos ?? [],
        proximaVisitaEm,
        createdBy: ator,
        updatedBy: ator,
        eixos: {
          create: dados.eixos.map((avaliacao) => ({
            tenantId: this.tenantId,
            eixo: avaliacao.eixo as EixoTrabalhoSocial,
            situacao: avaliacao.situacao as SituacaoEixo,
            observacao: avaliacao.observacao ?? null,
            createdBy: ator,
            updatedBy: ator,
          })),
        },
      },
      select: { id: true },
    });
  }

  async abrirOcorrencia(
    protocolo: string,
    dados: DadosOcorrencia,
    gravidade: habitacao.GravidadeOcorrencia,
  ): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.ocorrenciaUnidade.create({
      data: {
        tenantId: this.tenantId,
        unidadeId: dados.unidadeId,
        protocolo,
        tipo: dados.tipo as TipoOcorrenciaUso,
        gravidade: gravidade as GravidadeOcorrencia,
        origem: dados.origem as OrigemOcorrencia,
        descricao: dados.descricao,
        constatadaEm: dados.constatadaEm,
        acompanhamentoId: dados.acompanhamentoId ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async ocorrencia(ocorrenciaId: string): Promise<EstadoOcorrencia | null> {
    const achada = await this.prisma.tx.ocorrenciaUnidade.findUnique({
      where: { id: ocorrenciaId },
      select: {
        id: true,
        unidadeId: true,
        tipo: true,
        situacao: true,
        notificadaEm: true,
      },
    });

    if (!achada) return null;

    return {
      id: achada.id,
      unidadeId: achada.unidadeId,
      tipo: achada.tipo as habitacao.TipoOcorrencia,
      situacao: achada.situacao as habitacao.SituacaoOcorrencia,
      notificadaEm: achada.notificadaEm,
    };
  }

  async moverOcorrencia(
    ocorrenciaId: string,
    situacao: habitacao.SituacaoOcorrencia,
    dados: { notificadaEm?: Date; prazoRegularizacaoAte?: Date | null; motivo?: string },
  ): Promise<void> {
    const encerra =
      situacao === 'REGULARIZADA' ||
      situacao === 'IMPROCEDENTE' ||
      situacao === 'ENCAMINHADA_JURIDICO';

    await this.prisma.tx.ocorrenciaUnidade.update({
      where: { id: ocorrenciaId },
      data: {
        situacao: situacao as SituacaoOcorrenciaUso,
        notificadaEm: dados.notificadaEm,
        prazoRegularizacaoAte: dados.prazoRegularizacaoAte,
        encerradaEm: encerra ? new Date() : undefined,
        motivoEncerramento: dados.motivo,
        updatedBy: actorId(),
      },
    });
  }

  async vincularEncaminhamento(ocorrenciaId: string, encaminhamentoId: string): Promise<void> {
    await this.prisma.tx.ocorrenciaUnidade.update({
      where: { id: ocorrenciaId },
      data: { encaminhamentoId, updatedBy: actorId() },
    });
  }

  /**
   * Periodicidade do acompanhamento, por prefeitura. Município sem parâmetro cai no padrão da
   * norma federal — nunca em "sem prazo", que faria a visita nunca vencer.
   */
  async parametrosAcompanhamento(): Promise<habitacao.Periodicidade> {
    const tenant = await this.prisma.tx.tenant.findUnique({
      where: { id: this.tenantId },
      select: { parametros: true },
    });

    const parametros = (tenant?.parametros ?? {}) as {
      acompanhamento?: { prazoPrimeiraVisitaDias?: number; periodicidadeMeses?: number };
    };

    return {
      prazoPrimeiraVisitaDias: parametros.acompanhamento?.prazoPrimeiraVisitaDias,
      periodicidadeMeses: parametros.acompanhamento?.periodicidadeMeses,
    };
  }
}
