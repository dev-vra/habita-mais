import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import {
  INSCRICOES_REPOSITORY,
  PENDENCIAS_REPOSITORY,
  type InscricoesRepository,
  type PendenciasRepository,
} from '../domain/ports';

export interface AbrirPendenciaEntrada {
  inscricaoId: string;
  tipo: string;
  descricao: string;
  prazoAte: Date;
}

/**
 * Pendência documental com prazo.
 *
 * Enquanto houver pendência aberta a inscrição fica suspensa da fila — não é punição, é o que
 * impede que uma família concorra com documentação que ninguém conferiu. Saneada a última, ela
 * volta a concorrer automaticamente, sem depender de alguém lembrar de reativar.
 */
@Injectable()
export class PendenciasUseCase {
  constructor(
    @Inject(PENDENCIAS_REPOSITORY) private readonly pendencias: PendenciasRepository,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async abrir(entrada: AbrirPendenciaEntrada): Promise<{ pendenciaId: string }> {
    const inscricao = await this.inscricoes.buscarParaCalculo(entrada.inscricaoId);
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');

    if (!habitacao.podeTransicionar(inscricao.situacao, 'PENDENTE')) {
      throw new BadRequestException(
        `Inscrição em situação ${inscricao.situacao} não aceita nova pendência.`,
      );
    }

    const pendencia = await this.pendencias.abrir(entrada);
    await this.inscricoes.atualizarSituacao(entrada.inscricaoId, 'PENDENTE', entrada.tipo);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Pendencia',
      entidadeId: pendencia.id,
      diff: {
        inscricao: inscricao.protocolo,
        tipo: entrada.tipo,
        prazoAte: entrada.prazoAte.toISOString(),
      },
    });

    return { pendenciaId: pendencia.id };
  }

  async resolver(
    pendenciaId: string,
    desfecho: 'RESOLVIDA' | 'DISPENSADA',
    arquivoKey?: string,
  ): Promise<{ situacaoInscricao: string }> {
    const pendencia = await this.pendencias.buscar(pendenciaId);
    if (!pendencia) throw new NotFoundException('Pendência não encontrada.');
    if (pendencia.situacao !== 'ABERTA' && pendencia.situacao !== 'VENCIDA') {
      throw new BadRequestException('Esta pendência já foi encerrada.');
    }

    await this.pendencias.encerrar(pendenciaId, desfecho, arquivoKey);

    const restantes = await this.pendencias.abertasDaInscricao(pendencia.inscricaoId);
    const situacao = restantes === 0 ? 'APTA' : 'PENDENTE';
    if (restantes === 0) {
      await this.inscricoes.atualizarSituacao(pendencia.inscricaoId, 'APTA');
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Pendencia',
      entidadeId: pendenciaId,
      diff: { desfecho, pendenciasAbertasRestantes: restantes, situacaoInscricao: situacao },
    });

    return { situacaoInscricao: situacao };
  }
}
