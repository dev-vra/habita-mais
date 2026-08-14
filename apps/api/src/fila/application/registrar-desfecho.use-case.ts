import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import type { DesfechoConvocacao } from '@habita/shared/habitacao';
import {
  CONVOCACOES_REPOSITORY,
  INSCRICOES_REPOSITORY,
  TRILHA_AUDITORIA,
  type ConvocacoesRepository,
  type InscricoesRepository,
  type TrilhaAuditoria,
} from '../domain/ports';

export interface RegistrarDesfechoEntrada {
  convocacaoId: string;
  desfecho: DesfechoConvocacao;
  motivo?: string;
}

/**
 * Registra o que aconteceu na convocação.
 *
 * Todo desfecho que não é contemplação exige motivo: uma família que sai da chamada sem
 * justificativa registrada é exatamente o buraco que faz a fila parecer manipulada. Quem não
 * compareceu volta à fila, e o sistema segue para o próximo.
 */
@Injectable()
export class RegistrarDesfechoUseCase {
  constructor(
    @Inject(CONVOCACOES_REPOSITORY) private readonly convocacoes: ConvocacoesRepository,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async executar(entrada: RegistrarDesfechoEntrada): Promise<{ situacao: string }> {
    const convocacao = await this.convocacoes.buscarConvocacao(entrada.convocacaoId);
    if (!convocacao) throw new NotFoundException('Convocação não encontrada.');
    if (convocacao.desfecho) {
      throw new BadRequestException('Esta convocação já teve desfecho registrado.');
    }

    const motivo = entrada.motivo?.trim() ?? '';
    if (entrada.desfecho !== 'COMPARECEU' && motivo.length === 0) {
      throw new BadRequestException('Informe o motivo — ele é o que sustenta a chamada do próximo.');
    }

    const situacao = habitacao.situacaoAposConvocacao(entrada.desfecho);

    await this.convocacoes.registrarDesfecho({
      convocacaoId: entrada.convocacaoId,
      desfecho: entrada.desfecho,
      motivo: motivo || undefined,
    });
    await this.inscricoes.atualizarSituacao(convocacao.inscricaoId, situacao, motivo || undefined);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Convocacao',
      entidadeId: entrada.convocacaoId,
      diff: { desfecho: entrada.desfecho, motivo: motivo || null, situacaoInscricao: situacao },
    });

    return { situacao };
  }
}
