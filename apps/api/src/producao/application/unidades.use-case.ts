import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import { PRODUCAO_REPOSITORY, type DadosUnidade, type ProducaoRepository } from '../domain/ports';

export interface MoldeUnidades {
  quantidade: number;
  prefixo?: string;
  inicio?: number;
  quadra?: string;
  tipologia?: string;
  areaConstruida?: number;
  areaTerreno?: number;
  valorAvaliado?: number;
  endereco: string;
  cep?: string;
}

@Injectable()
export class UnidadesUseCase {
  constructor(
    @Inject(PRODUCAO_REPOSITORY) private readonly producao: ProducaoRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolo: GeradorProtocolo,
  ) {}

  async criar(dados: DadosUnidade): Promise<{ id: string; protocolo: string }> {
    const protocolo = await this.protocolo.proximo('UNI', new Date().getFullYear());
    const unidade = await this.producao.criarUnidade(protocolo, dados);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'UnidadeHabitacional',
      entidadeId: unidade.id,
      diff: {
        protocolo,
        empreendimentoId: dados.empreendimentoId,
        identificacao: dados.identificacao,
        matricula: dados.matricula,
      },
    });

    return { id: unidade.id, protocolo };
  }

  /**
   * Gera as unidades de um conjunto de uma vez.
   *
   * 120 casas iguais não devem ser digitadas 120 vezes: o sistema propõe a numeração sequencial e
   * o servidor corrige o que for diferente. É a mesma ideia que vale no resto do produto —
   * auto-preencher, o humano valida.
   */
  async gerarEmLote(
    empreendimentoId: string,
    molde: MoldeUnidades,
  ): Promise<{ criadas: number }> {
    const inicio = molde.inicio ?? 1;
    const prefixo = molde.prefixo?.trim() ?? '';
    const ano = new Date().getFullYear();

    const unidades: { protocolo: string; dados: DadosUnidade }[] = [];

    for (let indice = 0; indice < molde.quantidade; indice += 1) {
      const numero = inicio + indice;
      // "Casa" + 1 vira "Casa 1", não "Casa1": o separador é do sistema, não do que o usuário
      // lembrou de digitar no fim do campo.
      const identificacao = prefixo ? `${prefixo} ${numero}` : String(numero);

      unidades.push({
        protocolo: await this.protocolo.proximo('UNI', ano),
        dados: {
          empreendimentoId,
          identificacao,
          quadra: molde.quadra,
          lote: String(numero),
          endereco: `${molde.endereco}, ${identificacao}`,
          cep: molde.cep,
          tipologia: molde.tipologia,
          areaConstruida: molde.areaConstruida,
          areaTerreno: molde.areaTerreno,
          valorAvaliado: molde.valorAvaliado,
        },
      });
    }

    const criadas = await this.producao.gerarUnidadesEmLote(empreendimentoId, unidades);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'UnidadeHabitacional',
      entidadeId: empreendimentoId,
      diff: {
        emLote: true,
        criadas,
        de: unidades[0]?.dados.identificacao,
        ate: unidades[unidades.length - 1]?.dados.identificacao,
      },
    });

    return { criadas };
  }

  /**
   * Move a unidade de situação.
   *
   * A máquina de estados mora no domínio compartilhado, e o motivo é sempre obrigatório: depois da
   * entrega, cada mudança de situação afeta a casa de alguém — e "por quê" é o que a auditoria vai
   * perguntar dois anos depois (§9).
   */
  async mover(
    unidadeId: string,
    situacao: habitacao.SituacaoUnidade,
    motivo: string,
    familiaId?: string,
  ): Promise<void> {
    const unidade = await this.producao.unidade(unidadeId);
    if (!unidade) throw new NotFoundException('Unidade não encontrada.');

    if (!habitacao.podeTransicionarUnidade(unidade.situacao, situacao)) {
      const permitidas = habitacao.transicoesUnidade(unidade.situacao);
      throw new BadRequestException(
        permitidas.length === 0
          ? `Unidade ${unidade.situacao.toLowerCase()} não muda mais de situação.`
          : `De ${unidade.situacao} só é possível ir para: ${permitidas.join(', ')}.`,
      );
    }

    if (situacao === 'ENTREGUE' && !familiaId && !unidade.familiaId) {
      throw new BadRequestException('Informe a família que recebe a unidade.');
    }

    // Retomada desliga a titularidade: manter a família apontada faria a casa continuar aparecendo
    // como dela no acompanhamento pós-entrega.
    const novaFamilia = situacao === 'RETOMADA' ? null : (familiaId ?? undefined);
    const entregueEm = situacao === 'ENTREGUE' ? new Date() : undefined;

    await this.producao.moverUnidade(unidadeId, situacao, motivo, novaFamilia, entregueEm);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'UnidadeHabitacional',
      entidadeId: unidadeId,
      diff: {
        de: unidade.situacao,
        para: situacao,
        motivo,
        familiaId: novaFamilia ?? undefined,
        identificacao: unidade.identificacao,
      },
    });
  }
}
