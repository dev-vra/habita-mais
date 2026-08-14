import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { br } from '@habita/shared';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import { FAMILIAS_REPOSITORY, type FamiliasRepository } from '../domain/ports';
import type { DadosMembro, DadosVisita } from '../domain/tipos';

/** Composição nominal e visita domiciliar — o que o técnico social alimenta depois do cadastro. */
@Injectable()
export class RegistrarMembroVisitaUseCase {
  constructor(
    @Inject(FAMILIAS_REPOSITORY) private readonly familias: FamiliasRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async adicionarMembro(familiaId: string, dados: DadosMembro): Promise<{ membroId: string }> {
    await this.exigirFamilia(familiaId);

    const cpf = br.onlyDigits(dados.pessoa.cpf);
    if (!br.isValidCpf(cpf)) throw new BadRequestException('CPF do membro é inválido.');

    const membro = await this.familias.adicionarMembro(familiaId, {
      ...dados,
      pessoa: { ...dados.pessoa, cpf },
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'MembroFamiliar',
      entidadeId: membro.id,
      diff: { familiaId, cpf, parentesco: dados.parentesco, contribuiRenda: dados.contribuiRenda },
    });

    return { membroId: membro.id };
  }

  /**
   * A visita é a evidência do que foi apurado em campo. O parecer entra na trilha mascarado — é
   * texto de conteúdo social, e a lista de acessos a ele importa tanto quanto o conteúdo.
   */
  async registrarVisita(familiaId: string, dados: DadosVisita): Promise<{ visitaId: string }> {
    await this.exigirFamilia(familiaId);

    if (dados.parecer.trim().length === 0) {
      throw new BadRequestException('A visita precisa de parecer técnico.');
    }

    const visita = await this.familias.registrarVisita(familiaId, dados);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'VisitaDomiciliar',
      entidadeId: visita.id,
      diff: {
        familiaId,
        visitadaEm: dados.visitadaEm.toISOString(),
        fotos: dados.fotos.length,
        parecer: dados.parecer,
      },
    });

    return { visitaId: visita.id };
  }

  private async exigirFamilia(familiaId: string): Promise<void> {
    if (!(await this.familias.existe(familiaId))) {
      throw new NotFoundException('Família não encontrada.');
    }
  }
}
