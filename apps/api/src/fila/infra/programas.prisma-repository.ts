import { Injectable } from '@nestjs/common';
import { SituacaoVersaoCriterio } from '@prisma/client';
import type { DefinicaoCriterio } from '@habita/shared/habitacao';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProgramasRepository } from '../domain/ports';
import type { Programa, VersaoPublicada } from '../domain/tipos';

@Injectable()
export class ProgramasPrismaRepository implements ProgramasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: string): Promise<Programa | null> {
    const programa = await this.prisma.tx.programaHabitacional.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nome: true,
        slug: true,
        vagas: true,
        situacao: true,
        inscricaoInicio: true,
        inscricaoFim: true,
      },
    });
    return programa;
  }

  /**
   * A versão vigente é a publicada mais recente. Rascunho nunca vale para cálculo: critério só
   * entra em vigor depois de publicado, e é o que a inscrição declarou aceitar.
   */
  async versaoPublicada(programaId: string): Promise<VersaoPublicada | null> {
    const versao = await this.prisma.tx.versaoCriterio.findFirst({
      where: { programaId, situacao: SituacaoVersaoCriterio.PUBLICADA },
      orderBy: { versao: 'desc' },
      select: { id: true, versao: true, publicadoEm: true, definicoes: true },
    });
    if (!versao) return null;

    return {
      id: versao.id,
      versao: versao.versao,
      publicadoEm: versao.publicadoEm?.toISOString() ?? '',
      criterios: versao.definicoes as unknown as DefinicaoCriterio[],
    };
  }
}
