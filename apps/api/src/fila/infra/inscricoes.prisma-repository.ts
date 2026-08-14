import { Injectable } from '@nestjs/common';
import { MotivoCalculo, type Prisma, SituacaoInscricao as SituacaoPrisma } from '@prisma/client';
import type { SituacaoInscricao } from '@habita/shared/habitacao';
import { actorId, getActiveContext } from '../../context/request-context';
import { fatosDaFicha } from '../fatos-da-ficha';
import { PrismaService } from '../../prisma/prisma.service';
import type { InscricoesRepository } from '../domain/ports';
import type { InscricaoParaCalculo, SnapshotParaGravar } from '../domain/tipos';

/** A ficha vigente e o snapshot vigente são o par que descreve a inscrição hoje. */
const INCLUDE_PARA_CALCULO = {
  familia: { include: { fichas: { where: { vigente: true }, take: 1 } } },
  snapshots: { where: { vigente: true }, take: 1 },
} satisfies Prisma.InscricaoFilaInclude;

@Injectable()
export class InscricoesPrismaRepository implements InscricoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existeParaFamilia(programaId: string, familiaId: string): Promise<boolean> {
    const existente = await this.prisma.tx.inscricaoFila.findFirst({
      where: { programaId, familiaId, deletedAt: null },
      select: { id: true },
    });
    return existente !== null;
  }

  async criar(dados: {
    programaId: string;
    familiaId: string;
    protocolo: string;
    inscritaEm: Date;
  }): Promise<{ id: string; protocolo: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.inscricaoFila.create({
      data: {
        tenantId: tenantId ?? '',
        programaId: dados.programaId,
        familiaId: dados.familiaId,
        protocolo: dados.protocolo,
        inscritaEm: dados.inscritaEm,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, protocolo: true },
    });
  }

  async buscarParaCalculo(inscricaoId: string): Promise<InscricaoParaCalculo | null> {
    const inscricao = await this.prisma.tx.inscricaoFila.findFirst({
      where: { id: inscricaoId, deletedAt: null },
      include: INCLUDE_PARA_CALCULO,
    });
    if (!inscricao) return null;

    return this.paraDominio(inscricao);
  }

  async listarParaCalculo(programaId: string): Promise<InscricaoParaCalculo[]> {
    const inscricoes = await this.prisma.tx.inscricaoFila.findMany({
      where: { programaId, deletedAt: null },
      include: INCLUDE_PARA_CALCULO,
    });

    return inscricoes
      .map((inscricao) => this.paraDominio(inscricao))
      .filter((inscricao): inscricao is InscricaoParaCalculo => inscricao !== null);
  }

  async atualizarSituacao(
    inscricaoId: string,
    situacao: SituacaoInscricao,
    motivo?: string,
  ): Promise<void> {
    await this.prisma.tx.inscricaoFila.update({
      where: { id: inscricaoId },
      data: {
        situacao: situacao as SituacaoPrisma,
        motivoSituacao: motivo ?? null,
        updatedBy: actorId(),
      },
    });
  }

  /**
   * Grava o snapshot novo e aposenta o anterior na mesma transação. O antigo não some: continua
   * no histórico, com a versão de critério que valia quando foi calculado.
   */
  async registrarSnapshot(snapshot: SnapshotParaGravar): Promise<{ id: string; total: number }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    await this.prisma.tx.pontuacaoSnapshot.updateMany({
      where: { inscricaoId: snapshot.inscricaoId, vigente: true },
      data: { vigente: false },
    });

    const criado = await this.prisma.tx.pontuacaoSnapshot.create({
      data: {
        tenantId: tenantId ?? '',
        inscricaoId: snapshot.inscricaoId,
        versaoCriterioId: snapshot.versaoCriterioId,
        total: snapshot.total,
        totalMaximo: snapshot.totalMaximo,
        itens: snapshot.itens as unknown as Prisma.InputJsonValue,
        fatos: snapshot.fatos as unknown as Prisma.InputJsonValue,
        motivo: snapshot.motivo as MotivoCalculo,
        calculadoPor: ator,
        createdBy: ator,
      },
      select: { id: true, total: true },
    });

    return { id: criado.id, total: Number(criado.total) };
  }

  private paraDominio(
    inscricao: Prisma.InscricaoFilaGetPayload<{ include: typeof INCLUDE_PARA_CALCULO }>,
  ): InscricaoParaCalculo | null {
    const ficha = inscricao.familia.fichas[0];
    // Sem ficha vigente não há fatos, e sem fatos não existe nota defensável — a inscrição fica
    // fora do cálculo em vez de entrar com dado presumido.
    if (!ficha) return null;

    return {
      id: inscricao.id,
      protocolo: inscricao.protocolo,
      familiaId: inscricao.familiaId,
      situacao: inscricao.situacao as SituacaoInscricao,
      inscritaEm: inscricao.inscritaEm,
      fatos: fatosDaFicha(ficha, { inscritaEm: inscricao.inscritaEm, agora: new Date() }),
      mesesResidenciaMunicipio: ficha.mesesResidenciaMunicipio,
      pontuacaoVigente: Number(inscricao.snapshots[0]?.total ?? 0),
    };
  }
}
