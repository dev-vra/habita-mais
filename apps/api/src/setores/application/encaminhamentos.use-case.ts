import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { GERADOR_PROTOCOLO, TRILHA_AUDITORIA, type GeradorProtocolo, type TrilhaAuditoria } from '../../common/ports';
import { SETORES_REPOSITORY, type SetoresRepository } from '../domain/ports';

const TAMANHO_MINIMO_RESPOSTA = 20;

export interface AbrirEncaminhamentoEntrada {
  setorDestinoId: string;
  tipoSolicitacao: string;
  entidade: string;
  entidadeId: string;
  referenciaResumo: string;
  assunto: string;
  descricao: string;
  prazoAte: Date;
  agora: Date;
}

export interface ResponderEntrada {
  encaminhamentoId: string;
  resposta: string;
  anexoKey?: string;
  setorDoUsuario?: string;
}

/**
 * Tramitação entre setores.
 *
 * É o que liga Habitação, Defesa Civil, Jurídico e Obras sem fundir os módulos — e sem dar a
 * ninguém acesso ao que não lhe diz respeito. O setor de destino lê o resumo que a Habitação
 * escreveu, responde, e a resposta volta com efeito no processo.
 */
@Injectable()
export class EncaminhamentosUseCase {
  constructor(
    @Inject(SETORES_REPOSITORY) private readonly setores: SetoresRepository,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolos: GeradorProtocolo,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async abrir(
    entrada: AbrirEncaminhamentoEntrada,
    setorOrigemId: string | undefined,
  ): Promise<{ id: string; numero: string }> {
    const destino = await this.setores.buscarSetor(entrada.setorDestinoId);
    if (!destino || !destino.ativo) {
      throw new BadRequestException('Setor de destino não encontrado ou inativo.');
    }

    const origem = setorOrigemId ?? (await this.setores.setorDaHabitacao());
    if (!origem) {
      throw new BadRequestException(
        'Cadastre ao menos um setor de Habitação antes de encaminhar — o ofício precisa de origem.',
      );
    }
    if (origem === entrada.setorDestinoId) {
      throw new BadRequestException('Encaminhar para o próprio setor não move o processo.');
    }
    if (entrada.prazoAte <= entrada.agora) {
      throw new BadRequestException('O prazo precisa ser futuro — encaminhar sem prazo é arquivar.');
    }

    const numero = await this.protocolos.proximo('ENC', entrada.agora.getFullYear());
    const encaminhamento = await this.setores.criarEncaminhamento({
      numero,
      setorOrigemId: origem,
      setorDestinoId: entrada.setorDestinoId,
      tipoSolicitacao: entrada.tipoSolicitacao,
      entidade: entrada.entidade,
      entidadeId: entrada.entidadeId,
      referenciaResumo: entrada.referenciaResumo,
      assunto: entrada.assunto,
      descricao: entrada.descricao,
      prazoAte: entrada.prazoAte,
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Encaminhamento',
      entidadeId: encaminhamento.id,
      diff: {
        numero,
        destino: destino.sigla,
        tipo: entrada.tipoSolicitacao,
        referencia: `${entrada.entidade}:${entrada.entidadeId}`,
        prazoAte: entrada.prazoAte.toISOString(),
      },
    });

    return { id: encaminhamento.id, numero };
  }

  /**
   * Resposta do setor de destino.
   *
   * Quando o pedido era laudo de risco e veio documento anexado, o laudo passa a valer na ficha da
   * família — automaticamente. É a diferença entre "a Defesa Civil mandou um PDF" e "existe
   * evidência de terceiro sustentando a prioridade": a segunda é a que a fila precisa (spec §6.3),
   * e depender de alguém da Habitação lembrar de anexar seria depender de memória.
   */
  async responder(entrada: ResponderEntrada): Promise<{ efeito: string | null }> {
    const encaminhamento = await this.setores.buscarEncaminhamento(entrada.encaminhamentoId);
    if (!encaminhamento) throw new NotFoundException('Encaminhamento não encontrado.');

    if (encaminhamento.situacao !== 'ABERTO') {
      throw new BadRequestException('Este encaminhamento já foi encerrado.');
    }
    if (entrada.setorDoUsuario && entrada.setorDoUsuario !== encaminhamento.setorDestinoId) {
      throw new ForbiddenException('Só o setor de destino responde este encaminhamento.');
    }

    const resposta = entrada.resposta.trim();
    if (resposta.length < TAMANHO_MINIMO_RESPOSTA) {
      throw new BadRequestException('A resposta precisa dizer o que foi apurado.');
    }

    // O efeito vem ANTES de fechar o encaminhamento: a policy que autoriza o setor a tocar a ficha
    // exige o encaminhamento ABERTO. Fechar primeiro tiraria a própria autorização.
    const efeito = await this.aplicarEfeito(encaminhamento, entrada.anexoKey);

    await this.setores.registrarResposta({
      encaminhamentoId: entrada.encaminhamentoId,
      resposta,
      anexoKey: entrada.anexoKey,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Encaminhamento',
      entidadeId: entrada.encaminhamentoId,
      diff: {
        numero: encaminhamento.numero,
        situacao: 'RESPONDIDO',
        comAnexo: Boolean(entrada.anexoKey),
        efeitoNoProcesso: efeito,
      },
    });

    return { efeito };
  }

  /** Devolver sem responder: o setor declara que o pedido não é da competência dele. */
  async devolver(encaminhamentoId: string, motivo: string, setorDoUsuario?: string): Promise<void> {
    const encaminhamento = await this.setores.buscarEncaminhamento(encaminhamentoId);
    if (!encaminhamento) throw new NotFoundException('Encaminhamento não encontrado.');
    if (setorDoUsuario && setorDoUsuario !== encaminhamento.setorDestinoId) {
      throw new ForbiddenException('Só o setor de destino devolve este encaminhamento.');
    }
    if (motivo.trim().length < TAMANHO_MINIMO_RESPOSTA) {
      throw new BadRequestException('Diga por que o pedido não é da competência do setor.');
    }

    await this.setores.devolver(encaminhamentoId, motivo.trim());

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Encaminhamento',
      entidadeId: encaminhamentoId,
      diff: { numero: encaminhamento.numero, situacao: 'DEVOLVIDO', motivo: motivo.trim() },
    });
  }

  private async aplicarEfeito(
    encaminhamento: { tipoSolicitacao: string; entidade: string; entidadeId: string },
    anexoKey?: string,
  ): Promise<string | null> {
    if (encaminhamento.tipoSolicitacao !== 'LAUDO_RISCO' || !anexoKey) return null;
    if (encaminhamento.entidade !== 'Familia') return null;

    const aplicado = await this.setores.anexarLaudoNaFichaVigente(
      encaminhamento.entidadeId,
      anexoKey,
    );
    return aplicado ? 'laudo_de_risco_anexado_na_ficha' : null;
  }
}
