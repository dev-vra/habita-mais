import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { MotorIA, PedidoAoModelo, RespostaDoModelo } from '../domain/ports';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELO_PADRAO = 'gemini-3.7-flash';
const MAXIMO_TOKENS_PADRAO = 1200;
/** Rascunho que demora vira botão que ninguém aperta. */
const TIMEOUT_MS = 45_000;
/**
 * Temperatura baixa: parecer de servidor não é texto criativo. Quanto menos o modelo inventa
 * variação, mais previsível fica o rascunho que a pessoa vai editar.
 */
const TEMPERATURA = 0.3;

/**
 * Adaptador do Gemini (Google AI Studio).
 *
 * Sem SDK: uma chamada HTTP e um formato de resposta — uma dependência a menos para acompanhar.
 * Trocar de fornecedor custou este arquivo e uma linha no módulo, que é exatamente o que o port
 * `MotorIA` existe para garantir.
 */
@Injectable()
export class GeminiAdapter implements MotorIA {
  private readonly log = new Logger(GeminiAdapter.name);
  private readonly chave = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  private readonly modelo = process.env.IA_MODELO ?? MODELO_PADRAO;
  /** Extração e leitura de campo: mais barato, e a qualidade não muda para copiar o que está no papel. */
  private readonly modeloBarato = process.env.IA_MODELO_BARATO ?? 'gemini-3.5-flash-lite';

  disponivel(): boolean {
    return Boolean(this.chave);
  }

  /** 'barato' é apelido, não nome de modelo: quem troca o modelo mexe no .env, não no código. */
  private escolher(pedido?: string): string {
    return pedido === 'barato' ? this.modeloBarato : this.modelo;
  }

  async gerar(pedido: PedidoAoModelo): Promise<RespostaDoModelo> {
    if (!this.chave) {
      throw new ServiceUnavailableException(
        'O assistente não está configurado nesta prefeitura. Escreva o texto normalmente.',
      );
    }

    const partes: unknown[] = [];
    if (pedido.documento) {
      partes.push({
        inline_data: { mime_type: pedido.documento.midia, data: pedido.documento.dados },
      });
    }
    partes.push({ text: pedido.conteudo });

    try {
      const resposta = await fetch(
        `${ENDPOINT}/${this.escolher(pedido.modelo)}:generateContent?key=${this.chave}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: pedido.papel }] },
            contents: [{ role: 'user', parts: partes }],
            generationConfig: {
              maxOutputTokens: pedido.maximoTokens ?? MAXIMO_TOKENS_PADRAO,
              temperature: TEMPERATURA,
              // O Gemini 3.x cobra o raciocínio dentro do teto de saída: com "thinking" ligado, a
              // resposta chegava cortada no meio do JSON e a extração voltava vazia. Rascunho de
              // parecer e leitura de campo não precisam de raciocínio longo — precisam sair
              // inteiros.
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );

      if (!resposta.ok) {
        // O corpo do erro pode ecoar o que enviamos — fica no log do servidor, nunca na tela.
        this.log.error(`Modelo respondeu ${resposta.status}: ${await resposta.text()}`);
        throw new ServiceUnavailableException(
          'O assistente não respondeu agora. Tente de novo ou escreva o texto normalmente.',
        );
      }

      const corpo = (await resposta.json()) as {
        candidates?: {
          content?: { parts?: { text?: string }[] };
          finishReason?: string;
        }[];
        modelVersion?: string;
      };

      const candidato = corpo.candidates?.[0];
      const texto = (candidato?.content?.parts ?? [])
        .map((parte) => parte.text ?? '')
        .join('\n')
        .trim();

      if (!texto) {
        // SAFETY é o caso real aqui: ficha social fala de violência, deficiência e vulnerabilidade,
        // e um filtro genérico às vezes recusa. O servidor precisa saber que foi recusa, não bug.
        const motivo = candidato?.finishReason ?? 'desconhecido';
        this.log.warn(`Resposta vazia do modelo (finishReason=${motivo}).`);

        throw new ServiceUnavailableException(
          motivo === 'SAFETY'
            ? 'O assistente recusou gerar este texto. Escreva o parecer normalmente — o conteúdo do caso não é problema do processo.'
            : 'O assistente devolveu uma resposta vazia.',
        );
      }

      return { texto, modelo: corpo.modelVersion ?? this.escolher(pedido.modelo) };
    } catch (erro) {
      if (erro instanceof ServiceUnavailableException) throw erro;

      this.log.error(`Falha ao falar com o modelo: ${String(erro)}`);
      throw new ServiceUnavailableException(
        'O assistente está fora do ar. O texto pode ser escrito normalmente.',
      );
    }
  }
}
