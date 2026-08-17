import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import { getActiveContext, actorId } from '../../context/request-context';
import {
  RETOMADA_REPOSITORY,
  type DadosAberturaCaso,
  type DadosDecisao,
  type DadosDefesa,
  type DadosNotificacao,
  type RetomadaRepository,
} from '../domain/ports';

@Injectable()
export class RetomadaUseCase {
  constructor(
    @Inject(RETOMADA_REPOSITORY) private readonly casos: RetomadaRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolo: GeradorProtocolo,
  ) {}

  private get autor(): string {
    const ctx = getActiveContext();
    return ctx.userNome ?? actorId();
  }

  /**
   * Abre o processo.
   *
   * Um caso por unidade de cada vez: dois processos paralelos sobre a mesma casa produziriam duas
   * decisões, e a família não saberia de qual se defender.
   */
  async abrir(dados: DadosAberturaCaso): Promise<{ id: string; protocolo: string }> {
    const emAberto = await this.casos.casoAbertoNaUnidade(dados.unidadeId);
    if (emAberto) {
      throw new BadRequestException(
        `Esta unidade já tem o processo ${emAberto.protocolo} em andamento. Encerre-o antes de abrir outro.`,
      );
    }
    if (!dados.fundamentacaoLegal.trim()) {
      throw new BadRequestException(
        'Informe a base legal — cláusula do contrato, artigo da lei municipal ou condição do edital.',
      );
    }

    const protocolo = await this.protocolo.proximo('RET', new Date().getFullYear());
    const caso = await this.casos.abrirCaso(protocolo, dados);

    await this.casos.registrarAto(caso.id, {
      titulo: 'Processo aberto',
      detalhe: dados.descricao,
      autor: this.autor,
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'CasoRetomada',
      entidadeId: caso.id,
      diff: {
        protocolo,
        unidadeId: dados.unidadeId,
        ocorrenciaId: dados.ocorrenciaId,
        fundamentacaoLegal: dados.fundamentacaoLegal,
      },
    });

    return { id: caso.id, protocolo };
  }

