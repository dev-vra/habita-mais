import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import {
  POS_ENTREGA_REPOSITORY,
  type DadosAcompanhamento,
  type DadosOcorrencia,
  type PosEntregaRepository,
} from '../domain/ports';

@Injectable()
export class PosEntregaUseCase {
  constructor(
    @Inject(POS_ENTREGA_REPOSITORY) private readonly repositorio: PosEntregaRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolo: GeradorProtocolo,
  ) {}

  /**
   * Registra a visita de acompanhamento.
   *
   * Só faz sentido em unidade entregue: visitar quem ainda não recebeu a chave é vistoria de obra,
   * e misturar as duas coisas faria o indicador de Trabalho Social contar visita que não é dele.
   *
   * A próxima visita é calculada e gravada aqui — a lista de unidades precisa mostrar o vencimento
   * sem recalcular linha a linha.
   */
  async registrarAcompanhamento(
    dados: DadosAcompanhamento,
  ): Promise<{ id: string; protocolo: string; proximaVisitaEm: string | null }> {
    const unidade = await this.repositorio.estadoDaUnidade(dados.unidadeId);
    if (!unidade) throw new NotFoundException('Unidade não encontrada.');

    if (!habitacao.exigeAcompanhamento(unidade.situacao)) {
      throw new BadRequestException(
        `Unidade ${habitacao.rotuloSituacaoUnidade(unidade.situacao).toLowerCase()} não está em acompanhamento pós-entrega.`,
      );
    }
    if (dados.visitadaEm > new Date()) {
      throw new BadRequestException('A visita não pode estar no futuro.');
    }
    if (!dados.residenciaConfirmada && !dados.quemReside?.trim()) {
      throw new BadRequestException(
        'Se o titular não foi encontrado, descreva quem estava na unidade — é o que sustenta qualquer apuração depois.',
      );
    }

    const periodicidade = await this.repositorio.parametrosAcompanhamento();
    const avaliacao = habitacao.avaliarAcompanhamento(
      {
        entregueEm: unidade.entregueEm,
        ultimaVisitaEm: dados.visitadaEm.toISOString(),
        exigeAcompanhamento: true,
      },
      dados.visitadaEm,
      periodicidade,
    );

    const protocolo = await this.protocolo.proximo('VIS', new Date().getFullYear());
    const proxima = avaliacao.proximaVisitaEm ? new Date(avaliacao.proximaVisitaEm) : null;

    const acompanhamento = await this.repositorio.registrarAcompanhamento(
      protocolo,
      dados,
      proxima,
    );

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'AcompanhamentoUnidade',
      entidadeId: acompanhamento.id,
      diff: {
        protocolo,
        unidadeId: dados.unidadeId,
        tipo: dados.tipo,
        residenciaConfirmada: dados.residenciaConfirmada,
        eixosCriticos: dados.eixos.filter((eixo) => eixo.situacao === 'CRITICA').map((e) => e.eixo),
        proximaVisitaEm: avaliacao.proximaVisitaEm,
      },
    });

    return { id: acompanhamento.id, protocolo, proximaVisitaEm: avaliacao.proximaVisitaEm };
  }

  /**
   * Abre a ocorrência de uso.
   *
   * A gravidade não é escolhida por quem registra: vem do tipo do fato, pela mesma tabela em API e
   * tela. Deixar o campo aberto faria a mesma irregularidade valer coisas diferentes conforme quem
   * digitou — e é sobre esse número que a decisão de retomar uma casa se apoia.
   */
  async abrirOcorrencia(dados: DadosOcorrencia): Promise<{
    id: string;
    protocolo: string;
    gravidade: habitacao.GravidadeOcorrencia;
    exigeApuracao: boolean;
    encaminhamento: string;
  }> {
    const unidade = await this.repositorio.estadoDaUnidade(dados.unidadeId);
    if (!unidade) throw new NotFoundException('Unidade não encontrada.');
    if (!unidade.entregueEm) {
      throw new BadRequestException('Unidade ainda não entregue não tem ocorrência de uso.');
    }
    if (dados.constatadaEm > new Date()) {
      throw new BadRequestException('A constatação não pode estar no futuro.');
    }

    const regra = habitacao.regraDaOcorrencia(dados.tipo);
    const protocolo = await this.protocolo.proximo('FIS', new Date().getFullYear());
    const ocorrencia = await this.repositorio.abrirOcorrencia(protocolo, dados, regra.gravidade);

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'OcorrenciaUnidade',
      entidadeId: ocorrencia.id,
      diff: {
        protocolo,
        unidadeId: dados.unidadeId,
        tipo: dados.tipo,
        gravidade: regra.gravidade,
        origem: dados.origem,
      },
    });

    return {
      id: ocorrencia.id,
      protocolo,
      gravidade: regra.gravidade,
      exigeApuracao: habitacao.exigeApuracao(dados.tipo),
      encaminhamento: regra.encaminhamento,
    };
  }

  /**
   * Move a ocorrência pelo caminho formal.
   *
   * Notificar carimba a data e calcula o prazo de regularização a partir dela — o prazo nasce da
   * notificação, não da constatação, porque é da notificação que a família toma ciência. Encerrar
   * exige motivo em qualquer direção: arquivar sem explicação é o que ninguém consegue defender
   * depois.
   */
  async moverOcorrencia(
    ocorrenciaId: string,
    situacao: habitacao.SituacaoOcorrencia,
    motivo: string | undefined,
  ): Promise<{ prazoRegularizacaoAte: string | null }> {
    const ocorrencia = await this.repositorio.ocorrencia(ocorrenciaId);
    if (!ocorrencia) throw new NotFoundException('Ocorrência não encontrada.');

    if (!habitacao.podeTransicionarOcorrencia(ocorrencia.situacao, situacao)) {
      const permitidas = habitacao.transicoesOcorrencia(ocorrencia.situacao);
      throw new BadRequestException(
        permitidas.length === 0
          ? `Ocorrência ${habitacao.rotuloSituacaoOcorrencia(ocorrencia.situacao).toLowerCase()} está encerrada. Fato novo exige ocorrência nova.`
          : `De ${ocorrencia.situacao} só é possível ir para: ${permitidas.join(', ')}.`,
      );
    }

    const encerra =
      situacao === 'REGULARIZADA' ||
      situacao === 'IMPROCEDENTE' ||
      situacao === 'ENCAMINHADA_JURIDICO';

    if (encerra && !motivo?.trim()) {
      throw new BadRequestException(
        'Informe o motivo — é o que explica a decisão para quem ler o processo depois.',
      );
    }

    const notificadaEm = situacao === 'NOTIFICADA' ? new Date() : undefined;
    const prazo = notificadaEm ? habitacao.prazoRegularizacao(ocorrencia.tipo, notificadaEm) : undefined;

    await this.repositorio.moverOcorrencia(ocorrenciaId, situacao, {
      notificadaEm,
      prazoRegularizacaoAte: prazo,
      motivo: motivo?.trim(),
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'OcorrenciaUnidade',
      entidadeId: ocorrenciaId,
      diff: {
        de: ocorrencia.situacao,
        para: situacao,
        motivo: motivo?.trim(),
        prazoRegularizacaoAte: prazo?.toISOString() ?? null,
      },
    });

    return { prazoRegularizacaoAte: prazo?.toISOString() ?? null };
  }
}
