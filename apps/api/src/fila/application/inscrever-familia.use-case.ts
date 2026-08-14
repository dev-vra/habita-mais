import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  INSCRICOES_REPOSITORY,
  PROGRAMAS_REPOSITORY,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type InscricoesRepository,
  type ProgramasRepository,
  type TrilhaAuditoria,
} from '../domain/ports';

export interface InscreverFamiliaEntrada {
  programaId: string;
  familiaId: string;
  agora: Date;
}

export interface InscreverFamiliaSaida {
  inscricaoId: string;
  protocolo: string;
  pontuacao: number;
}

/**
 * Inscreve a família e já congela a primeira pontuação.
 *
 * A nota nasce junto com a inscrição de propósito: uma inscrição sem snapshot seria uma família na
 * fila sem posição explicável, e é exatamente esse vazio que o produto veio eliminar.
 */
@Injectable()
export class InscreverFamiliaUseCase {
  constructor(
    @Inject(PROGRAMAS_REPOSITORY) private readonly programas: ProgramasRepository,
    @Inject(INSCRICOES_REPOSITORY) private readonly inscricoes: InscricoesRepository,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolos: GeradorProtocolo,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async executar(entrada: InscreverFamiliaEntrada): Promise<InscreverFamiliaSaida> {
    const programa = await this.programas.buscarPorId(entrada.programaId);
    if (!programa) throw new NotFoundException('Programa não encontrado.');

    if (entrada.agora < programa.inscricaoInicio || entrada.agora > programa.inscricaoFim) {
      throw new BadRequestException('Fora do período de inscrição publicado para este programa.');
    }

    const versao = await this.programas.versaoPublicada(entrada.programaId);
    if (!versao) {
      throw new BadRequestException(
        'O programa não tem critério publicado. Publique os critérios antes de abrir inscrição.',
      );
    }

    if (await this.inscricoes.existeParaFamilia(entrada.programaId, entrada.familiaId)) {
      throw new BadRequestException('Esta família já está inscrita neste programa.');
    }

    const protocolo = await this.protocolos.proximo('HAB', entrada.agora.getFullYear());
    const inscricao = await this.inscricoes.criar({
      programaId: entrada.programaId,
      familiaId: entrada.familiaId,
      protocolo,
      inscritaEm: entrada.agora,
    });

    const paraCalculo = await this.inscricoes.buscarParaCalculo(inscricao.id);
    if (!paraCalculo) {
      throw new BadRequestException(
        'A família não tem ficha social vigente — a pontuação não pode ser apurada.',
      );
    }

    const calculo = habitacao.calcularPontuacao(
      { versao: versao.versao, publicadoEm: versao.publicadoEm, criterios: versao.criterios },
      paraCalculo.fatos,
      entrada.agora.toISOString(),
    );

    await this.inscricoes.registrarSnapshot({
      inscricaoId: inscricao.id,
      versaoCriterioId: versao.id,
      total: calculo.total,
      totalMaximo: calculo.totalMaximo,
      itens: calculo.itens,
      fatos: paraCalculo.fatos,
      motivo: 'INSCRICAO',
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'InscricaoFila',
      entidadeId: inscricao.id,
      diff: { protocolo, programaId: entrada.programaId, pontuacao: calculo.total },
    });

    return { inscricaoId: inscricao.id, protocolo, pontuacao: calculo.total };
  }
}
