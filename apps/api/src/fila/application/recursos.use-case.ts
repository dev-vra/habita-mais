import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import type { SituacaoInscricao } from '@habita/shared/habitacao';
import {
  GERADOR_PROTOCOLO,
  INSCRICOES_REPOSITORY,
  RECURSOS_REPOSITORY,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type InscricoesRepository,
  type RecursosRepository,
  type TrilhaAuditoria,
} from '../domain/ports';

const TAMANHO_MINIMO_FUNDAMENTACAO = 30;

export interface InterporEntrada {
  inscricaoId: string;
  motivo: string;
  apresentadoPor: string;
  prazoRespostaAte: Date;
  agora: Date;
}

export interface DecidirEntrada {
  recursoId: string;
  decisao: 'DEFERIDO' | 'INDEFERIDO' | 'PARCIALMENTE_DEFERIDO';
  fundamentacao: string;
}

/**
 * Recurso contra a classificação — entidade de primeira classe (spec §8).
 *
 * Duas garantias moram aqui: a família continua classificada enquanto o recurso corre, e o
 * indeferimento a devolve exatamente ao estado anterior. Recorrer nunca pode custar posição.
 */
@Injectable()
export class RecursosUseCase {
  constructor(
    @Inject(RECURSOS_REPOSITORY) private readonly recursos: RecursosRepository,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolos: GeradorProtocolo,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async interpor(entrada: InterporEntrada): Promise<{ recursoId: string; protocolo: string }> {
    const inscricao = await this.inscricoes.buscarParaCalculo(entrada.inscricaoId);
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');

    if (!habitacao.podeTransicionar(inscricao.situacao, 'EM_RECURSO')) {
      throw new BadRequestException(
        `Não cabe recurso para inscrição em situação ${inscricao.situacao}.`,
      );
    }

    const protocolo = await this.protocolos.proximo('REC', entrada.agora.getFullYear());
    const recurso = await this.recursos.criar({
      inscricaoId: entrada.inscricaoId,
      protocolo,
      motivo: entrada.motivo,
      situacaoAnterior: inscricao.situacao,
      apresentadoPor: entrada.apresentadoPor,
      prazoRespostaAte: entrada.prazoRespostaAte,
    });

    await this.inscricoes.atualizarSituacao(entrada.inscricaoId, 'EM_RECURSO');

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Recurso',
      entidadeId: recurso.id,
      diff: {
        protocolo,
        inscricao: inscricao.protocolo,
        situacaoAnterior: inscricao.situacao,
        prazoRespostaAte: entrada.prazoRespostaAte.toISOString(),
      },
    });

    return { recursoId: recurso.id, protocolo };
  }

  async decidir(entrada: DecidirEntrada): Promise<{ situacao: SituacaoInscricao }> {
    const fundamentacao = entrada.fundamentacao.trim();
    if (fundamentacao.length < TAMANHO_MINIMO_FUNDAMENTACAO) {
      throw new BadRequestException(
        'A decisão precisa ser fundamentada — é ela que a família recebe como resposta.',
      );
    }

    const recurso = await this.recursos.buscar(entrada.recursoId);
    if (!recurso) throw new NotFoundException('Recurso não encontrado.');
    if (recurso.decidido) throw new BadRequestException('Este recurso já foi decidido.');

    await this.recursos.decidir({
      recursoId: entrada.recursoId,
      decisao: entrada.decisao,
      fundamentacao,
    });

    const situacao: SituacaoInscricao =
      entrada.decisao === 'INDEFERIDO' ? recurso.situacaoAnterior : 'APTA';

    await this.inscricoes.atualizarSituacao(recurso.inscricaoId, situacao);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Recurso',
      entidadeId: entrada.recursoId,
      diff: { decisao: entrada.decisao, situacaoResultante: situacao },
    });

    return { situacao };
  }
}
