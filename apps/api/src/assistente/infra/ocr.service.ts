import { Injectable, Logger } from '@nestjs/common';
import { br } from '@habita/shared';

/** Confiança média do Tesseract a partir da qual o texto é confiável o bastante para dispensar IA. */
const CONFIANCA_BOA = 65;
/** Abaixo disto o texto é ruído: nem serve para mandar ao modelo — vai a imagem mesmo. */
const CONFIANCA_MINIMA = 40;

export interface ResultadoOcr {
  texto: string;
  /** Média de confiança das palavras, 0 a 100. */
  confianca: number;
  /** Dá para confiar no texto sem revisão de modelo? */
  confiavel: boolean;
  /** O texto presta ao menos para o modelo estruturar, em vez de mandar a imagem? */
  aproveitavel: boolean;
}

/**
 * OCR local com Tesseract.
 *
 * Vem antes do modelo por economia: comprovante de residência e conta de luz são impressos, com
 * fonte limpa, e o Tesseract lê bem. Quando ele resolve, a prefeitura não gasta chamada de IA — e
 * a maioria dos documentos do balcão é justamente esse caso.
 *
 * Roda em WASM, sem binário do sistema e sem root. O modelo de português é baixado uma vez e fica
 * em cache no disco.
 */
@Injectable()
export class OcrService {
  private readonly log = new Logger(OcrService.name);

  async ler(dados: Buffer): Promise<ResultadoOcr | null> {
    try {
      // Import dinâmico: o pacote carrega WASM e só deve subir quando alguém realmente usa OCR.
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');

      try {
        const { data } = await worker.recognize(dados);
        const confianca = Math.round(data.confidence ?? 0);

        return {
          texto: (data.text ?? '').trim(),
          confianca,
          confiavel: confianca >= CONFIANCA_BOA,
          aproveitavel: confianca >= CONFIANCA_MINIMA,
        };
      } finally {
        await worker.terminate();
      }
    } catch (erro) {
      // OCR é atalho, não requisito: falhando, o documento segue para o modelo como sempre seguiu.
      this.log.warn(`OCR indisponível, seguindo para o modelo: ${String(erro)}`);
      return null;
    }
  }
}

/**
 * Campos que se reconhecem por formato, sem precisar entender o documento.
 *
 * É aqui que a economia acontece de fato: quando tudo o que se pede tem padrão fixo — CPF, CEP,
 * data, valor — o texto do OCR basta e nenhuma chamada de IA é feita.
 */
const PADROES: Record<string, RegExp> = {
  cpf: /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/,
  cnpj: /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/,
  cep: /\b(\d{5}-?\d{3})\b/,
  nis: /\b(\d{11})\b/,
  rg: /\b(\d{1,2}\.?\d{3}\.?\d{3}-?[\dxX])\b/,
  data: /\b(\d{2}\/\d{2}\/\d{4})\b/,
  datanascimento: /\b(\d{2}\/\d{2}\/\d{4})\b/,
  // O balcão chama a mesma coisa de vários nomes. Sem os sinônimos, "vencimento" cairia na IA
  // para ler uma data que o próprio sistema já reconhece.
  vencimento: /\b(\d{2}\/\d{2}\/\d{4})\b/,
  emissao: /\b(\d{2}\/\d{2}\/\d{4})\b/,
  validade: /\b(\d{2}\/\d{2}\/\d{4})\b/,
  competencia: /\b(\d{2}\/\d{4})\b/,
  valor: /R\$\s?([\d.]+,\d{2})/,
  telefone: /\(?(\d{2})\)?\s?9?\d{4}-?\d{4}/,
};

export interface ExtracaoLocal {
  campos: Record<string, string | null>;
  /** Todos os campos pedidos foram resolvidos pelo padrão? Se sim, não precisa de IA. */
  completa: boolean;
}

/**
 * Tenta resolver os campos pedidos direto no texto do OCR.
 *
 * Nome de pessoa e endereço não entram: exigem entender o documento, não casar um formato. Quando
 * um deles é pedido, a extração local nunca fica completa — e a chamada ao modelo é justificada.
 */
export function extrairPorPadrao(texto: string, campos: readonly string[]): ExtracaoLocal {
  const encontrados: Record<string, string | null> = {};
  let resolvidos = 0;

  for (const campo of campos) {
    const chave = campo.toLowerCase().replace(/[^a-z]/g, '');
    const padrao = PADROES[chave];

    if (!padrao) {
      encontrados[campo] = null;
      continue;
    }

    const valor = padrao.exec(texto)?.[1] ?? null;
    // Documento com dígito verificador se valida sozinho: ou o OCR leu certo, ou o número não
    // fecha. Isso vale mais do que a confiança média que o Tesseract reporta.
    const valido = valor !== null && confere(chave, valor);

    encontrados[campo] = valido ? valor : null;
    if (valido) resolvidos += 1;
  }

  return { campos: encontrados, completa: campos.length > 0 && resolvidos === campos.length };
}

function confere(chave: string, valor: string): boolean {
  if (chave === 'cpf') return br.isValidCpf(valor);
  if (chave === 'cnpj') return br.isValidCnpj(br.normalizeCnpj(valor));
  if (chave === 'cep') return br.isValidCep(valor);
  return true;
}
