import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import { actorId, getActiveContext } from '../../context/request-context';
import {
  CONTRATOS_REPOSITORY,
  type ContratosRepository,
  type DadosBaixa,
  type DadosContrato,
  type DadosRenegociacao,
  type DadosTransferencia,
} from '../domain/ports';

@Injectable()
export class ContratosUseCase {
  constructor(
    @Inject(CONTRATOS_REPOSITORY) private readonly contratos: ContratosRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolo: GeradorProtocolo,
  ) {}

  private get autor(): string {
    const ctx = getActiveContext();
    return ctx.userNome ?? actorId();
  }

  /**
   * Assina o contrato e emite o carnê inteiro de uma vez.
   *
   * Gerar as parcelas no ato é o que permite à família saber, no dia da assinatura, quanto vai
   * pagar até o fim — e à prefeitura cobrar sem depender de alguém lembrar de emitir o carnê todo
   * mês.
   */
  async criar(dados: DadosContrato): Promise<{ id: string; protocolo: string; parcelas: number }> {
    const existente = await this.contratos.contratoDaUnidade(dados.unidadeId);
    if (existente) {
      throw new BadRequestException(
        `Esta unidade já tem o contrato ${existente.protocolo}. Encerre-o antes de assinar outro.`,
      );
    }

    const valorFinanciado =
      Math.round((dados.valorUnidade - dados.valorSubsidio - dados.valorEntrada) * 100) / 100;

    if (valorFinanciado < 0) {
      throw new BadRequestException('Subsídio e entrada somam mais que o valor da unidade.');
    }
    if (valorFinanciado === 0) {
      throw new BadRequestException(
        'Nada a financiar. Unidade totalmente subsidiada não gera contrato de mutuário — registre a entrega e o título.',
      );
    }
    if (dados.quantidadeParcelas < 1) {
      throw new BadRequestException('O contrato precisa de ao menos uma parcela.');
    }
    if (!/^\d{4}-\d{2}$/.test(dados.primeiraCompetencia)) {
      throw new BadRequestException('Competência inválida. Use o formato AAAA-MM.');
    }

    const carne = habitacao.gerarCarne({
      valorFinanciado,
      quantidadeParcelas: dados.quantidadeParcelas,
      diaVencimento: dados.diaVencimento,
      primeiraCompetencia: dados.primeiraCompetencia,
    });

    const protocolo = await this.protocolo.proximo('MUT', new Date().getFullYear());
    const contrato = await this.contratos.criar(
      protocolo,
      dados,
      valorFinanciado,
      carne[0]?.valor ?? 0,
    );

    const geradas = await this.contratos.gerarParcelas(contrato.id, carne);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'ContratoMutuario',
      entidadeId: contrato.id,
      diff: {
        protocolo,
        unidadeId: dados.unidadeId,
        familiaId: dados.familiaId,
        valorFinanciado,
        quantidadeParcelas: dados.quantidadeParcelas,
        primeiraCompetencia: dados.primeiraCompetencia,
      },
    });

    return { id: contrato.id, protocolo, parcelas: geradas };
  }

  async definirSituacao(
    contratoId: string,
    situacao: habitacao.SituacaoContrato,
    motivo?: string,
  ): Promise<void> {
    const contrato = await this.exigirContrato(contratoId);

    const exigeMotivo = situacao === 'SUSPENSO' || situacao === 'RESCINDIDO';
    if (exigeMotivo && !motivo?.trim()) {
      throw new BadRequestException(
        'Suspender ou rescindir contrato de moradia exige motivo registrado.',
      );
    }
    if (situacao === 'RESCINDIDO') {
      // A rescisão do contrato é consequência de processo, não substituto dele. Quem tira a casa
      // é o caso de retomada, com notificação e defesa (ver módulo `retomada`).
      const resumo = habitacao.resumirContrato(contrato.parcelas, new Date());
      if (resumo.saldoDevedor === 0) {
        throw new BadRequestException('Contrato sem saldo devedor não se rescinde por inadimplência.');
      }
    }

    await this.contratos.definirSituacao(contratoId, situacao, motivo?.trim());
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ContratoMutuario',
      entidadeId: contratoId,
      diff: { de: contrato.situacao, para: situacao, motivo: motivo?.trim() },
    });
  }

  /**
   * Dá baixa em uma parcela.
   *
   * Errar aqui para menos gera cobrança de quem já pagou; errar para mais some com dinheiro público
   * da prestação de contas. Por isso a baixa é validada contra o saldo real da parcela, e o
   * pagamento vira registro próprio — estorno deixa rastro em vez de apagar.
   */
  async darBaixa(dados: DadosBaixa): Promise<{ situacaoParcela: habitacao.SituacaoParcela; quitou: boolean }> {
    const parcela = await this.contratos.parcela(dados.parcelaId);
    if (!parcela) throw new NotFoundException('Parcela não encontrada.');

    const [avaliada] = habitacao.avaliarParcelas(
      [
        {
          numero: parcela.numero,
          vencimento: parcela.vencimento,
          valor: parcela.valor,
          situacao: parcela.situacao,
          valorPago: parcela.valorPago,
        },
      ],
      new Date(),
    );

    const impedimentos = habitacao.impedimentosDaBaixa({
      situacaoContrato: parcela.situacaoContrato,
      parcela: avaliada!,
      valorPago: dados.valor,
    });

    if (impedimentos.length > 0) {
      throw new BadRequestException(
        impedimentos.map((codigo) => habitacao.MOTIVOS_IMPEDIMENTO_BAIXA[codigo]),
      );
    }

    await this.contratos.registrarBaixa(dados, this.autor);

    const totalPago = await this.contratos.somarPagamentos(dados.parcelaId);
    const quitou = totalPago >= parcela.valor - 0.001;
    const situacaoParcela: habitacao.SituacaoParcela = quitou ? 'PAGA' : 'PAGA_PARCIAL';

    await this.contratos.atualizarParcelaAposBaixa(dados.parcelaId, totalPago, situacaoParcela);

    // Última parcela quitada encerra o contrato — e é o que habilita o título definitivo.
    const contrato = await this.contratos.contrato(parcela.contratoId);
    if (contrato) {
      const resumo = habitacao.resumirContrato(contrato.parcelas, new Date());
      if (resumo.quitado && contrato.situacao === 'VIGENTE') {
        await this.contratos.definirSituacao(contrato.id, 'QUITADO');
      }
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ParcelaContrato',
      entidadeId: dados.parcelaId,
      diff: {
        valor: dados.valor,
        forma: dados.forma,
        pagoEm: dados.pagoEm.toISOString(),
        situacao: situacaoParcela,
      },
    });

    return { situacaoParcela, quitou };
  }

  async estornar(pagamentoId: string, motivo: string): Promise<void> {
    if (!motivo.trim()) {
      throw new BadRequestException('Informe o motivo do estorno.');
    }

    const pagamento = await this.contratos.pagamento(pagamentoId);
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado.');
    if (pagamento.estornado) throw new BadRequestException('Este pagamento já foi estornado.');

    await this.contratos.estornarPagamento(pagamentoId, motivo.trim(), this.autor);

    const parcela = await this.contratos.parcela(pagamento.parcelaId);
    if (parcela) {
      const totalPago = await this.contratos.somarPagamentos(pagamento.parcelaId);
      await this.contratos.atualizarParcelaAposBaixa(
        pagamento.parcelaId,
        totalPago,
        totalPago <= 0 ? 'ABERTA' : totalPago >= parcela.valor - 0.001 ? 'PAGA' : 'PAGA_PARCIAL',
      );
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'PagamentoParcela',
      entidadeId: pagamentoId,
      diff: { estornado: true, motivo: motivo.trim(), valor: pagamento.valor },
    });
  }

  /**
   * Renegocia o saldo em aberto.
   *
   * As parcelas antigas não somem: viram RENEGOCIADAS e saem da conta, e um carnê novo nasce com o
   * saldo apurado. Apagar as velhas faria o histórico de inadimplência desaparecer junto — e é
   * dele que depende qualquer decisão futura sobre a unidade.
   */
  async renegociar(
    contratoId: string,
    dados: DadosRenegociacao,
  ): Promise<{ saldo: number; parcelas: number; valorParcela: number }> {
    const contrato = await this.exigirContrato(contratoId);
    if (contrato.situacao !== 'VIGENTE') {
      throw new BadRequestException('Só contrato vigente é renegociado.');
    }
    if (dados.novaQuantidade < 1) {
      throw new BadRequestException('A renegociação precisa de ao menos uma parcela.');
    }
    if (!dados.motivo.trim()) {
      throw new BadRequestException('Informe o motivo da renegociação.');
    }

    const { saldo, substituidas } = await this.contratos.substituirParcelasAbertas(contratoId);
    if (saldo <= 0) {
      throw new BadRequestException('Não há saldo em aberto para renegociar.');
    }

    const carne = habitacao.gerarCarne({
      valorFinanciado: saldo,
      quantidadeParcelas: dados.novaQuantidade,
      diaVencimento: dados.diaVencimento ?? contrato.diaVencimento,
      primeiraCompetencia: dados.primeiraCompetencia,
    });

    const proximoNumero = await this.contratos.proximoNumeroDeParcela(contratoId);
    await this.contratos.gerarParcelas(
      contratoId,
      carne.map((parcela, indice) => ({ ...parcela, numero: proximoNumero + indice })),
    );

    await this.contratos.registrarRenegociacao(
      contratoId,
      { ...dados, saldo, substituidas, valorParcela: carne[0]?.valor ?? 0 },
      this.autor,
    );

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ContratoMutuario',
      entidadeId: contratoId,
      diff: {
        renegociacao: true,
        saldoRenegociado: saldo,
        parcelasSubstituidas: substituidas,
        novaQuantidade: dados.novaQuantidade,
        motivo: dados.motivo,
      },
    });

    return { saldo, parcelas: carne.length, valorParcela: carne[0]?.valor ?? 0 };
  }

  /**
   * Transfere a titularidade.
   *
   * Ação sensível (§5): a capacidade não vem do cargo, e o guard já barrou quem não a tem. Aqui
   * exige-se o que sustenta o ato depois — motivo tipificado e fundamentação escrita. A unidade
   * acompanha o contrato: deixar as duas coisas apontando para famílias diferentes produziria uma
   * casa cujo morador o sistema não sabe dizer quem é.
   */
  async transferir(contratoId: string, dados: DadosTransferencia): Promise<void> {
    const contrato = await this.exigirContrato(contratoId);

    if (!habitacao.podeTransferirTitularidade(contrato.situacao)) {
      throw new BadRequestException(
        `Contrato ${contrato.situacao.toLowerCase()} não admite transferência de titularidade.`,
      );
    }
    if (dados.paraTitularId === contrato.titularId) {
      throw new BadRequestException('O novo titular é o mesmo do contrato.');
    }
    if (dados.fundamentacao.trim().length < 20) {
      throw new BadRequestException(
        'Fundamente a transferência. É o que o controle interno vai ler para entender por que a unidade mudou de mãos.',
      );
    }

    await this.contratos.registrarTransferencia(
      contratoId,
      { ...dados, deTitularId: contrato.titularId, deFamiliaId: contrato.familiaId },
      this.autor,
    );
    await this.contratos.trocarTitular(contratoId, dados.paraTitularId, dados.paraFamiliaId);

    if (dados.paraFamiliaId !== contrato.familiaId) {
      await this.contratos.vincularUnidadeAFamilia(
        contrato.unidadeId,
        dados.paraFamiliaId,
        `Transferência de titularidade do contrato ${contrato.protocolo}: ${habitacao.rotuloMotivoTransferencia(dados.motivo)}`,
      );
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'ContratoMutuario',
      entidadeId: contratoId,
      diff: {
        transferencia: true,
        motivo: dados.motivo,
        deTitular: contrato.titularId,
        paraTitular: dados.paraTitularId,
        deFamilia: contrato.familiaId,
        paraFamilia: dados.paraFamiliaId,
      },
    });
  }

  private async exigirContrato(contratoId: string) {
    const contrato = await this.contratos.contrato(contratoId);
    if (!contrato) throw new NotFoundException('Contrato não encontrado.');
    return contrato;
  }
}
