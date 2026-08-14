import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { br } from '@habita/shared';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import {
  PROGRAMAS_ESCRITA_REPOSITORY,
  type DadosPrograma,
  type ProgramasEscritaRepository,
} from '../domain/ports';

/** Situações a partir das quais o programa ainda pode receber inscrição. */
const ACEITA_INSCRICAO = 'INSCRICOES_ABERTAS';

@Injectable()
export class ProgramasUseCase {
  constructor(
    @Inject(PROGRAMAS_ESCRITA_REPOSITORY) private readonly programas: ProgramasEscritaRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async criar(dados: DadosPrograma): Promise<{ id: string; slug: string }> {
    if (dados.inscricaoFim <= dados.inscricaoInicio) {
      throw new BadRequestException('O fim das inscrições precisa ser posterior ao início.');
    }
    if (dados.vagas < 1) {
      throw new BadRequestException('O programa precisa de ao menos uma vaga.');
    }

    const slug = await this.slugDisponivel(dados.nome);
    const programa = await this.programas.criar({ ...dados, slug });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'ProgramaHabitacional',
      entidadeId: programa.id,
      diff: {
        nome: dados.nome,
        vagas: dados.vagas,
        fonteRecurso: dados.fonteRecurso,
        inscricaoInicio: dados.inscricaoInicio.toISOString(),
        inscricaoFim: dados.inscricaoFim.toISOString(),
      },
    });

    return programa;
  }

  async atualizar(programaId: string, dados: Partial<DadosPrograma>): Promise<void> {
    const estado = await this.exigirPrograma(programaId);

    // Vagas e prazo são o que o edital publicou. Mexer com gente já inscrita muda a regra do jogo
    // no meio — se for mesmo necessário, é decisão que precisa de novo edital, não de um PATCH.
    if (estado.temInscricoes && (dados.vagas !== undefined || dados.inscricaoFim !== undefined)) {
      throw new BadRequestException(
        'Programa com inscrições não permite alterar vagas nem prazo. Publique um novo edital.',
      );
    }

    await this.programas.atualizar(programaId, dados);
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ProgramaHabitacional',
      entidadeId: programaId,
      diff: { ...dados, inscricaoFim: dados.inscricaoFim?.toISOString() },
    });
  }

  /**
   * Abrir inscrição sem critério publicado seria receber família sem saber como pontuá-la — e é
   * exatamente a inversão que a spec §8 quer impedir: o critério é publicado ANTES.
   */
  async abrirInscricoes(programaId: string, temCriterioPublicado: boolean): Promise<void> {
    await this.exigirPrograma(programaId);

    if (!temCriterioPublicado) {
      throw new BadRequestException(
        'Publique a versão de critério antes de abrir as inscrições — o critério precisa ser público primeiro.',
      );
    }

    await this.programas.definirSituacao(programaId, ACEITA_INSCRICAO);
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ProgramaHabitacional',
      entidadeId: programaId,
      diff: { situacao: ACEITA_INSCRICAO },
    });
  }

  async definirSituacao(programaId: string, situacao: string): Promise<void> {
    await this.exigirPrograma(programaId);
    await this.programas.definirSituacao(programaId, situacao);
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ProgramaHabitacional',
      entidadeId: programaId,
      diff: { situacao },
    });
  }

  private async exigirPrograma(programaId: string) {
    const estado = await this.programas.estado(programaId);
    if (!estado) throw new NotFoundException('Programa não encontrado.');
    return estado;
  }

  /** Slug do nome; colisão ganha sufixo numérico em vez de falhar no rosto do usuário. */
  private async slugDisponivel(nome: string): Promise<string> {
    const base = br.slugify(nome);

    let candidato = base;
    let sufixo = 2;
    while (await this.programas.slugEmUso(candidato)) {
      candidato = `${base}-${sufixo}`;
      sufixo += 1;
    }
    return candidato;
  }
}
