import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EncaminhamentoListado {
  id: string;
  numero: string;
  tipoSolicitacao: string;
  assunto: string;
  descricao: string;
  referenciaResumo: string;
  entidade: string;
  entidadeId: string;
  prazoAte: string;
  vencido: boolean;
  situacao: string;
  origem: { sigla: string; nome: string };
  destino: { sigla: string; nome: string };
  resposta: string | null;
  respondidoEm: string | null;
  anexoKey: string | null;
}

@Injectable()
export class SetoresQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Caixa de encaminhamentos.
   *
   * A mesma consulta serve para os dois lados: a Habitação vê o que enviou, o setor externo vê o
   * que recebeu — a RLS decide o que cada um enxerga, e não um `where` do aplicativo. Filtro de
   * autorização no SQL do app é filtro que alguém esquece na próxima query.
   */
  async caixa(filtro: { situacao?: string; entidade?: string; entidadeId?: string }) {
    const encaminhamentos = await this.prisma.tx.encaminhamento.findMany({
      where: {
        ...(filtro.situacao ? { situacao: filtro.situacao as never } : {}),
        ...(filtro.entidade ? { entidade: filtro.entidade } : {}),
        ...(filtro.entidadeId ? { entidadeId: filtro.entidadeId } : {}),
      },
      orderBy: [{ situacao: 'asc' }, { prazoAte: 'asc' }],
      take: 100,
      include: {
        setorOrigem: { select: { sigla: true, nome: true } },
        setorDestino: { select: { sigla: true, nome: true } },
      },
    });

    const agora = new Date();

    return encaminhamentos.map(
      (encaminhamento): EncaminhamentoListado => ({
        id: encaminhamento.id,
        numero: encaminhamento.numero,
        tipoSolicitacao: encaminhamento.tipoSolicitacao,
        assunto: encaminhamento.assunto,
        descricao: encaminhamento.descricao,
        referenciaResumo: encaminhamento.referenciaResumo,
        entidade: encaminhamento.entidade,
        entidadeId: encaminhamento.entidadeId,
        prazoAte: encaminhamento.prazoAte.toISOString(),
        vencido: encaminhamento.situacao === 'ABERTO' && encaminhamento.prazoAte < agora,
        situacao: encaminhamento.situacao,
        origem: encaminhamento.setorOrigem,
        destino: encaminhamento.setorDestino,
        resposta: encaminhamento.resposta,
        respondidoEm: encaminhamento.respondidoEm?.toISOString() ?? null,
        anexoKey: encaminhamento.anexoKey,
      }),
    );
  }
}
