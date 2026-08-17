import { Injectable } from '@nestjs/common';
import { FaseRetomada } from '@prisma/client';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

const EM_ANDAMENTO: FaseRetomada[] = [
  FaseRetomada.ABERTO,
  FaseRetomada.NOTIFICADO,
  FaseRetomada.EM_DEFESA,
  FaseRetomada.EM_ANALISE,
  FaseRetomada.DECIDIDO,
];

@Injectable()
export class RetomadaQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Processos em andamento.
   *
   * Ordena por prazo de defesa: o que vence antes é o que precisa de atenção antes — decidir com
   * prazo em curso anula o processo, e deixar o prazo vencer sem seguir engaveta a família.
   */
  async listar(incluirEncerrados = false) {
    const casos = await this.prisma.tx.casoRetomada.findMany({
      where: {
        deletedAt: null,
        ...(incluirEncerrados ? {} : { fase: { in: EM_ANDAMENTO } }),
      },
      orderBy: [{ prazoDefesaAte: 'asc' }, { abertoEm: 'asc' }],
      select: {
        id: true,
        protocolo: true,
        fase: true,
        descricao: true,
        abertoEm: true,
        notificadoEm: true,
        formaNotificacao: true,
        tentativasFrustradas: true,
        prazoDefesaAte: true,
        defesaApresentadaEm: true,
        decisao: true,
        decididoEm: true,
        unidade: {
          select: {
            id: true,
            identificacao: true,
            situacao: true,
            empreendimento: { select: { nome: true, slug: true } },
            familia: { select: { id: true, codigo: true, responsavel: { select: { nome: true } } } },
          },
        },
        ocorrencia: { select: { id: true, protocolo: true, tipo: true, gravidade: true } },
      },
    });

    const agora = new Date();

    return casos.map((caso) => {
      const avaliacao = habitacao.avaliarCaso(
        {
          fase: caso.fase as habitacao.FaseRetomada,
          notificadoEm: caso.notificadoEm?.toISOString() ?? null,
          formaNotificacao: (caso.formaNotificacao as habitacao.FormaNotificacao | null) ?? null,
          tentativasFrustradas: caso.tentativasFrustradas,
          prazoDefesaAte: caso.prazoDefesaAte?.toISOString() ?? null,
          defesaApresentadaEm: caso.defesaApresentadaEm?.toISOString() ?? null,
        },
        agora,
      );

      return {
        id: caso.id,
        protocolo: caso.protocolo,
        fase: caso.fase,
        descricao: caso.descricao,
        abertoEm: caso.abertoEm.toISOString(),
        notificadoEm: caso.notificadoEm?.toISOString() ?? null,
        formaNotificacao: caso.formaNotificacao,
        prazoDefesaAte: caso.prazoDefesaAte?.toISOString() ?? null,
        defesaApresentadaEm: caso.defesaApresentadaEm?.toISOString() ?? null,
        decisao: caso.decisao,
        decididoEm: caso.decididoEm?.toISOString() ?? null,
        unidade: {
          id: caso.unidade.id,
          identificacao: caso.unidade.identificacao,
          situacao: caso.unidade.situacao,
          empreendimento: caso.unidade.empreendimento,
          familia: caso.unidade.familia
            ? {
                id: caso.unidade.familia.id,
                codigo: caso.unidade.familia.codigo,
                responsavel: caso.unidade.familia.responsavel.nome,
              }
            : null,
        },
        ocorrencia: caso.ocorrencia,
        ...avaliacao,
        transicoes: habitacao.transicoesCaso(caso.fase as habitacao.FaseRetomada),
      };
    });
  }

  async detalhe(casoId: string) {
    const caso = await this.prisma.tx.casoRetomada.findUnique({
      where: { id: casoId },
      select: {
        id: true,
        protocolo: true,
        fase: true,
        fundamentacaoLegal: true,
        descricao: true,
        abertoEm: true,
        notificadoEm: true,
        formaNotificacao: true,
        comprovanteKey: true,
        tentativasFrustradas: true,
        prazoDefesaAte: true,
        defesaApresentadaEm: true,
        defesaTeor: true,
        defesaApresentadaPor: true,
        defesaArquivoKey: true,
        decisao: true,
        decididoEm: true,
        decididoPor: true,
        fundamentacaoDecisao: true,
        encerradoEm: true,
        motivoEncerramento: true,
        unidade: {
          select: {
            id: true,
            identificacao: true,
            endereco: true,
            situacao: true,
            entregueEm: true,
            empreendimento: { select: { nome: true, slug: true } },
            familia: { select: { id: true, codigo: true, responsavel: { select: { nome: true } } } },
          },
        },
        ocorrencia: {
          select: { id: true, protocolo: true, tipo: true, gravidade: true, descricao: true },
        },
        atos: {
          orderBy: { ordem: 'asc' },
          select: { id: true, ordem: true, ocorridoEm: true, titulo: true, detalhe: true, autor: true },
        },
      },
    });

    if (!caso) return null;

    const avaliacao = habitacao.avaliarCaso(
      {
        fase: caso.fase as habitacao.FaseRetomada,
        notificadoEm: caso.notificadoEm?.toISOString() ?? null,
        formaNotificacao: (caso.formaNotificacao as habitacao.FormaNotificacao | null) ?? null,
        tentativasFrustradas: caso.tentativasFrustradas,
        prazoDefesaAte: caso.prazoDefesaAte?.toISOString() ?? null,
        defesaApresentadaEm: caso.defesaApresentadaEm?.toISOString() ?? null,
      },
      new Date(),
    );

    return {
      ...caso,
      abertoEm: caso.abertoEm.toISOString(),
      notificadoEm: caso.notificadoEm?.toISOString() ?? null,
      prazoDefesaAte: caso.prazoDefesaAte?.toISOString() ?? null,
      defesaApresentadaEm: caso.defesaApresentadaEm?.toISOString() ?? null,
      decididoEm: caso.decididoEm?.toISOString() ?? null,
      encerradoEm: caso.encerradoEm?.toISOString() ?? null,
      unidade: {
        ...caso.unidade,
        entregueEm: caso.unidade.entregueEm?.toISOString() ?? null,
        familia: caso.unidade.familia
          ? {
              id: caso.unidade.familia.id,
              codigo: caso.unidade.familia.codigo,
              responsavel: caso.unidade.familia.responsavel.nome,
            }
          : null,
      },
      atos: caso.atos.map((ato) => ({ ...ato, ocorridoEm: ato.ocorridoEm.toISOString() })),
      avaliacao: {
        ...avaliacao,
        // Texto pronto para a tela: cada impedimento explica por que o botão não está disponível.
        motivos: avaliacao.impedimentos.map(
          (impedimento) => habitacao.MOTIVOS_IMPEDIMENTO[impedimento],
        ),
      },
      exigenciasPilha: habitacao.EXIGENCIAS_PILHA_RETOMADA,
    };
  }
}
