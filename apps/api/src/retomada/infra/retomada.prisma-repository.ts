import { Injectable } from '@nestjs/common';
import {
  DecisaoRetomada,
  FaseRetomada,
  FormaNotificacao,
} from '@prisma/client';
import { habitacao } from '@habita/shared';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DadosAberturaCaso,
  DadosDecisao,
  DadosDefesa,
  DadosNotificacao,
  EstadoCasoCompleto,
  RetomadaRepository,
} from '../domain/ports';

/** Fases em que o caso ainda ocupa a unidade — usadas para impedir dois processos paralelos. */
const EM_ANDAMENTO: FaseRetomada[] = [
  FaseRetomada.ABERTO,
  FaseRetomada.NOTIFICADO,
  FaseRetomada.EM_DEFESA,
  FaseRetomada.EM_ANALISE,
  FaseRetomada.DECIDIDO,
];

@Injectable()
export class RetomadaPrismaRepository implements RetomadaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get tenantId(): string {
    return getActiveContext().tenantId ?? '';
  }

  async abrirCaso(protocolo: string, dados: DadosAberturaCaso): Promise<{ id: string }> {
    const ator = actorId();

    return this.prisma.tx.casoRetomada.create({
      data: {
        tenantId: this.tenantId,
        unidadeId: dados.unidadeId,
        ocorrenciaId: dados.ocorrenciaId ?? null,
        protocolo,
        fundamentacaoLegal: dados.fundamentacaoLegal,
        descricao: dados.descricao,
        abertoEm: new Date(),
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async caso(casoId: string): Promise<EstadoCasoCompleto | null> {
    const caso = await this.prisma.tx.casoRetomada.findUnique({
      where: { id: casoId },
      select: {
        id: true,
        protocolo: true,
        unidadeId: true,
        fase: true,
        notificadoEm: true,
        formaNotificacao: true,
        tentativasFrustradas: true,
        prazoDefesaAte: true,
        defesaApresentadaEm: true,
        unidade: { select: { familiaId: true, situacao: true } },
      },
    });

    if (!caso) return null;

    return {
      id: caso.id,
      protocolo: caso.protocolo,
      unidadeId: caso.unidadeId,
      familiaId: caso.unidade.familiaId,
      situacaoUnidade: caso.unidade.situacao as habitacao.SituacaoUnidade,
      fase: caso.fase as habitacao.FaseRetomada,
      notificadoEm: caso.notificadoEm?.toISOString() ?? null,
      formaNotificacao: (caso.formaNotificacao as habitacao.FormaNotificacao | null) ?? null,
      tentativasFrustradas: caso.tentativasFrustradas,
      prazoDefesaAte: caso.prazoDefesaAte?.toISOString() ?? null,
      defesaApresentadaEm: caso.defesaApresentadaEm?.toISOString() ?? null,
    };
  }

  async casoAbertoNaUnidade(unidadeId: string): Promise<{ id: string; protocolo: string } | null> {
    return this.prisma.tx.casoRetomada.findFirst({
      where: { unidadeId, deletedAt: null, fase: { in: EM_ANDAMENTO } },
      select: { id: true, protocolo: true },
    });
  }

  async registrarNotificacao(
    casoId: string,
    dados: DadosNotificacao,
    prazoAte: Date,
  ): Promise<void> {
    await this.prisma.tx.casoRetomada.update({
      where: { id: casoId },
      data: {
        notificadoEm: dados.notificadoEm,
        formaNotificacao: dados.forma as FormaNotificacao,
        comprovanteKey: dados.comprovanteKey ?? null,
        prazoDefesaAte: prazoAte,
        updatedBy: actorId(),
      },
    });
  }

  async registrarTentativaFrustrada(casoId: string): Promise<number> {
    const caso = await this.prisma.tx.casoRetomada.update({
      where: { id: casoId },
      data: { tentativasFrustradas: { increment: 1 }, updatedBy: actorId() },
      select: { tentativasFrustradas: true },
    });

    return caso.tentativasFrustradas;
  }

  async registrarDefesa(casoId: string, dados: DadosDefesa): Promise<void> {
    await this.prisma.tx.casoRetomada.update({
      where: { id: casoId },
      data: {
        defesaApresentadaEm: dados.apresentadaEm,
        defesaTeor: dados.teor,
        defesaApresentadaPor: dados.apresentadaPor,
        defesaArquivoKey: dados.arquivoKey ?? null,
        updatedBy: actorId(),
      },
    });
  }

  async registrarDecisao(
    casoId: string,
    dados: DadosDecisao,
    decididoPor: string,
  ): Promise<void> {
    await this.prisma.tx.casoRetomada.update({
      where: { id: casoId },
      data: {
        decisao: dados.decisao as DecisaoRetomada,
        fundamentacaoDecisao: dados.fundamentacao,
        decididoEm: new Date(),
        decididoPor,
        updatedBy: actorId(),
      },
    });
  }

  async moverFase(casoId: string, fase: habitacao.FaseRetomada): Promise<void> {
    await this.prisma.tx.casoRetomada.update({
      where: { id: casoId },
      data: { fase: fase as FaseRetomada, updatedBy: actorId() },
    });
  }

  async encerrarCaso(casoId: string, motivo: string): Promise<void> {
    await this.prisma.tx.casoRetomada.update({
      where: { id: casoId },
      data: {
        fase: FaseRetomada.ENCERRADO,
        encerradoEm: new Date(),
        motivoEncerramento: motivo,
        updatedBy: actorId(),
      },
    });
  }

  async registrarAto(
    casoId: string,
    ato: { titulo: string; detalhe?: string; autor: string; ocorridoEm?: Date },
  ): Promise<void> {
    const ator = actorId();
    const ultimo = await this.prisma.tx.atoDoCaso.aggregate({
      where: { casoId },
      _max: { ordem: true },
    });

    await this.prisma.tx.atoDoCaso.create({
      data: {
        tenantId: this.tenantId,
        casoId,
        ordem: (ultimo._max.ordem ?? 0) + 1,
        ocorridoEm: ato.ocorridoEm ?? new Date(),
        titulo: ato.titulo,
        detalhe: ato.detalhe ?? null,
        autor: ato.autor,
        createdBy: ator,
        updatedBy: ator,
      },
    });
  }

  /** Prazo de defesa por prefeitura; sem parâmetro, o da Lei 9.784/99. */
  async prazoDefesaPadrao(): Promise<number> {
    const tenant = await this.prisma.tx.tenant.findUnique({
      where: { id: this.tenantId },
      select: { parametros: true },
    });

    const parametros = (tenant?.parametros ?? {}) as { retomada?: { prazoDefesaDias?: number } };
    return parametros.retomada?.prazoDefesaDias ?? habitacao.PRAZO_DEFESA_DIAS;
  }
}
