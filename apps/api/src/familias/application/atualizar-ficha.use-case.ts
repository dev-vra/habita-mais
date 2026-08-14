import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import { FAMILIAS_REPOSITORY, type FamiliasRepository } from '../domain/ports';
import type { DadosFichaSocial } from '../domain/tipos';
import { validarFicha } from './cadastrar-familia.use-case';

/**
 * Nova apuração da ficha social.
 *
 * Sempre cria ficha nova e aposenta a anterior — nunca edita no lugar. Snapshot de pontuação
 * antigo aponta para os fatos que valiam; se a ficha fosse sobrescrita, a nota de ontem ficaria
 * sem explicação amanhã.
 *
 * A pontuação NÃO é recalculada aqui: recalcular é ato do gestor, com capacidade própria e trilha
 * (spec §5). A ficha mudar não pode reordenar a fila em silêncio.
 */
@Injectable()
export class AtualizarFichaUseCase {
  constructor(
    @Inject(FAMILIAS_REPOSITORY) private readonly familias: FamiliasRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async executar(familiaId: string, dados: DadosFichaSocial): Promise<{ fichaId: string }> {
    if (!(await this.familias.existe(familiaId))) {
      throw new NotFoundException('Família não encontrada.');
    }

    validarFicha(dados);

    const anterior = await this.familias.fichaVigente(familiaId);
    const ficha = await this.familias.registrarFicha(familiaId, dados);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'FichaSocial',
      entidadeId: ficha.id,
      diff: {
        familiaId,
        fichaAnterior: anterior?.id ?? null,
        rendaPerCapitaAnterior: anterior?.rendaPerCapita ?? null,
        rendaFamiliar: dados.rendaFamiliar,
        quantidadePessoas: dados.quantidadePessoas,
        apuradaEm: dados.apuradaEm.toISOString(),
      },
    });

    return { fichaId: ficha.id };
  }
}
