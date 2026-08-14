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

  /** Detalhe operacional da inscrição: a tela onde o atendente trabalha o caso. */
  async inscricao(inscricaoId: string) {
    const inscricao = await this.prisma.tx.inscricaoFila.findFirst({
      where: { id: inscricaoId, deletedAt: null },
      include: {
        programa: { select: { id: true, nome: true, slug: true, situacao: true } },
        familia: {
          select: {
            id: true,
            codigo: true,
            responsavel: { select: { nome: true } },
            fichas: { where: { vigente: true }, take: 1, select: { validaAte: true } },
          },
        },
        snapshots: {
          where: { vigente: true },
          take: 1,
          include: { versaoCriterio: { select: { versao: true } } },
        },
        pendencias: { orderBy: { prazoAte: 'asc' } },
        convocacoes: { orderBy: { emitidaEm: 'desc' } },
        recursos: { orderBy: { apresentadoEm: 'desc' } },
      },
    });
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');

    const snapshot = inscricao.snapshots[0];

    return {
      id: inscricao.id,
      protocolo: inscricao.protocolo,
      situacao: inscricao.situacao,
      motivoSituacao: inscricao.motivoSituacao,
      inscritaEm: inscricao.inscritaEm.toISOString(),
      programa: inscricao.programa,
      familia: {
        id: inscricao.familia.id,
        codigo: inscricao.familia.codigo,
        responsavel: inscricao.familia.responsavel.nome,
        fichaValidaAte: inscricao.familia.fichas[0]?.validaAte.toISOString() ?? null,
      },
      pontuacao: snapshot
        ? {
            total: Number(snapshot.total),
            totalMaximo: Number(snapshot.totalMaximo),
            versaoCriterio: snapshot.versaoCriterio.versao,
            calculadaEm: snapshot.calculadoEm.toISOString(),
            itens: snapshot.itens,
          }
        : null,
      pendencias: inscricao.pendencias.map((pendencia) => ({
        id: pendencia.id,
        tipo: pendencia.tipo,
        descricao: pendencia.descricao,
        prazoAte: pendencia.prazoAte.toISOString(),
        situacao: pendencia.situacao,
        vencida: pendencia.situacao === 'ABERTA' && pendencia.prazoAte < new Date(),
      })),
      convocacoes: inscricao.convocacoes.map((convocacao) => ({
        id: convocacao.id,
        numeroOficio: convocacao.numeroOficio,
        emitidaEm: convocacao.emitidaEm.toISOString(),
        prazoComparecimentoAte: convocacao.prazoComparecimentoAte.toISOString(),
        foraDeOrdem: convocacao.foraDeOrdem,
        motivoExcecao: convocacao.motivoExcecao,
        desfecho: convocacao.desfecho,
      })),
      recursos: inscricao.recursos.map((recurso) => ({
        id: recurso.id,
        protocolo: recurso.protocolo,
        apresentadoEm: recurso.apresentadoEm.toISOString(),
        prazoRespostaAte: recurso.prazoRespostaAte.toISOString(),
        decisao: recurso.decisao,
      })),
    };
  }

  /** Pendências abertas do município — a fila de trabalho do balcão. */
  async pendenciasAbertas() {
    const pendencias = await this.prisma.tx.pendencia.findMany({
      where: { situacao: { in: ['ABERTA', 'VENCIDA'] } },
      orderBy: { prazoAte: 'asc' },
      take: 100,
      include: {
        inscricao: {
          select: {
            id: true,
            protocolo: true,
            familia: { select: { responsavel: { select: { nome: true } } } },
            programa: { select: { nome: true } },
          },
        },
      },
    });

    return pendencias.map((pendencia) => ({
      id: pendencia.id,
      tipo: pendencia.tipo,
      descricao: pendencia.descricao,
      prazoAte: pendencia.prazoAte.toISOString(),
      vencida: pendencia.prazoAte < new Date(),
      inscricaoId: pendencia.inscricao.id,
      protocolo: pendencia.inscricao.protocolo,
      responsavel: pendencia.inscricao.familia.responsavel.nome,
      programa: pendencia.inscricao.programa.nome,
    }));
  }

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
