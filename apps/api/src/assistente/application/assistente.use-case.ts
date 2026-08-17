import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { MOTOR_IA, type MotorIA } from '../domain/ports';

/**
 * Papel do assistente. É a mesma instrução para todos os usos, e ela existe para conter o modelo:
 * ele escreve rascunho de servidor público, não opinião. As três proibições finais são as que
 * impedem o texto de virar decisão disfarçada de sugestão.
 */
const PAPEL = `Você redige rascunhos para servidores da Secretaria de Habitação de uma prefeitura brasileira.

Como escrever:
- Português do Brasil, formal e direto, sem adjetivos de efeito.
- Frases curtas. Nada de introdução nem de conclusão genérica.
- Só afirme o que estiver nos dados fornecidos. Se falta informação, escreva "não informado".
- Trate a família com respeito: descreva a situação, nunca julgue as pessoas.

Nunca faça, em nenhuma hipótese:
- Sugerir pontuação, posição na fila, contemplação, corte de benefício ou retomada de unidade.
- Recomendar deferimento ou indeferimento.
- Inventar dado que não foi informado.

O texto que você produz é um RASCUNHO que será lido, editado e assinado por um servidor.`;

interface ContextoSugestao {
  uso: habitacao.UsoIA;
  entidade: string;
  entidadeId: string;
  conteudo: string;
  documento?: { midia: string; dados: string };
  maximoTokens?: number;
}

