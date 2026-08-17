import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { MotorIA, PedidoAoModelo, RespostaDoModelo } from '../domain/ports';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const VERSAO_API = '2023-06-01';
/** Sonnet dá conta de rascunho e leitura de documento; Opus custaria caro por parecer. */
const MODELO_PADRAO = 'claude-sonnet-5';
const MAXIMO_TOKENS_PADRAO = 1200;
/** Rascunho que demora vira botão que ninguém aperta. */
const TIMEOUT_MS = 45_000;

/**
 * Adaptador da API da Anthropic.
 *
 * Sem SDK: uma chamada HTTP e um formato de resposta. Uma dependência a menos para acompanhar, e
 * a superfície que o produto usa cabe em vinte linhas.
 */
@Injectable()
export class AnthropicAdapter implements MotorIA {
  private readonly log = new Logger(AnthropicAdapter.name);
  private readonly chave = process.env.ANTHROPIC_API_KEY;
  private readonly modelo = process.env.IA_MODELO ?? MODELO_PADRAO;

  disponivel(): boolean {
    return Boolean(this.chave);
  }

  async gerar(pedido: PedidoAoModelo): Promise<RespostaDoModelo> {
    if (!this.chave) {
      throw new ServiceUnavailableException(
        'O assistente não está configurado nesta prefeitura. Escreva o texto normalmente.',
      );
    }

    const conteudo: unknown[] = [];
    if (pedido.documento) {
      conteudo.push({
        type: pedido.documento.midia === 'application/pdf' ? 'document' : 'image',
        source: {
          type: 'base64',
          media_type: pedido.documento.midia,
          data: pedido.documento.dados,
        },
      });
    }
    conteudo.push({ type: 'text', text: pedido.conteudo });

    const controle = AbortSignal.timeout(TIMEOUT_MS);

    try {
      const resposta = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.chave,
          'anthropic-version': VERSAO_API,
        },
        body: JSON.stringify({
          model: this.modelo,
          max_tokens: pedido.maximoTokens ?? MAXIMO_TOKENS_PADRAO,
          system: pedido.papel,
          messages: [{ role: 'user', content: conteudo }],
        }),
        signal: controle,
      });

      if (!resposta.ok) {
        // O corpo do erro pode conter o eco do que enviamos — fica no log do servidor, nunca na
        // tela de quem pediu.
        this.log.error(`Modelo respondeu ${resposta.status}: ${await resposta.text()}`);
        throw new ServiceUnavailableException(
          'O assistente não respondeu agora. Tente de novo ou escreva o texto normalmente.',
        );
      }

      const corpo = (await resposta.json()) as {
        content?: { type: string; text?: string }[];
        model?: string;
      };

      const texto = (corpo.content ?? [])
        .filter((parte) => parte.type === 'text')
        .map((parte) => parte.text ?? '')
        .join('\n')
        .trim();

      if (!texto) {
        throw new ServiceUnavailableException('O assistente devolveu uma resposta vazia.');
      }

      return { texto, modelo: corpo.model ?? this.modelo };
    } catch (erro) {
      if (erro instanceof ServiceUnavailableException) throw erro;

      this.log.error(`Falha ao falar com o modelo: ${String(erro)}`);
      throw new ServiceUnavailableException(
        'O assistente está fora do ar. O texto pode ser escrito normalmente.',
      );
    }
  }
}
