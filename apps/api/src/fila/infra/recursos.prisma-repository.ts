import { Injectable } from '@nestjs/common';
import { DecisaoRecurso, SituacaoInscricao as SituacaoPrisma } from '@prisma/client';
import type { SituacaoInscricao } from '@habita/shared/habitacao';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { RecursoEmAnalise, RecursosRepository } from '../domain/ports';

@Injectable()
export class RecursosPrismaRepository implements RecursosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: {
    inscricaoId: string;
    protocolo: string;
    motivo: string;
    situacaoAnterior: SituacaoInscricao;
    apresentadoPor: string;
    prazoRespostaAte: Date;
  }): Promise<{ id: string; protocolo: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.recurso.create({
      data: {
        tenantId: tenantId ?? '',
        inscricaoId: dados.inscricaoId,
        protocolo: dados.protocolo,
        motivo: dados.motivo,
        situacaoAnterior: dados.situacaoAnterior as SituacaoPrisma,
        apresentadoPor: dados.apresentadoPor,
        prazoRespostaAte: dados.prazoRespostaAte,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, protocolo: true },
    });
  }

  async buscar(recursoId: string): Promise<RecursoEmAnalise | null> {
    const recurso = await this.prisma.tx.recurso.findUnique({
      where: { id: recursoId },
      select: { id: true, inscricaoId: true, situacaoAnterior: true, decisao: true },
    });
    if (!recurso) return null;

    return {
      id: recurso.id,
      inscricaoId: recurso.inscricaoId,
      situacaoAnterior: recurso.situacaoAnterior as SituacaoInscricao,
      decidido: recurso.decisao !== null,
    };
  }

  async decidir(dados: {
    recursoId: string;
    decisao: string;
    fundamentacao: string;
  }): Promise<void> {
    const ator = actorId();

    await this.prisma.tx.recurso.update({
      where: { id: dados.recursoId },
      data: {
        decisao: dados.decisao as DecisaoRecurso,
        fundamentacao: dados.fundamentacao,
        decididoEm: new Date(),
        decididoPor: ator,
        updatedBy: ator,
      },
    });
  }
}