@Injectable()
export class AssistenteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MOTOR_IA) private readonly motor: MotorIA,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  disponivel(): boolean {
    return this.motor.disponivel();
  }

  /**
   * Gera o rascunho e registra o que saiu, o que voltou e quem pediu.
   *
   * A máscara é aplicada aqui, e não em cada chamador: um uso novo que esqueça de mascarar seria
   * um vazamento silencioso, e o lugar de impedir isso é o caminho por onde todos passam.
   */
  private async gerar(contexto: ContextoSugestao) {
    const ctx = getActiveContext();
    const ator = actorId();
    const conteudoMascarado = habitacao.mascararParaEnvio(contexto.conteudo);

    const resposta = await this.motor.gerar({
      papel: PAPEL,
      conteudo: conteudoMascarado,
      documento: contexto.documento,
      maximoTokens: contexto.maximoTokens,
    });

    const sugestao = await this.prisma.tx.sugestaoIA.create({
      data: {
        tenantId: ctx.tenantId ?? '',
        uso: contexto.uso,
        entidade: contexto.entidade,
        entidadeId: contexto.entidadeId,
        entradaEnviada: conteudoMascarado,
        respostaBruta: resposta.texto,
        modelo: resposta.modelo,
        solicitadoPor: ctx.userNome ?? ator,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'SugestaoIA',
      entidadeId: sugestao.id,
      diff: {
        uso: contexto.uso,
        sobre: `${contexto.entidade}:${contexto.entidadeId}`,
        modelo: resposta.modelo,
      },
    });

    return {
      sugestaoId: sugestao.id,
      texto: resposta.texto,
      modelo: resposta.modelo,
      aviso: habitacao.AVISO_PADRAO,
    };
  }

  /**
   * Rascunho do parecer da visita pós-entrega.
   *
   * O nome da família vira iniciais antes de sair: quem revisa está olhando a ficha e sabe de quem
   * se trata; o modelo não precisa saber.
   */
  async rascunharParecerVisita(entrada: {
    acompanhamentoId: string;
    unidade: string;
    familia: string;
    residenciaConfirmada: boolean;
    quemReside?: string;
    moradoresEncontrados?: number;
    eixos: { eixo: string; situacao: string; observacao?: string }[];
    anotacoes?: string;
  }) {
    const eixos = entrada.eixos
      .map(
        (item) =>
          `- ${habitacao.rotuloEixo(item.eixo)}: ${habitacao.rotuloSituacaoEixo(item.situacao)}${item.observacao ? ` (${item.observacao})` : ''}`,
      )
      .join('\n');

    const conteudo = `Redija o parecer técnico de uma visita de acompanhamento pós-entrega, em até 3 parágrafos curtos.

Unidade: ${entrada.unidade}
Família: ${habitacao.iniciais(entrada.familia)}
Titular encontrado morando na unidade: ${entrada.residenciaConfirmada ? 'sim' : 'não'}
${entrada.quemReside ? `Quem foi encontrado: ${entrada.quemReside}` : ''}
${entrada.moradoresEncontrados !== undefined ? `Moradores encontrados: ${entrada.moradoresEncontrados}` : ''}

Eixos do Trabalho Social avaliados:
${eixos}

${entrada.anotacoes ? `Anotações do técnico em campo:\n${entrada.anotacoes}` : ''}

Estruture assim: o que foi encontrado na unidade; a situação por eixo, citando só os que fugiram do adequado; e o que ficou encaminhado. Não proponha decisão sobre a moradia.`;

    return this.gerar({
      uso: 'RASCUNHO_PARECER_VISITA',
      entidade: 'AcompanhamentoUnidade',
      entidadeId: entrada.acompanhamentoId,
      conteudo,
    });
  }

  /** Resumo do caso para o setor que vai receber o encaminhamento. */
  async rascunharResumoEncaminhamento(entrada: {
    familiaId: string;
    familia: string;
    tipoSolicitacao: string;
    contexto: string;
  }) {
    const conteudo = `Resuma o caso abaixo em um parágrafo, para o setor que vai receber o encaminhamento entender do que se trata sem abrir o processo.

Família: ${habitacao.iniciais(entrada.familia)}
O que se pede: ${habitacao.rotuloTipoSolicitacao(entrada.tipoSolicitacao)}

Situação:
${entrada.contexto}

Diga o que se pede e por quê. Não sugira o que o outro setor deve responder.`;

    return this.gerar({
      uso: 'RESUMO_ENCAMINHAMENTO',
      entidade: 'Familia',
      entidadeId: entrada.familiaId,
      conteudo,
      maximoTokens: 500,
    });
  }

  /**
   * Extrai campos de um documento anexado.
   *
   * Devolve JSON para a tela pré-preencher os campos — e é a pessoa que confere contra o papel
   * antes de gravar. O visualizador lateral existe exatamente para isso.
   */
  async extrairDocumento(entrada: {
    documentoId: string;
    tipoDocumento: string;
    campos: string[];
    midia: string;
    dados: string;
  }) {
    const conteudo = `Leia o documento anexado (${entrada.tipoDocumento}) e extraia os campos abaixo.

Campos: ${entrada.campos.join(', ')}

Responda APENAS um objeto JSON, sem texto em volta, no formato {"campo": "valor"}. Use null quando o campo não estiver legível ou não existir no documento. Não deduza, não complete e não corrija o que está escrito — copie o que está no papel.`;

    return this.gerar({
      uso: 'EXTRACAO_DOCUMENTO',
      entidade: 'Documento',
      entidadeId: entrada.documentoId,
      conteudo,
      documento: { midia: entrada.midia, dados: entrada.dados },
      maximoTokens: 800,
    });
  }

  /**
   * Registra o que a pessoa fez com o rascunho.
   *
   * É a metade do contrato que dá sentido à outra: sem saber se o texto foi aceito, editado ou
   * jogado fora, o registro de que a máquina escreveu algo não serve para nada — nem para
   * auditoria, nem para saber se o assistente ajuda de fato.
   */
  async registrarDesfecho(
    sugestaoId: string,
    desfecho: habitacao.DesfechoSugestao,
    textoFinal?: string,
  ): Promise<void> {
    const sugestao = await this.prisma.tx.sugestaoIA.findUnique({
      where: { id: sugestaoId },
      select: { id: true, desfecho: true, respostaBruta: true },
    });
    if (!sugestao) throw new NotFoundException('Sugestão não encontrada.');
    if (sugestao.desfecho !== 'PROPOSTA') {
      throw new BadRequestException('O desfecho desta sugestão já foi registrado.');
    }

    const ctx = getActiveContext();

    await this.prisma.tx.sugestaoIA.update({
      where: { id: sugestaoId },
      data: {
        desfecho,
        textoFinal: textoFinal ?? null,
        decididoEm: new Date(),
        decididoPor: ctx.userNome ?? actorId(),
        updatedBy: actorId(),
      },
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'SugestaoIA',
      entidadeId: sugestaoId,
      diff: {
        desfecho,
        // O texto final não entra na trilha: já está na tabela, e duplicá-lo espalharia conteúdo
        // social por mais um lugar.
        editado: desfecho === 'EDITADA',
      },
    });
  }
}
