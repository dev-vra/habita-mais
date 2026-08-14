import { Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface LinhaDaFila {
  posicao: number;
  inscricaoId: string;
  protocolo: string;
  responsavel: string;
  composicao: { pessoas: number; menores: number };
  rendaPerCapita: number;
  pontuacao: number;
  situacao: string;
  calculadaEm: string | null;
  versaoCriterio: number | null;
}

export interface FilaDoPrograma {
  programa: { id: string; nome: string; slug: string; vagas: number; situacao: string };
  versaoVigente: number | null;
  convocacoesForaDeOrdem: number;
  linhas: LinhaDaFila[];
}

/**
 * Leitura da fila para a tela do gestor. Ordena pelo snapshot vigente usando a MESMA regra de
 * desempate do ranking publicado — se a listagem operacional discordasse da publicação, a tela
 * viraria a planilha que o produto veio substituir.
 */
@Injectable()
export class FilaQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async doPrograma(programaId: string): Promise<FilaDoPrograma> {
    const programa = await this.prisma.tx.programaHabitacional.findFirst({
      where: { id: programaId, deletedAt: null },
      select: { id: true, nome: true, slug: true, vagas: true, situacao: true },
    });
    if (!programa) throw new NotFoundException('Programa não encontrado.');

    const inscricoes = await this.prisma.tx.inscricaoFila.findMany({
      where: { programaId, deletedAt: null },
      include: {
        familia: {
          include: {
            responsavel: { select: { nome: true } },
            fichas: { where: { vigente: true }, take: 1 },
          },
        },
        snapshots: {
          where: { vigente: true },
          take: 1,
          include: { versaoCriterio: { select: { versao: true } } },
        },
      },
    });

    const classificados = habitacao.classificarFila(
      inscricoes.map((inscricao) => ({
        inscricaoId: inscricao.id,
        protocolo: inscricao.protocolo,
        pontuacao: Number(inscricao.snapshots[0]?.total ?? 0),
        inscritaEm: inscricao.inscritaEm.toISOString(),
        mesesResidenciaMunicipio: inscricao.familia.fichas[0]?.mesesResidenciaMunicipio ?? 0,
        apta: habitacao.ocupaPosicaoNaFila(inscricao.situacao),
      })),
    );

    const porInscricao = new Map(inscricoes.map((inscricao) => [inscricao.id, inscricao]));
    const linhas = classificados.map((item): LinhaDaFila => {
      const inscricao = porInscricao.get(item.inscricaoId);
      const ficha = inscricao?.familia.fichas[0];
      const snapshot = inscricao?.snapshots[0];

      return {
        posicao: item.posicao,
        inscricaoId: item.inscricaoId,
        protocolo: item.protocolo,
        responsavel: inscricao?.familia.responsavel.nome ?? '',
        composicao: {
          pessoas: ficha?.quantidadePessoas ?? 0,
          menores: ficha?.quantidadeMenores ?? 0,
        },
        rendaPerCapita: Number(ficha?.rendaPerCapita ?? 0),
        pontuacao: item.pontuacao,
        situacao: inscricao?.situacao ?? '',
        calculadaEm: snapshot?.calculadoEm.toISOString() ?? null,
        versaoCriterio: snapshot?.versaoCriterio.versao ?? null,
      };
    });

    const versao = await this.prisma.tx.versaoCriterio.findFirst({
      where: { programaId, situacao: 'PUBLICADA' },
      orderBy: { versao: 'desc' },
      select: { versao: true },
    });

    const convocacoesForaDeOrdem = await this.prisma.tx.convocacao.count({
      where: { foraDeOrdem: true, inscricao: { programaId } },
    });

    return {
      programa,
      versaoVigente: versao?.versao ?? null,
      convocacoesForaDeOrdem,
      linhas,
    };
  }
}
