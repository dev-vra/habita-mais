import { Injectable } from '@nestjs/common';
import { SituacaoOcorrenciaUso } from '@prisma/client';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Situações da unidade que exigem acompanhamento — as mesmas do domínio, em forma de filtro. */
const EM_ACOMPANHAMENTO = habitacao.SITUACOES_UNIDADE.filter((situacao) =>
  habitacao.exigeAcompanhamento(situacao),
);

const EM_ABERTO = habitacao.SITUACOES_OCORRENCIA.filter((situacao) =>
  habitacao.ocorrenciaEmAberto(situacao),
) as unknown as SituacaoOcorrenciaUso[];

@Injectable()
export class PosEntregaQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private async periodicidade(): Promise<habitacao.Periodicidade> {
    const tenant = await this.prisma.tx.tenant.findFirst({ select: { parametros: true } });
    const parametros = (tenant?.parametros ?? {}) as {
      acompanhamento?: { prazoPrimeiraVisitaDias?: number; periodicidadeMeses?: number };
    };

    return {
      prazoPrimeiraVisitaDias: parametros.acompanhamento?.prazoPrimeiraVisitaDias,
      periodicidadeMeses: parametros.acompanhamento?.periodicidadeMeses,
    };
  }

  /**
   * Agenda do pós-entrega: cada unidade entregue com o estado do acompanhamento.
   *
   * Ordena pelo que está mais atrasado, não por nome: a lista existe para quem sai a campo decidir
   * a rota da semana, e a primeira linha precisa ser a família há mais tempo sem visita.
   */
  async agenda(filtro?: { situacao?: habitacao.SituacaoAcompanhamento }) {
    const [unidades, periodicidade] = await Promise.all([
      this.prisma.tx.unidadeHabitacional.findMany({
        where: { deletedAt: null, situacao: { in: EM_ACOMPANHAMENTO } },
        select: {
          id: true,
          protocolo: true,
          identificacao: true,
          endereco: true,
          situacao: true,
          entregueEm: true,
          empreendimento: { select: { id: true, nome: true, slug: true } },
          familia: {
            select: { id: true, codigo: true, responsavel: { select: { nome: true } } },
          },
          acompanhamentos: {
            where: { deletedAt: null },
            orderBy: { visitadaEm: 'desc' },
            take: 1,
            select: { id: true, protocolo: true, visitadaEm: true, residenciaConfirmada: true },
          },
          ocorrencias: {
            where: { deletedAt: null, situacao: { in: EM_ABERTO } },
            select: { id: true, tipo: true, gravidade: true, situacao: true },
          },
        },
      }),
      this.periodicidade(),
    ]);

    const agora = new Date();

    const linhas = unidades.map((unidade) => {
      const ultima = unidade.acompanhamentos[0];
      const avaliacao = habitacao.avaliarAcompanhamento(
        {
          entregueEm: unidade.entregueEm?.toISOString() ?? null,
          ultimaVisitaEm: ultima?.visitadaEm.toISOString() ?? null,
          exigeAcompanhamento: true,
        },
        agora,
        periodicidade,
      );

      return {
        unidadeId: unidade.id,
        protocolo: unidade.protocolo,
        identificacao: unidade.identificacao,
        endereco: unidade.endereco,
        situacaoUnidade: unidade.situacao,
        entregueEm: unidade.entregueEm?.toISOString() ?? null,
        empreendimento: unidade.empreendimento,
        familia: unidade.familia
          ? {
              id: unidade.familia.id,
              codigo: unidade.familia.codigo,
              responsavel: unidade.familia.responsavel.nome,
            }
          : null,
        ultimaVisita: ultima
          ? {
              id: ultima.id,
              protocolo: ultima.protocolo,
              visitadaEm: ultima.visitadaEm.toISOString(),
              residenciaConfirmada: ultima.residenciaConfirmada,
            }
          : null,
        ...avaliacao,
        ocorrenciasAbertas: unidade.ocorrencias.length,
        ocorrenciaMaisGrave: maisGrave(unidade.ocorrencias.map((o) => o.gravidade)),
      };
    });

    const visiveis = filtro?.situacao
      ? linhas.filter((linha) => linha.situacao === filtro.situacao)
      : linhas;

    return {
      itens: visiveis.sort((a, b) => (a.diasParaProxima ?? 0) - (b.diasParaProxima ?? 0)),
      resumo: {
        total: linhas.length,
        vencidas: linhas.filter((l) => l.situacao === 'VENCIDA').length,
        vencendo: linhas.filter((l) => l.situacao === 'VENCENDO').length,
        aguardandoPrimeira: linhas.filter((l) => l.situacao === 'AGUARDANDO_PRIMEIRA').length,
        emDia: linhas.filter((l) => l.situacao === 'EM_DIA').length,
        comOcorrenciaAberta: linhas.filter((l) => l.ocorrenciasAbertas > 0).length,
      },
      periodicidade: {
        prazoPrimeiraVisitaDias:
          periodicidade.prazoPrimeiraVisitaDias ?? habitacao.PRAZO_PRIMEIRA_VISITA_DIAS,
        periodicidadeMeses: periodicidade.periodicidadeMeses ?? habitacao.PERIODICIDADE_VISITA_MESES,
      },
    };
  }

  /** Histórico completo de uma unidade: visitas, eixos e ocorrências. */
  async historicoDaUnidade(unidadeId: string) {
    const [unidade, periodicidade] = await Promise.all([
      this.prisma.tx.unidadeHabitacional.findUnique({
        where: { id: unidadeId },
        select: {
          id: true,
          protocolo: true,
          identificacao: true,
          endereco: true,
          situacao: true,
          entregueEm: true,
          empreendimento: { select: { id: true, nome: true, slug: true } },
          familia: {
            select: { id: true, codigo: true, responsavel: { select: { nome: true } } },
          },
          acompanhamentos: {
            where: { deletedAt: null },
            orderBy: { visitadaEm: 'desc' },
            select: {
              id: true,
              protocolo: true,
              visitadaEm: true,
              tipo: true,
              tecnicoNome: true,
              residenciaConfirmada: true,
              quemReside: true,
              moradoresEncontrados: true,
              parecer: true,
              proximaVisitaEm: true,
              eixos: {
                select: { eixo: true, situacao: true, observacao: true },
              },
            },
          },
          ocorrencias: {
            where: { deletedAt: null },
            orderBy: { constatadaEm: 'desc' },
            select: {
              id: true,
              protocolo: true,
              tipo: true,
              gravidade: true,
              origem: true,
              situacao: true,
              descricao: true,
              constatadaEm: true,
              notificadaEm: true,
              prazoRegularizacaoAte: true,
              encerradaEm: true,
              motivoEncerramento: true,
            },
          },
        },
      }),
      this.periodicidade(),
    ]);

    if (!unidade) return null;

    const agora = new Date();
    const avaliacao = habitacao.avaliarAcompanhamento(
      {
        entregueEm: unidade.entregueEm?.toISOString() ?? null,
        ultimaVisitaEm: unidade.acompanhamentos[0]?.visitadaEm.toISOString() ?? null,
        exigeAcompanhamento: habitacao.exigeAcompanhamento(
          unidade.situacao as habitacao.SituacaoUnidade,
        ),
      },
      agora,
      periodicidade,
    );

    return {
      unidade: {
        id: unidade.id,
        protocolo: unidade.protocolo,
        identificacao: unidade.identificacao,
        endereco: unidade.endereco,
        situacao: unidade.situacao,
        entregueEm: unidade.entregueEm?.toISOString() ?? null,
        empreendimento: unidade.empreendimento,
        familia: unidade.familia
          ? {
              id: unidade.familia.id,
              codigo: unidade.familia.codigo,
              responsavel: unidade.familia.responsavel.nome,
            }
          : null,
      },
      acompanhamento: avaliacao,
      visitas: unidade.acompanhamentos.map((visita) => ({
        id: visita.id,
        protocolo: visita.protocolo,
        visitadaEm: visita.visitadaEm.toISOString(),
        tipo: visita.tipo,
        tecnicoNome: visita.tecnicoNome,
        residenciaConfirmada: visita.residenciaConfirmada,
        quemReside: visita.quemReside,
        moradoresEncontrados: visita.moradoresEncontrados,
        parecer: visita.parecer,
        proximaVisitaEm: visita.proximaVisitaEm?.toISOString() ?? null,
        eixos: visita.eixos,
      })),
      ocorrencias: unidade.ocorrencias.map((ocorrencia) => ({
        id: ocorrencia.id,
        protocolo: ocorrencia.protocolo,
        tipo: ocorrencia.tipo,
        gravidade: ocorrencia.gravidade,
        origem: ocorrencia.origem,
        situacao: ocorrencia.situacao,
        descricao: ocorrencia.descricao,
        constatadaEm: ocorrencia.constatadaEm.toISOString(),
        notificadaEm: ocorrencia.notificadaEm?.toISOString() ?? null,
        prazoRegularizacaoAte: ocorrencia.prazoRegularizacaoAte?.toISOString() ?? null,
        encerradaEm: ocorrencia.encerradaEm?.toISOString() ?? null,
        motivoEncerramento: ocorrencia.motivoEncerramento,
        transicoes: habitacao.transicoesOcorrencia(
          ocorrencia.situacao as habitacao.SituacaoOcorrencia,
        ),
        prazoVencido:
          ocorrencia.prazoRegularizacaoAte !== null &&
          ocorrencia.prazoRegularizacaoAte < agora &&
          habitacao.ocorrenciaEmAberto(ocorrencia.situacao as habitacao.SituacaoOcorrencia),
        encaminhamentoSugerido: habitacao.regraDaOcorrencia(
          ocorrencia.tipo as habitacao.TipoOcorrencia,
        ).encaminhamento,
      })),
    };
  }

  /**
   * Ocorrências que exigem decisão. É a fila de trabalho de quem tem DECIDIR_OCORRENCIA — separada
   * da agenda de visitas porque são pessoas diferentes com prazos diferentes.
   */
  async ocorrenciasEmAberto() {
    const ocorrencias = await this.prisma.tx.ocorrenciaUnidade.findMany({
      where: { deletedAt: null, situacao: { in: EM_ABERTO } },
      orderBy: [{ gravidade: 'desc' }, { constatadaEm: 'asc' }],
      select: {
        id: true,
        protocolo: true,
        tipo: true,
        gravidade: true,
        origem: true,
        situacao: true,
        descricao: true,
        constatadaEm: true,
        prazoRegularizacaoAte: true,
        unidade: {
          select: {
            id: true,
            identificacao: true,
            empreendimento: { select: { nome: true, slug: true } },
            familia: { select: { codigo: true, responsavel: { select: { nome: true } } } },
          },
        },
      },
    });

    const agora = new Date();

    return ocorrencias.map((ocorrencia) => ({
      id: ocorrencia.id,
      protocolo: ocorrencia.protocolo,
      tipo: ocorrencia.tipo,
      gravidade: ocorrencia.gravidade,
      origem: ocorrencia.origem,
      situacao: ocorrencia.situacao,
      descricao: ocorrencia.descricao,
      constatadaEm: ocorrencia.constatadaEm.toISOString(),
      prazoRegularizacaoAte: ocorrencia.prazoRegularizacaoAte?.toISOString() ?? null,
      prazoVencido:
        ocorrencia.prazoRegularizacaoAte !== null && ocorrencia.prazoRegularizacaoAte < agora,
      unidade: {
        id: ocorrencia.unidade.id,
        identificacao: ocorrencia.unidade.identificacao,
        empreendimento: ocorrencia.unidade.empreendimento,
        familia: ocorrencia.unidade.familia
          ? {
              codigo: ocorrencia.unidade.familia.codigo,
              responsavel: ocorrencia.unidade.familia.responsavel.nome,
            }
          : null,
      },
      transicoes: habitacao.transicoesOcorrencia(
        ocorrencia.situacao as habitacao.SituacaoOcorrencia,
      ),
    }));
  }
}

const ORDEM_GRAVIDADE = ['ADMINISTRATIVA', 'LEVE', 'GRAVE', 'GRAVISSIMA'];

function maisGrave(gravidades: string[]): string | null {
  if (gravidades.length === 0) return null;
  return gravidades.reduce((maior, atual) =>
    ORDEM_GRAVIDADE.indexOf(atual) > ORDEM_GRAVIDADE.indexOf(maior) ? atual : maior,
  );
}
