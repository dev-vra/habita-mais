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

export interface ProgramaResumo {
  id: string;
  nome: string;
  slug: string;
  vagas: number;
  situacao: string;
}

export interface FilaDoPrograma {
  programa: ProgramaResumo;
  versaoVigente: number | null;
  convocacoesForaDeOrdem: number;
  linhas: LinhaDaFila[];
}

export interface ResumoPainel {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  convocacoesForaDeOrdem: number;
  programas: ProgramaResumo[];
}

/**
 * Leitura da fila para a tela do gestor. Ordena pelo snapshot vigente usando a MESMA regra de
 * desempate do ranking publicado — se a listagem operacional discordasse da publicação, a tela
 * viraria a planilha que o produto veio substituir.
 */
@Injectable()
export class FilaQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resumo do painel: os números que o gestor pergunta na segunda-feira (Identidade §5). */
  async resumo(): Promise<ResumoPainel> {
    const [familias, aptas, aguardandoConvocacao, foraDeOrdem, programas] = await Promise.all([
      this.prisma.tx.familia.count({ where: { deletedAt: null } }),
      this.prisma.tx.inscricaoFila.count({ where: { situacao: 'APTA', deletedAt: null } }),
      this.prisma.tx.inscricaoFila.count({ where: { situacao: 'CONVOCADA', deletedAt: null } }),
      this.prisma.tx.convocacao.count({ where: { foraDeOrdem: true } }),
      this.prisma.tx.programaHabitacional.findMany({
        where: { deletedAt: null },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, slug: true, vagas: true, situacao: true },
      }),
    ]);

    return { familias, aptas, aguardandoConvocacao, convocacoesForaDeOrdem: foraDeOrdem, programas };
  }

  /** Aceita id ou slug: a URL da tela é /fila/residencial-bela-vista, não um cuid. */
  async doPrograma(idOuSlug: string): Promise<FilaDoPrograma> {
    const programa = await this.prisma.tx.programaHabitacional.findFirst({
      where: { OR: [{ id: idOuSlug }, { slug: idOuSlug }], deletedAt: null },
      select: { id: true, nome: true, slug: true, vagas: true, situacao: true },
    });
    if (!programa) throw new NotFoundException('Programa não encontrado.');

    const programaId = programa.id;

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
