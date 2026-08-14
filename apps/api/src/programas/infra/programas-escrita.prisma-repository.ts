import { Injectable } from '@nestjs/common';
import { SituacaoPrograma, SituacaoVersaoCriterio, type Prisma } from '@prisma/client';
import type { DefinicaoCriterio } from '@habita/shared/habitacao';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DadosPrograma,
  ProgramaEstado,
  ProgramasEscritaRepository,
  VersaoEstado,
} from '../domain/ports';

@Injectable()
export class ProgramasEscritaPrismaRepository implements ProgramasEscritaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: DadosPrograma & { slug: string }): Promise<{ id: string; slug: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.programaHabitacional.create({
      data: {
        tenantId: tenantId ?? '',
        nome: dados.nome,
        slug: dados.slug,
        fonteRecurso: dados.fonteRecurso,
        vagas: dados.vagas,
        inscricaoInicio: dados.inscricaoInicio,
        inscricaoFim: dados.inscricaoFim,
        regulamentoKey: dados.regulamentoKey ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, slug: true },
    });
  }

  async atualizar(programaId: string, dados: Partial<DadosPrograma>): Promise<void> {
    await this.prisma.tx.programaHabitacional.update({
      where: { id: programaId },
      data: { ...dados, updatedBy: actorId() },
    });
  }

  async estado(programaId: string): Promise<ProgramaEstado | null> {
    const programa = await this.prisma.tx.programaHabitacional.findFirst({
      where: { id: programaId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        situacao: true,
        _count: { select: { inscricoes: true } },
      },
    });
    if (!programa) return null;

    return {
      id: programa.id,
      slug: programa.slug,
      situacao: programa.situacao,
      temInscricoes: programa._count.inscricoes > 0,
    };
  }

  async slugEmUso(slug: string): Promise<boolean> {
    const existente = await this.prisma.tx.programaHabitacional.findFirst({
      where: { slug },
      select: { id: true },
    });
    return existente !== null;
  }

  async definirSituacao(programaId: string, situacao: string): Promise<void> {
    await this.prisma.tx.programaHabitacional.update({
      where: { id: programaId },
      data: { situacao: situacao as SituacaoPrograma, updatedBy: actorId() },
    });
  }

  async proximaVersao(programaId: string): Promise<number> {
    const ultima = await this.prisma.tx.versaoCriterio.findFirst({
      where: { programaId },
      orderBy: { versao: 'desc' },
      select: { versao: true },
    });
    return (ultima?.versao ?? 0) + 1;
  }

  async criarVersao(dados: {
    programaId: string;
    versao: number;
    definicoes: DefinicaoCriterio[];
  }): Promise<{ id: string; versao: number }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.versaoCriterio.create({
      data: {
        tenantId: tenantId ?? '',
        programaId: dados.programaId,
        versao: dados.versao,
        definicoes: dados.definicoes as unknown as Prisma.InputJsonValue,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, versao: true },
    });
  }

  async versao(versaoId: string): Promise<VersaoEstado | null> {
    const versao = await this.prisma.tx.versaoCriterio.findUnique({
      where: { id: versaoId },
      select: { id: true, programaId: true, versao: true, situacao: true, definicoes: true },
    });
    if (!versao) return null;

    return { ...versao, definicoes: versao.definicoes as unknown as DefinicaoCriterio[] };
  }

  async atualizarRascunho(versaoId: string, definicoes: DefinicaoCriterio[]): Promise<void> {
    await this.prisma.tx.versaoCriterio.update({
      where: { id: versaoId },
      data: {
        definicoes: definicoes as unknown as Prisma.InputJsonValue,
        updatedBy: actorId(),
      },
    });
  }

  async publicarVersao(versaoId: string, programaId: string, publicadoEm: Date): Promise<void> {
    const ator = actorId();

    // A anterior vira SUBSTITUIDA em vez de sumir: quem foi pontuado sob ela precisa continuar
    // conseguindo mostrar a regra que valia.
    await this.prisma.tx.versaoCriterio.updateMany({
      where: { programaId, situacao: SituacaoVersaoCriterio.PUBLICADA },
      data: { situacao: SituacaoVersaoCriterio.SUBSTITUIDA },
    });

    await this.prisma.tx.versaoCriterio.update({
      where: { id: versaoId },
      data: {
        situacao: SituacaoVersaoCriterio.PUBLICADA,
        publicadoEm,
        publicadoPor: ator,
        updatedBy: ator,
      },
    });
  }
}
