import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface SituacaoDoMunicipe {
  protocolo: string;
  programa: string;
  inscritaEm: string;
  situacao: string;
  posicao: number | null;
  totalClassificadas: number | null;
  pontuacao: { total: number; totalMaximo: number; calculadaEm: string } | null;
  comoAnotaEFeita: { rotulo: string; pontos: number; peso: number; observacao?: string }[];
  documentos: { tipo: string; descricao: string; prazoAte: string; situacao: string }[];
  linhaDoTempo: { quando: string; titulo: string; detalhe: string }[];
  recursoEmAnalise: { protocolo: string; prazoRespostaAte: string } | null;
  podeRecorrer: boolean;
}

@Injectable()
export class MunicipeQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Situação da própria família.
   *
   * A posição sai do ranking PUBLICADO, não de um cálculo na hora: a família precisa ver o mesmo
   * número que a prefeitura publicou, e não uma posição que muda a cada refresh. Enquanto não há
   * publicação, a posição fica nula em vez de inventada.
   */
  async situacao(familiaId: string): Promise<SituacaoDoMunicipe> {
    const inscricao = await this.prisma.tx.inscricaoFila.findFirst({
      where: { familiaId, deletedAt: null },
      orderBy: { inscritaEm: 'desc' },
      include: {
        programa: { select: { id: true, nome: true } },
        snapshots: { where: { vigente: true }, take: 1 },
        pendencias: { orderBy: { prazoAte: 'asc' } },
        recursos: { orderBy: { apresentadoEm: 'desc' } },
        convocacoes: { orderBy: { emitidaEm: 'desc' } },
        itensRanking: {
          orderBy: { publicacao: { publicadoEm: 'desc' } },
          take: 1,
          include: {
            publicacao: {
              select: { publicadoEm: true, prazoRecursoAte: true, totalClassificadas: true },
            },
          },
        },
      },
    });
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');

    const snapshot = inscricao.snapshots[0];
    const itemRanking = inscricao.itensRanking[0];
    const recursoAberto = inscricao.recursos.find((recurso) => recurso.decisao === null);

    return {
      protocolo: inscricao.protocolo,
      programa: inscricao.programa.nome,
      inscritaEm: inscricao.inscritaEm.toISOString(),
      situacao: inscricao.situacao,
      posicao: itemRanking?.posicao ?? null,
      totalClassificadas: itemRanking?.publicacao.totalClassificadas ?? null,
      pontuacao: snapshot
        ? {
            total: Number(snapshot.total),
            totalMaximo: Number(snapshot.totalMaximo),
            calculadaEm: snapshot.calculadoEm.toISOString(),
          }
        : null,
      comoAnotaEFeita: (snapshot?.itens ?? []) as SituacaoDoMunicipe['comoAnotaEFeita'],
      documentos: inscricao.pendencias.map((pendencia) => ({
        tipo: pendencia.tipo,
        descricao: pendencia.descricao,
        prazoAte: pendencia.prazoAte.toISOString(),
        situacao: pendencia.situacao,
      })),
      linhaDoTempo: this.montarLinhaDoTempo(inscricao),
      recursoEmAnalise: recursoAberto
        ? {
            protocolo: recursoAberto.protocolo,
            prazoRespostaAte: recursoAberto.prazoRespostaAte.toISOString(),
          }
        : null,
      // Recorrer exige classificação publicada e nenhum recurso em análise — contestar duas vezes
      // a mesma coisa não acelera a resposta, só confunde o prazo.
      podeRecorrer: Boolean(itemRanking) && !recursoAberto,
    };
  }

  async inscricaoAtiva(familiaId: string): Promise<string> {
    const inscricao = await this.prisma.tx.inscricaoFila.findFirst({
      where: { familiaId, deletedAt: null },
      orderBy: { inscritaEm: 'desc' },
      select: { id: true, situacao: true, recursos: { where: { decisao: null }, select: { id: true } } },
    });
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');
    if (inscricao.recursos.length > 0) {
      throw new BadRequestException('Já existe um recurso seu em análise para esta inscrição.');
    }
    if (!habitacao.podeTransicionar(inscricao.situacao as never, 'EM_RECURSO')) {
      throw new BadRequestException('Não cabe recurso na situação atual da sua inscrição.');
    }

    return inscricao.id;
  }

  private montarLinhaDoTempo(inscricao: {
    inscritaEm: Date;
    protocolo: string;
    snapshots: { total: unknown; calculadoEm: Date }[];
    recursos: { protocolo: string; apresentadoEm: Date; decisao: string | null }[];
    convocacoes: { emitidaEm: Date; prazoComparecimentoAte: Date }[];
    pendencias: { tipo: string; resolvidaEm: Date | null }[];
  }): SituacaoDoMunicipe['linhaDoTempo'] {
    const eventos: SituacaoDoMunicipe['linhaDoTempo'] = [
      {
        quando: inscricao.inscritaEm.toISOString(),
        titulo: 'Inscrição aprovada',
        detalhe: inscricao.protocolo,
      },
    ];

    for (const snapshot of inscricao.snapshots) {
      eventos.push({
        quando: snapshot.calculadoEm.toISOString(),
        titulo: 'Pontuação atualizada',
        detalhe: `${Number(snapshot.total)} pontos`,
      });
    }
    for (const convocacao of inscricao.convocacoes) {
      eventos.push({
        quando: convocacao.emitidaEm.toISOString(),
        titulo: 'Você foi convocada',
        detalhe: `Comparecer até ${convocacao.prazoComparecimentoAte.toLocaleDateString('pt-BR')}`,
      });
    }
    for (const recurso of inscricao.recursos) {
      eventos.push({
        quando: recurso.apresentadoEm.toISOString(),
        titulo: recurso.decisao ? 'Seu recurso foi respondido' : 'Seu recurso foi recebido',
        detalhe: recurso.protocolo,
      });
    }
    for (const pendencia of inscricao.pendencias) {
      if (pendencia.resolvidaEm) {
        eventos.push({
          quando: pendencia.resolvidaEm.toISOString(),
          titulo: 'Documento recebido',
          detalhe: pendencia.tipo,
        });
      }
    }

    return eventos.sort((a, b) => b.quando.localeCompare(a.quando));
  }
}
