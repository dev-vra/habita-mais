import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  CONVOCACOES_REPOSITORY,
  INSCRICOES_REPOSITORY,
  PROGRAMAS_REPOSITORY,
  TRILHA_AUDITORIA,
  type ConvocacoesRepository,
  type InscricoesRepository,
  type ProgramasRepository,
  type TrilhaAuditoria,
} from '../domain/ports';

export interface PublicarRankingSaida {
  publicacaoId: string;
  classificadas: number;
  prazoRecursoAte: Date;
}

/**
 * Publica o ranking — ato formal que abre o prazo de recurso.
 *
 * A lista publicada é congelada em itens próprios, e não recalculada na leitura: se a nota de
 * alguém mudar amanhã, a publicação de hoje continua existindo exatamente como saiu. Sem isso,
 * "o ranking mudou" e "o ranking sempre foi assim" seriam indistinguíveis.
 */
@Injectable()
export class PublicarRankingUseCase {
  constructor(
    @Inject(PROGRAMAS_REPOSITORY) private readonly programas: ProgramasRepository,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(CONVOCACOES_REPOSITORY) private readonly convocacoes: ConvocacoesRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async executar(programaId: string, prazoRecursoAte: Date): Promise<PublicarRankingSaida> {
    const versao = await this.programas.versaoPublicada(programaId);
    if (!versao) throw new BadRequestException('O programa não tem versão de critério publicada.');

    const inscricoes = await this.inscricoes.listarParaCalculo(programaId);
    const classificados = habitacao.classificarFila(
      inscricoes.map((inscricao) => ({
        inscricaoId: inscricao.id,
        protocolo: inscricao.protocolo,
        pontuacao: inscricao.pontuacaoVigente,
        inscritaEm: inscricao.inscritaEm.toISOString(),
        mesesResidenciaMunicipio: inscricao.mesesResidenciaMunicipio,
        apta: habitacao.ocupaPosicaoNaFila(inscricao.situacao),
      })),
    );

    if (classificados.length === 0) {
      throw new BadRequestException('Não há inscrição apta para publicar.');
    }

    const publicacao = await this.convocacoes.publicarRanking({
      programaId,
      versaoCriterioId: versao.id,
      prazoRecursoAte,
      itens: classificados.map((item) => ({
        inscricaoId: item.inscricaoId,
        protocolo: item.protocolo,
        posicao: item.posicao,
        pontuacao: item.pontuacao,
      })),
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'RankingPublicacao',
      entidadeId: publicacao.id,
      diff: {
        programaId,
        versaoCriterio: versao.versao,
        classificadas: publicacao.total,
        prazoRecursoAte: prazoRecursoAte.toISOString(),
      },
    });

    return { publicacaoId: publicacao.id, classificadas: publicacao.total, prazoRecursoAte };
  }
}
