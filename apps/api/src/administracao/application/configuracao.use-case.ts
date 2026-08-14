import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import { ADMINISTRACAO_REPOSITORY, type AdministracaoRepository } from '../domain/ports';

const SALARIO_MINIMO_MINIMO_PLAUSIVEL = 100;

@Injectable()
export class ConfiguracaoUseCase {
  constructor(
    @Inject(ADMINISTRACAO_REPOSITORY) private readonly repositorio: AdministracaoRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  parametros() {
    return this.repositorio.parametros();
  }

  /**
   * Salário mínimo de referência do município: alimenta as faixas de renda do modelo de critérios.
   * Alterar não mexe em versão já publicada — critério publicado é imutável, e é por isso que o
   * valor pode ser corrigido aqui sem risco de reordenar fila existente.
   */
  async definirSalarioMinimo(valor: number): Promise<void> {
    if (valor < SALARIO_MINIMO_MINIMO_PLAUSIVEL) {
      throw new BadRequestException('Valor implausível para salário mínimo.');
    }

    const parametros = await this.repositorio.parametros();
    const anterior = parametros.salarioMinimo ?? null;
    await this.repositorio.salvarParametros({ ...parametros, salarioMinimo: valor });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Tenant',
      entidadeId: 'parametros',
      diff: { salarioMinimo: { de: anterior, para: valor } },
    });
  }

  listarSignatarios() {
    return this.repositorio.listarSignatarios();
  }

  /** Quem assina o ofício de convocação. Sem signatário ativo, o documento sai sem assinatura. */
  async criarSignatario(dados: {
    nome: string;
    papel: string;
    cargo: string;
    cpf?: string;
  }): Promise<{ id: string }> {
    const signatario = await this.repositorio.criarSignatario(dados);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Signatario',
      entidadeId: signatario.id,
      diff: { nome: dados.nome, papel: dados.papel, cargo: dados.cargo },
    });

    return signatario;
  }

  async desativarSignatario(signatarioId: string): Promise<void> {
    await this.repositorio.desativarSignatario(signatarioId);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Signatario',
      entidadeId: signatarioId,
      diff: { ativo: false },
    });
  }
}
