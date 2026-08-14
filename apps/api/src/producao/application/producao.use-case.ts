import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao, br } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import {
  PRODUCAO_REPOSITORY,
  type DadosConvenio,
  type DadosEmpreendimento,
  type DadosEtapa,
  type DadosObra,
  type ProducaoRepository,
  type SituacaoObra,
} from '../domain/ports';

/** Situações que encerram a obra e por isso exigem motivo escrito. */
const EXIGEM_MOTIVO: readonly SituacaoObra[] = ['PARALISADA', 'RESCINDIDA'];

@Injectable()
export class ProducaoUseCase {
  constructor(
    @Inject(PRODUCAO_REPOSITORY) private readonly producao: ProducaoRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolo: GeradorProtocolo,
  ) {}

  async criarConvenio(dados: DadosConvenio): Promise<{ id: string; protocolo: string }> {
    if (dados.vigenciaFim <= dados.vigenciaInicio) {
      throw new BadRequestException('A vigência precisa terminar depois de começar.');
    }
    if (dados.valorRepasse <= 0) {
      throw new BadRequestException('O repasse precisa ser maior que zero.');
    }

    const protocolo = await this.protocolo.proximo('CNV', new Date().getFullYear());
    const convenio = await this.producao.criarConvenio(protocolo, dados);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Convenio',
      entidadeId: convenio.id,
      diff: {
        protocolo,
        objeto: dados.objeto,
        origem: dados.origem,
        orgaoRepassador: dados.orgaoRepassador,
        valorRepasse: dados.valorRepasse,
        vigenciaFim: dados.vigenciaFim.toISOString(),
      },
    });

    return { id: convenio.id, protocolo };
  }

  async criarEmpreendimento(
    dados: DadosEmpreendimento,
  ): Promise<{ id: string; slug: string; protocolo: string }> {
    const slug = await this.slugDisponivel(dados.nome);
    const protocolo = await this.protocolo.proximo('EMP', new Date().getFullYear());
    const empreendimento = await this.producao.criarEmpreendimento(protocolo, slug, dados);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Empreendimento',
      entidadeId: empreendimento.id,
      diff: {
        protocolo,
        nome: dados.nome,
        unidadesPrevistas: dados.unidadesPrevistas,
        convenioId: dados.convenioId,
        programaId: dados.programaId,
      },
    });

    return { ...empreendimento, protocolo };
  }

  /**
   * A obra é o contrato com quem constrói. O CNPJ é conferido aqui, e não na borda: máscara do
   * front não é validação, e contrato com executora inexistente contamina a prestação de contas.
   */
  async criarObra(dados: DadosObra): Promise<{ id: string }> {
    const cnpj = br.normalizeCnpj(dados.executoraCnpj);
    if (!br.isValidCnpj(cnpj)) {
      throw new BadRequestException('CNPJ da executora inválido.');
    }
    if (dados.terminoPrevisto <= dados.inicioPrevisto) {
      throw new BadRequestException('O término previsto precisa ser posterior ao início.');
    }

    const obra = await this.producao.criarObra({ ...dados, executoraCnpj: cnpj });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Obra',
      entidadeId: obra.id,
      diff: {
        empreendimentoId: dados.empreendimentoId,
        numeroContrato: dados.numeroContrato,
        executoraNome: dados.executoraNome,
        executoraCnpj: cnpj,
        valorContrato: dados.valorContrato,
        terminoPrevisto: dados.terminoPrevisto.toISOString(),
      },
    });

    return obra;
  }

  /**
   * Substitui o cronograma inteiro.
   *
   * Os pesos precisam fechar 100 porque é deles que sai o percentual executado — cronograma que
   * soma 80 produz uma barra de progresso que ninguém consegue defender numa auditoria.
   */
  async definirEtapas(obraId: string, etapas: DadosEtapa[]): Promise<void> {
    const paraRegra: habitacao.EtapaCronograma[] = etapas.map((etapa) => ({
      codigo: etapa.codigo,
      nome: etapa.nome,
      peso: etapa.peso,
      executado: 0,
      previstaAte: etapa.previstaAte.toISOString(),
    }));

    if (!habitacao.pesosFecham(paraRegra)) {
      const total = etapas.reduce((soma, etapa) => soma + etapa.peso, 0);
      throw new BadRequestException(
        `Os pesos das etapas somam ${total}%. Ajuste para somar exatamente 100%.`,
      );
    }

    const codigos = new Set(etapas.map((etapa) => etapa.codigo));
    if (codigos.size !== etapas.length) {
      throw new BadRequestException('Há etapas com o mesmo código no cronograma.');
    }

    await this.producao.definirEtapas(obraId, etapas);
    await this.producao.recalcularAvancoDaObra(obraId, 0);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Obra',
      entidadeId: obraId,
      diff: { cronograma: etapas.map((etapa) => ({ codigo: etapa.codigo, peso: etapa.peso })) },
    });
  }

  /** Atualiza o executado de uma etapa e reflete o avanço na obra. */
  async registrarExecucao(etapaId: string, executado: number): Promise<{ percentualObra: number }> {
    const etapa = await this.producao.etapaDaObra(etapaId);
    if (!etapa) throw new NotFoundException('Etapa não encontrada.');

    await this.producao.atualizarExecucaoEtapa(
      etapaId,
      executado,
      executado >= 100 ? new Date() : null,
    );

    const estado = await this.producao.estadoParaMedicao(etapa.obraId);
    const percentualObra = estado ? habitacao.avancoFisico(estado.etapas) : 0;
    await this.producao.recalcularAvancoDaObra(etapa.obraId, percentualObra);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'EtapaObra',
      entidadeId: etapaId,
      diff: { etapa: etapa.nome, executado, percentualObra },
    });

    return { percentualObra };
  }

  async definirSituacaoObra(obraId: string, situacao: SituacaoObra, motivo?: string): Promise<void> {
    if (EXIGEM_MOTIVO.includes(situacao) && !motivo?.trim()) {
      throw new BadRequestException(
        'Paralisar ou rescindir exige motivo — é o que a prestação de contas vai cobrar.',
      );
    }

    await this.producao.definirSituacaoObra(obraId, situacao, motivo?.trim());
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Obra',
      entidadeId: obraId,
      diff: { situacao, motivo: motivo?.trim() },
    });
  }

  private async slugDisponivel(nome: string): Promise<string> {
    const base = br.slugify(nome);
    let candidato = base;
    let sufixo = 2;

    while (await this.producao.slugEmUso(candidato)) {
      candidato = `${base}-${sufixo}`;
      sufixo += 1;
    }

    return candidato;
  }
}
