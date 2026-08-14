import { Injectable } from '@nestjs/common';
import { DesfechoConvocacao } from '@prisma/client';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { ConvocacoesRepository } from '../domain/ports';
import type { ConvocacaoRegistrada, ItemRankingParaGravar, NovaConvocacao } from '../domain/tipos';

@Injectable()
export class ConvocacoesPrismaRepository implements ConvocacoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async publicarRanking(dados: {
    programaId: string;
    versaoCriterioId: string;
    prazoRecursoAte: Date;
    itens: ItemRankingParaGravar[];
  }): Promise<{ id: string; total: number }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    const publicacao = await this.prisma.tx.rankingPublicacao.create({
      data: {
        tenantId: tenantId ?? '',
        programaId: dados.programaId,
        versaoCriterioId: dados.versaoCriterioId,
        prazoRecursoAte: dados.prazoRecursoAte,
        publicadoPor: ator,
        createdBy: ator,
      },
      select: { id: true },
    });

    await this.prisma.tx.rankingItem.createMany({
      data: dados.itens.map((item) => ({
        tenantId: tenantId ?? '',
        publicacaoId: publicacao.id,
        inscricaoId: item.inscricaoId,
        posicao: item.posicao,
        protocolo: item.protocolo,
        pontuacao: item.pontuacao,
      })),
    });

    return { id: publicacao.id, total: dados.itens.length };
  }

  async criarConvocacao(dados: NovaConvocacao): Promise<ConvocacaoRegistrada> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    const convocacao = await this.prisma.tx.convocacao.create({
      data: {
        tenantId: tenantId ?? '',
        inscricaoId: dados.inscricaoId,
        numeroOficio: dados.numeroOficio,
        prazoComparecimentoAte: dados.prazoComparecimentoAte,
        emitidaPor: ator,
        foraDeOrdem: dados.foraDeOrdem,
        motivoExcecao: dados.motivoExcecao ?? null,
        // Quem autorizou a exceção é o próprio ator: a capacidade foi concedida a ele, e é o nome
        // dele que aparece na publicação junto ao ranking.
        autorizadaPor: dados.foraDeOrdem ? ator : null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, inscricaoId: true, desfecho: true },
    });

    return { id: convocacao.id, inscricaoId: convocacao.inscricaoId, desfecho: null };
  }

  async buscarConvocacao(id: string): Promise<ConvocacaoRegistrada | null> {
    const convocacao = await this.prisma.tx.convocacao.findUnique({
      where: { id },
      select: { id: true, inscricaoId: true, desfecho: true },
    });
    return convocacao;
  }

  async registrarDesfecho(dados: {
    convocacaoId: string;
    desfecho: string;
    motivo?: string;
  }): Promise<void> {
    const ator = actorId();

    await this.prisma.tx.convocacao.update({
      where: { id: dados.convocacaoId },
      data: {
        desfecho: dados.desfecho as DesfechoConvocacao,
        desfechoEm: new Date(),
        desfechoPor: ator,
        motivoDesfecho: dados.motivo ?? null,
        updatedBy: ator,
      },
    });
  }

  async contarForaDeOrdem(programaId: string): Promise<number> {
    return this.prisma.tx.convocacao.count({
      where: { foraDeOrdem: true, inscricao: { programaId } },
    });
  }
}
