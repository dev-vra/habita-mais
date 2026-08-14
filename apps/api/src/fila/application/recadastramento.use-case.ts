import { Inject, Injectable } from '@nestjs/common';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import { INSCRICOES_REPOSITORY, type InscricoesRepository } from '../domain/ports';
import { PrismaService } from '../../prisma/prisma.service';

/** Carência depois do vencimento da ficha antes de a inscrição ser baixada. */
const DIAS_DE_CARENCIA = 30;

export interface CandidataABaixa {
  inscricaoId: string;
  protocolo: string;
  familia: string;
  fichaVenceuEm: string;
  diasVencida: number;
}

/**
 * Recadastramento: revalida quem segue na fila e baixa quem não se apresentou (spec §6.1).
 *
 * A baixa nunca é automática. O caso de uso lista as candidatas e só executa quando o gestor
 * confirma — uma rotina que cancela inscrição sozinha, à meia-noite, é exatamente o tipo de coisa
 * que ninguém consegue explicar depois para a família que perdeu a vez.
 */
@Injectable()
export class RecadastramentoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async candidatas(programaId: string, agora: Date): Promise<CandidataABaixa[]> {
    const limite = new Date(agora);
    limite.setDate(limite.getDate() - DIAS_DE_CARENCIA);

    const inscricoes = await this.prisma.tx.inscricaoFila.findMany({
      where: {
        programaId,
        deletedAt: null,
        situacao: { in: ['APTA', 'PENDENTE'] },
        familia: { fichas: { some: { vigente: true, validaAte: { lt: limite } } } },
      },
      select: {
        id: true,
        protocolo: true,
        familia: {
          select: {
            responsavel: { select: { nome: true } },
            fichas: { where: { vigente: true }, take: 1, select: { validaAte: true } },
          },
        },
      },
    });

    const umDia = 24 * 60 * 60 * 1000;

    return inscricoes.flatMap((inscricao) => {
      const validaAte = inscricao.familia.fichas[0]?.validaAte;
      if (!validaAte) return [];

      return [
        {
          inscricaoId: inscricao.id,
          protocolo: inscricao.protocolo,
          familia: inscricao.familia.responsavel.nome,
          fichaVenceuEm: validaAte.toISOString(),
          diasVencida: Math.floor((agora.getTime() - validaAte.getTime()) / umDia),
        },
      ];
    });
  }

  /**
   * Baixa as inscrições confirmadas. Cada uma vai para CANCELADA com motivo — e CANCELADA reabre
   * para EM_ANALISE se a família se reapresentar, então a baixa não apaga o histórico dela.
   */
  async baixar(
    programaId: string,
    inscricaoIds: string[],
    agora: Date,
  ): Promise<{ baixadas: number }> {
    const candidatas = await this.candidatas(programaId, agora);
    const elegiveis = new Set(candidatas.map((candidata) => candidata.inscricaoId));
    const confirmadas = inscricaoIds.filter((id) => elegiveis.has(id));

    for (const inscricaoId of confirmadas) {
      await this.inscricoes.atualizarSituacao(
        inscricaoId,
        'CANCELADA',
        'Baixa por recadastramento: ficha social vencida e não revalidada.',
      );
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ProgramaHabitacional',
      entidadeId: programaId,
      diff: {
        acao: 'baixa_por_recadastramento',
        solicitadas: inscricaoIds.length,
        baixadas: confirmadas.length,
        // Divergência entre pedido e execução importa: alguém pode ter revalidado a ficha entre a
        // listagem e a confirmação, e essa família não pode ser baixada por causa da tela antiga.
        ignoradas: inscricaoIds.length - confirmadas.length,
      },
    });

    return { baixadas: confirmadas.length };
  }
}
