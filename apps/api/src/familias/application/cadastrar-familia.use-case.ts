import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { br } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import { FAMILIAS_REPOSITORY, type FamiliasRepository } from '../domain/ports';
import type { DadosFichaSocial, DadosPessoa } from '../domain/tipos';

export interface CadastrarFamiliaEntrada {
  responsavel: DadosPessoa;
  ficha: DadosFichaSocial;
  agora: Date;
}

/**
 * Cadastra a família com o responsável e a primeira ficha social.
 *
 * A família nasce com ficha porque sem ela não há fatos — e sem fatos a família não pode ser
 * inscrita nem pontuada. Um cadastro sem ficha seria uma linha que promete atendimento e não
 * sustenta nenhuma decisão.
 */
@Injectable()
export class CadastrarFamiliaUseCase {
  constructor(
    @Inject(FAMILIAS_REPOSITORY) private readonly familias: FamiliasRepository,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolos: GeradorProtocolo,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async executar(entrada: CadastrarFamiliaEntrada): Promise<{ familiaId: string; codigo: string }> {
    const cpf = br.onlyDigits(entrada.responsavel.cpf);
    if (!br.isValidCpf(cpf)) throw new BadRequestException('CPF do responsável é inválido.');

    const existente = await this.familias.pessoaPorCpf(cpf);
    if (existente?.familiaId) {
      throw new BadRequestException(
        `${existente.nome} já pertence a uma família cadastrada. Atualize a família existente em vez de duplicar.`,
      );
    }

    validarFicha(entrada.ficha);

    const pessoaId = existente?.id ?? (await this.familias.criarPessoa({ ...entrada.responsavel, cpf })).id;
    const codigo = await this.protocolos.proximo('FAM', entrada.agora.getFullYear());
    const familia = await this.familias.criarFamilia({ codigo, responsavelId: pessoaId });
    const ficha = await this.familias.registrarFicha(familia.id, entrada.ficha);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Familia',
      entidadeId: familia.id,
      diff: {
        codigo,
        responsavel: entrada.responsavel.nome,
        cpf,
        fichaId: ficha.id,
        rendaFamiliar: entrada.ficha.rendaFamiliar,
      },
    });

    return { familiaId: familia.id, codigo };
  }
}

/**
 * Validação que o banco não faz: renda per capita é o critério de maior peso da fila, e uma
 * composição zerada produziria divisão por zero — ou pior, uma renda per capita inventada.
 */
export function validarFicha(ficha: DadosFichaSocial): void {
  if (ficha.quantidadePessoas < 1) {
    throw new BadRequestException('A composição familiar precisa de ao menos uma pessoa.');
  }
  if (ficha.quantidadeMenores > ficha.quantidadePessoas) {
    throw new BadRequestException('Há mais menores declarados do que pessoas no grupo familiar.');
  }
  if (ficha.rendaFamiliar < 0) {
    throw new BadRequestException('Renda familiar não pode ser negativa.');
  }
  if (ficha.validaAte <= ficha.apuradaEm) {
    throw new BadRequestException('A validade da ficha precisa ser posterior à data de apuração.');
  }
  if (ficha.situacaoRisco && !ficha.laudoRiscoKey) {
    // Espelha a regra do motor de pontuação (spec §6.3): risco sem laudo não vira prioridade.
    // Bloquear aqui evita a ficha marcada como risco que depois não pontua, sem ninguém entender.
    throw new BadRequestException(
      'Situação de risco exige o laudo da Defesa Civil anexado — sem ele o critério não pontua.',
    );
  }
}