  /** Tentativa de notificação que não encontrou a família. É o que autoriza o edital depois. */
  async registrarTentativaFrustrada(
    casoId: string,
    detalhe: string,
  ): Promise<{ tentativas: number; editalAdmissivel: boolean }> {
    const caso = await this.exigirCaso(casoId);
    if (caso.fase !== 'ABERTO') {
      throw new BadRequestException('A família já foi notificada neste processo.');
    }

    const tentativas = await this.casos.registrarTentativaFrustrada(casoId);

    await this.casos.registrarAto(casoId, {
      titulo: `Tentativa de notificação sem êxito (${tentativas}ª)`,
      detalhe,
      autor: this.autor,
    });
    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'CasoRetomada',
      entidadeId: casoId,
      diff: { tentativaFrustrada: tentativas, detalhe },
    });

    return { tentativas, editalAdmissivel: habitacao.editalAdmissivel(tentativas) };
  }

  /**
   * Notifica a família e abre o prazo de defesa.
   *
   * O edital só entra depois de a prefeitura ter procurado a pessoa: publicar sem procurar é a
   * forma mais fácil de tirar a casa de quem nunca soube do processo — e a mais fácil de anular
   * depois.
   */
  async notificar(
    casoId: string,
    dados: DadosNotificacao,
  ): Promise<{ prazoDefesaAte: string }> {
    const caso = await this.exigirCaso(casoId);

    if (caso.fase !== 'ABERTO') {
      throw new BadRequestException('Este processo já foi notificado.');
    }
    if (dados.notificadoEm > new Date()) {
      throw new BadRequestException('A ciência não pode estar no futuro.');
    }
    if (dados.forma === 'EDITAL' && !habitacao.editalAdmissivel(caso.tentativasFrustradas ?? 0)) {
      throw new BadRequestException(
        `Notificação por edital exige ao menos ${habitacao.TENTATIVAS_ANTES_DO_EDITAL} tentativas pessoais ou por AR registradas antes. Há ${caso.tentativasFrustradas ?? 0}.`,
      );
    }
    if (dados.forma !== 'EDITAL' && !dados.comprovanteKey) {
      throw new BadRequestException(
        'Anexe o comprovante da ciência (AR ou termo assinado) — é o que prova que a família foi notificada.',
      );
    }

    const dias = dados.prazoDefesaDias ?? (await this.casos.prazoDefesaPadrao());
    const prazo = habitacao.prazoDefesa(dados.notificadoEm, dias);

    await this.casos.registrarNotificacao(casoId, dados, prazo);
    await this.casos.moverFase(casoId, 'NOTIFICADO');

    await this.casos.registrarAto(casoId, {
      titulo: `Família notificada (${dados.forma === 'AR_CORREIO' ? 'AR pelos Correios' : dados.forma === 'PESSOAL' ? 'pessoalmente' : 'por edital'})`,
      detalhe: `Prazo de ${dias} dias para defesa, até ${prazo.toLocaleDateString('pt-BR')}.`,
      autor: this.autor,
      ocorridoEm: dados.notificadoEm,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'CasoRetomada',
      entidadeId: casoId,
      diff: {
        fase: 'NOTIFICADO',
        forma: dados.forma,
        notificadoEm: dados.notificadoEm.toISOString(),
        prazoDefesaAte: prazo.toISOString(),
      },
    });

    return { prazoDefesaAte: prazo.toISOString() };
  }

  /**
   * Registra a defesa da família.
   *
   * Aceita fora do prazo de propósito: defesa intempestiva é decidida no mérito por quem julga, e
   * recusar o protocolo na porta seria negar o direito antes de alguém tê-lo examinado.
   */
  async registrarDefesa(casoId: string, dados: DadosDefesa): Promise<{ intempestiva: boolean }> {
    const caso = await this.exigirCaso(casoId);

    if (caso.fase !== 'NOTIFICADO' && caso.fase !== 'EM_DEFESA') {
      throw new BadRequestException(
        'A defesa só entra depois da notificação e antes de o caso ir a análise.',
      );
    }

    const intempestiva = Boolean(
      caso.prazoDefesaAte && dados.apresentadaEm > new Date(caso.prazoDefesaAte),
    );

    await this.casos.registrarDefesa(casoId, dados);
    await this.casos.moverFase(casoId, 'EM_DEFESA');

    await this.casos.registrarAto(casoId, {
      titulo: intempestiva ? 'Defesa apresentada fora do prazo' : 'Defesa apresentada',
      detalhe: `Por ${dados.apresentadaPor}.`,
      autor: dados.apresentadaPor,
      ocorridoEm: dados.apresentadaEm,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'CasoRetomada',
      entidadeId: casoId,
      diff: {
        fase: 'EM_DEFESA',
        defesaApresentadaEm: dados.apresentadaEm.toISOString(),
        apresentadaPor: dados.apresentadaPor,
        intempestiva,
      },
    });

    return { intempestiva };
  }

  /** Fecha a instrução: o caso vai para quem decide. */
  async enviarParaAnalise(casoId: string): Promise<{ revelia: boolean }> {
    const caso = await this.exigirCaso(casoId);

    if (!habitacao.podeTransicionarCaso(caso.fase, 'EM_ANALISE')) {
      throw new BadRequestException(
        `Processo em ${caso.fase} não vai a análise. Notifique a família primeiro.`,
      );
    }

    const avaliacao = habitacao.avaliarCaso({ ...caso, fase: 'EM_ANALISE' }, new Date());
    const travas = avaliacao.impedimentos.filter((item) => item !== 'FASE_NAO_PERMITE');

    if (travas.length > 0) {
      throw new BadRequestException(
        travas.map((impedimento) => habitacao.MOTIVOS_IMPEDIMENTO[impedimento]),
      );
    }

    await this.casos.moverFase(casoId, 'EM_ANALISE');
    await this.casos.registrarAto(casoId, {
      titulo: 'Instrução encerrada',
      detalhe: avaliacao.revelia
        ? 'Prazo de defesa vencido sem manifestação da família.'
        : 'Defesa apresentada e juntada ao processo.',
      autor: this.autor,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'CasoRetomada',
      entidadeId: casoId,
      diff: { fase: 'EM_ANALISE', revelia: avaliacao.revelia },
    });

    return { revelia: avaliacao.revelia };
  }

  /**
   * Decide o caso.
   *
   * Revalida tudo no momento da decisão, e não apenas na transição: é aqui que a casa é perdida ou
   * mantida, e o custo de decidir sem notificação válida é o processo inteiro cair depois. A
   * fundamentação é obrigatória porque é a peça que enfrenta o que a defesa alegou — decisão sem
   * ela é ato sem motivo, nulo por vício de forma.
   */
  async decidir(casoId: string, dados: DadosDecisao): Promise<{ retiraUnidade: boolean }> {
    const caso = await this.exigirCaso(casoId);
    const avaliacao = habitacao.avaliarCaso(caso, new Date());

    if (!avaliacao.podeDecidir) {
      throw new BadRequestException(
        avaliacao.impedimentos.map((impedimento) => habitacao.MOTIVOS_IMPEDIMENTO[impedimento]),
      );
    }
    if (dados.fundamentacao.trim().length < 30) {
      throw new BadRequestException(
        'A fundamentação precisa enfrentar o que a defesa alegou. Uma linha não sustenta a decisão em juízo.',
      );
    }

    await this.casos.registrarDecisao(casoId, dados, this.autor);
    await this.casos.moverFase(casoId, 'DECIDIDO');

    const retiraUnidade = habitacao.decisaoRetiraUnidade(dados.decisao);

    await this.casos.registrarAto(casoId, {
      titulo: `Decisão: ${dados.decisao.toLowerCase()}`,
      detalhe: dados.fundamentacao,
      autor: this.autor,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'CasoRetomada',
      entidadeId: casoId,
      diff: {
        fase: 'DECIDIDO',
        decisao: dados.decisao,
        revelia: avaliacao.revelia,
        fundamentacao: dados.fundamentacao,
      },
    });

    return { retiraUnidade };
  }

  /**
   * Encerra o processo.
   *
   * A unidade NÃO muda de situação por aqui: retomar a posse é ato próprio, com quem entrega a
   * chave de volta e quem recebe. Encadear as duas coisas faria uma decisão no papel virar
   * desocupação no sistema sem que ninguém tivesse ido à casa.
   */
  async encerrar(casoId: string, motivo: string): Promise<void> {
    const caso = await this.exigirCaso(casoId);

    if (!habitacao.podeTransicionarCaso(caso.fase, 'ENCERRADO')) {
      throw new BadRequestException('Processo em análise precisa ser decidido antes de encerrar.');
    }
    if (!motivo.trim()) {
      throw new BadRequestException('Informe o motivo do encerramento.');
    }

    await this.casos.encerrarCaso(casoId, motivo.trim());
    await this.casos.registrarAto(casoId, {
      titulo: 'Processo encerrado',
      detalhe: motivo.trim(),
      autor: this.autor,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'CasoRetomada',
      entidadeId: casoId,
      diff: { fase: 'ENCERRADO', motivo: motivo.trim(), faseAnterior: caso.fase },
    });
  }

  private async exigirCaso(casoId: string) {
    const caso = await this.casos.caso(casoId);
    if (!caso) throw new NotFoundException('Processo não encontrado.');
    return caso;
  }
}
