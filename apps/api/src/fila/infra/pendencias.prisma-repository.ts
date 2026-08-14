import { Injectable } from '@nestjs/common';
import { SituacaoPendencia } from '@prisma/client';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { PendenciaEstado, PendenciasRepository } from '../domain/ports';

@Injectable()
export class PendenciasPrismaRepository implements PendenciasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async abrir(dados: {
    inscricaoId: string;
    tipo: string;
    descricao: string;
    prazoAte: Date;
  }): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.pendencia.create({
      data: {
        tenantId: tenantId ?? '',
        inscricaoId: dados.inscricaoId,
        tipo: dados.tipo,
        descricao: dados.descricao,
        prazoAte: dados.prazoAte,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async buscar(pendenciaId: string): Promise<PendenciaEstado | null> {
    return this.prisma.tx.pendencia.findUnique({
      where: { id: pendenciaId },
      select: { id: true, inscricaoId: true, situacao: true },
    });
  }

  async encerrar(
    pendenciaId: string,
    desfecho: 'RESOLVIDA' | 'DISPENSADA',
    arquivoKey?: string,
  ): Promise<void> {
    const ator = actorId();

    await this.prisma.tx.pendencia.update({
      where: { id: pendenciaId },
      data: {
        situacao: desfecho as SituacaoPendencia,
        resolvidaEm: new Date(),
        resolvidaPor: ator,
        arquivoKey: arquivoKey ?? null,
        updatedBy: ator,
      },
    });
  }

  async abertasDaInscricao(inscricaoId: string): Promise<number> {
    return this.prisma.tx.pendencia.count({
      where: {
        inscricaoId,
        situacao: { in: [SituacaoPendencia.ABERTA, SituacaoPendencia.VENCIDA] },
      },
    });
  }
}
