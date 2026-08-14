import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  CONVOCACOES_REPOSITORY,
  GERADOR_PROTOCOLO,
  INSCRICOES_REPOSITORY,
  TRILHA_AUDITORIA,
  type ConvocacoesRepository,
  type GeradorProtocolo,
  type InscricoesRepository,
  type TrilhaAuditoria,
} from '../domain/ports';

/** Motivo de exceção precisa ser um motivo, não um "ok" — o texto vai publicado junto ao ranking. */
const TAMANHO_MINIMO_MOTIVO = 20;

export interface ConvocarEntrada {
  inscricaoId: string;
  prazoComparecimentoAte: Date;
  agora: Date;
  foraDeOrdem: boolean;
  motivoExcecao?: string;
}

export interface ConvocarSaida {
  convocacaoId: string;
  numeroOficio: string;
  foraDeOrdem: boolean;
}

/**
 * Emite a convocação.
 *
 * A convocação fora de ordem é a exceção da §9, e existe aqui em vez de acontecer por fora do
 * sistema — que é o pior dos dois mundos, porque some do rastro. Ela exige capacidade concedida
 * (checada no guard e reconfirmada no controller), motivo obrigatório, e não reordena a fila:
 * o ranking publicado permanece o que foi publicado, e a exceção aparece como exceção.
 */
@Injectable()
export class ConvocarFamiliaUseCase {
  constructor(
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(CONVOCACOES_REPOSITORY) private readonly convocacoes: ConvocacoesRepository,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolos: GeradorProtocolo,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async executar(entrada: ConvocarEntrada): Promise<ConvocarSaida> {
    const inscricao = await this.inscricoes.buscarParaCalculo(entrada.inscricaoId);
    if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');

    if (!habitacao.podeTransicionar(inscricao.situacao, 'CONVOCADA')) {
      throw new BadRequestException(
        `Inscrição em situação ${inscricao.situacao} não pode ser convocada.`,
      );
    }

    const motivo = entrada.motivoExcecao?.trim() ?? '';
    if (entrada.foraDeOrdem && motivo.length < TAMANHO_MINIMO_MOTIVO) {
      throw new BadRequestException(
        'Convocação fora de ordem exige motivo fundamentado — ele é publicado junto ao ranking.',
      );
    }

    const numeroOficio = await this.protocolos.proximo('OFC', entrada.agora.getFullYear());
    const convocacao = await this.convocacoes.criarConvocacao({
      inscricaoId: entrada.inscricaoId,
      numeroOficio,
      prazoComparecimentoAte: entrada.prazoComparecimentoAte,
      foraDeOrdem: entrada.foraDeOrdem,
      motivoExcecao: entrada.foraDeOrdem ? motivo : undefined,
    });

    await this.inscricoes.atualizarSituacao(entrada.inscricaoId, 'CONVOCADA');

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Convocacao',
      entidadeId: convocacao.id,
      diff: {
        numeroOficio,
        protocolo: inscricao.protocolo,
        foraDeOrdem: entrada.foraDeOrdem,
        motivoExcecao: entrada.foraDeOrdem ? motivo : null,
        prazoComparecimentoAte: entrada.prazoComparecimentoAte.toISOString(),
      },
    });

    return { convocacaoId: convocacao.id, numeroOficio, foraDeOrdem: entrada.foraDeOrdem };
  }
}
