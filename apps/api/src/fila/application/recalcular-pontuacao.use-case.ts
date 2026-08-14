import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  INSCRICOES_REPOSITORY,
  PROGRAMAS_REPOSITORY,
  TRILHA_AUDITORIA,
  type InscricoesRepository,
  type ProgramasRepository,
  type TrilhaAuditoria,
} from '../domain/ports';
import type { InscricaoParaCalculo, VersaoPublicada } from '../domain/tipos';

export interface RecalculoSaida {
  inscricaoId: string;
  protocolo: string;
  total: number;
}

/**
 * Recalcula a pontuação — de uma inscrição ou de todo o programa.
 *
 * Recalcular nunca sobrescreve: cada cálculo cria um snapshot novo e aposenta o anterior, com a
 * versão de critério que valia. É o que permite dizer, meses depois, sob qual regra cada família
 * foi classificada — e é o que impede que mudar um peso reordene a fila retroativamente sem rastro.
 *
 * Quem já foi convocado não é recalculado: a nota que fundamentou a chamada continua sendo a nota
 * daquela chamada (spec §6.1).
 */
@Injectable()
export class RecalcularPontuacaoUseCase {
  constructor(
    @Inject(PROGRAMAS_REPOSITORY) private readonly programas: ProgramasRepository,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async umaInscricao(inscricaoId: string, programaId: string, agora: Date): Promise<RecalculoSaida> {
    const versao = await this.exigirVersaoPublicada(programaId);
    const inscricao = await this.inscricoes.buscarParaCalculo(inscricaoId);
    if (!inscricao) throw new NotFoundException('Inscrição sem ficha social vigente.');

    return this.recalcular(inscricao, versao, agora, 'ATUALIZACAO_FICHA');
  }

  /** Recálculo em lote — capacidade sensível (§5), confirmada no controller antes de chegar aqui. */
  async programaInteiro(programaId: string, agora: Date): Promise<RecalculoSaida[]> {
    const versao = await this.exigirVersaoPublicada(programaId);
    const inscricoes = await this.inscricoes.listarParaCalculo(programaId);

    const recalculaveis = inscricoes.filter(
      (inscricao) => !INTOCAVEIS.includes(inscricao.situacao),
    );

    const resultados: RecalculoSaida[] = [];
    for (const inscricao of recalculaveis) {
      resultados.push(await this.recalcular(inscricao, versao, agora, 'RECALCULO_LOTE'));
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ProgramaHabitacional',
      entidadeId: programaId,
      diff: {
        acao: 'recalculo_em_lote',
        versaoCriterio: versao.versao,
        recalculadas: resultados.length,
        preservadas: inscricoes.length - resultados.length,
      },
    });

    return resultados;
  }

  private async recalcular(
    inscricao: InscricaoParaCalculo,
    versao: VersaoPublicada,
    agora: Date,
    motivo: string,
  ): Promise<RecalculoSaida> {
    const calculo = habitacao.calcularPontuacao(
      { versao: versao.versao, publicadoEm: versao.publicadoEm, criterios: versao.criterios },
      inscricao.fatos,
      agora.toISOString(),
    );

    await this.inscricoes.registrarSnapshot({
      inscricaoId: inscricao.id,
      versaoCriterioId: versao.id,
      total: calculo.total,
      totalMaximo: calculo.totalMaximo,
      itens: calculo.itens,
      fatos: inscricao.fatos,
      motivo,
    });

    return { inscricaoId: inscricao.id, protocolo: inscricao.protocolo, total: calculo.total };
  }

  private async exigirVersaoPublicada(programaId: string): Promise<VersaoPublicada> {
    const versao = await this.programas.versaoPublicada(programaId);
    if (!versao) {
      throw new BadRequestException('O programa não tem versão de critério publicada.');
    }
    return versao;
  }
}

/** Situações cuja nota não se toca: a chamada e a contemplação congelaram o que valia. */
const INTOCAVEIS = ['CONVOCADA', 'CONTEMPLADA', 'DESISTENTE', 'CANCELADA'] as const as readonly string[];
