import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import type { DefinicaoCriterio } from '@habita/shared/habitacao';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import {
  PROGRAMAS_ESCRITA_REPOSITORY,
  type ProgramasEscritaRepository,
  type VersaoEstado,
} from '../domain/ports';

/**
 * Versões de critério.
 *
 * O ciclo é rascunho → publicada → substituída, e publicar é irreversível: a inscrição abre em
 * cima da versão, e o snapshot de cada família aponta para ela. Por isso a validação inteira roda
 * na publicação, e rascunho publicado nunca mais aceita edição — mudar peso exige versão nova,
 * que é o que impede reordenar a fila retroativamente (spec §8).
 */
@Injectable()
export class CriteriosUseCase {
  constructor(
    @Inject(PROGRAMAS_ESCRITA_REPOSITORY) private readonly programas: ProgramasEscritaRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  /** Nova versão em rascunho: parte do modelo de referência ou da versão anterior. */
  async criarRascunho(
    programaId: string,
    origem: { salarioMinimo?: number; copiarDaVersaoId?: string },
  ): Promise<{ versaoId: string; versao: number }> {
    const estado = await this.programas.estado(programaId);
    if (!estado) throw new NotFoundException('Programa não encontrado.');

    const definicoes = await this.definicoesIniciais(origem);
    const versao = await this.programas.proximaVersao(programaId);
    const criada = await this.programas.criarVersao({ programaId, versao, definicoes });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'VersaoCriterio',
      entidadeId: criada.id,
      diff: { programaId, versao, criterios: definicoes.length },
    });

    return { versaoId: criada.id, versao: criada.versao };
  }

  async editarRascunho(versaoId: string, definicoes: DefinicaoCriterio[]): Promise<string[]> {
    const versao = await this.exigirVersao(versaoId);
    if (versao.situacao !== 'RASCUNHO') {
      throw new BadRequestException(
        'Versão publicada é imutável. Crie uma nova versão para alterar pesos.',
      );
    }

    await this.programas.atualizarRascunho(versaoId, definicoes);
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'VersaoCriterio',
      entidadeId: versaoId,
      diff: { criterios: definicoes.map((c) => ({ codigo: c.codigo, peso: c.peso })) },
    });

    // Erros voltam como aviso, não como bloqueio: rascunho pode ficar inconsistente enquanto o
    // gestor monta a regra. O portão é a publicação.
    return habitacao.validarVersaoCriterio({
      versao: versao.versao,
      publicadoEm: new Date().toISOString(),
      criterios: definicoes,
    });
  }

  async publicar(versaoId: string, agora: Date): Promise<{ versao: number; totalPontos: number }> {
    const versao = await this.exigirVersao(versaoId);
    if (versao.situacao !== 'RASCUNHO') {
      throw new BadRequestException('Esta versão já foi publicada.');
    }

    const erros = habitacao.validarVersaoCriterio({
      versao: versao.versao,
      publicadoEm: agora.toISOString(),
      criterios: versao.definicoes,
    });
    if (erros.length > 0) {
      throw new BadRequestException(erros);
    }

    await this.programas.publicarVersao(versaoId, versao.programaId, agora);

    const totalPontos = versao.definicoes.reduce((soma, criterio) => soma + criterio.peso, 0);
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'VersaoCriterio',
      entidadeId: versaoId,
      diff: {
        situacao: 'PUBLICADA',
        versao: versao.versao,
        totalPontos,
        criterios: versao.definicoes.map((c) => ({ codigo: c.codigo, peso: c.peso })),
      },
    });

    return { versao: versao.versao, totalPontos };
  }

  private async definicoesIniciais(origem: {
    salarioMinimo?: number;
    copiarDaVersaoId?: string;
  }): Promise<DefinicaoCriterio[]> {
    if (origem.copiarDaVersaoId) {
      const anterior = await this.exigirVersao(origem.copiarDaVersaoId);
      return anterior.definicoes;
    }
    if (!origem.salarioMinimo) {
      throw new BadRequestException(
        'Informe o salário mínimo de referência ou a versão a copiar — as faixas de renda dependem dele.',
      );
    }
    return habitacao.montarCriteriosReferencia(origem.salarioMinimo);
  }

  private async exigirVersao(versaoId: string): Promise<VersaoEstado> {
    const versao = await this.programas.versao(versaoId);
    if (!versao) throw new NotFoundException('Versão de critério não encontrada.');
    return versao;
  }
}
