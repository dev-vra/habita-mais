import { Injectable, Logger } from '@nestjs/common';

/** Resultado normalizado de uma consulta ao Hub (camada anticorrupção). */
export type HubResultado<T> =
  | { ok: true; result: T }
  | { ok: false; motivo: 'nao_encontrado' | 'indisponivel' | 'operacional' };

interface HubEnvelope<T> {
  status?: boolean;
  return?: string; // "OK" | "NOK"
  consumed?: number;
  result?: T;
  message?: string;
}

/**
 * Cliente do Hub do Desenvolvedor (hubdodesenvolvedor.com.br) — provedor de CPF/CNPJ/CEP (mesma escolha do Regulariza+).
 * Token na query string. Envelope: `{ return: "OK"|"NOK", result, message }`. Trocável: os
 * gateways (CEP/CNPJ/CPF) dependem desta classe, nunca de `fetch` direto. Nunca loga o documento.
 */
@Injectable()
export class HubClient {
  private readonly logger = new Logger(HubClient.name);
  private static readonly BASE = 'https://ws.hubdodesenvolvedor.com.br/v2';
  private readonly token = process.env.HUB_TOKEN ?? '';

  /** Há token configurado? Sem ele, as consultas caem em modo indisponível (igual EmailService). */
  get configurado(): boolean {
    return this.token.length > 0;
  }

  /** Consulta um produto do Hub. `params` NÃO deve ser logado (contém o documento). */
  async consultar<T>(
    produto: string,
    params: Record<string, string>,
    timeoutMs = 12_000,
  ): Promise<HubResultado<T>> {
    if (!this.token) {
      this.logger.warn(`[DEV] HUB_TOKEN ausente — consulta "${produto}" não realizada.`);
      return { ok: false, motivo: 'indisponivel' };
    }

    const qs = new URLSearchParams({ ...params, token: this.token }).toString();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${HubClient.BASE}/${produto}/?${qs}`, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`Hub "${produto}" respondeu HTTP ${res.status}.`);
        return { ok: false, motivo: 'indisponivel' };
      }
      const env = (await res.json()) as HubEnvelope<T>;
      if (env.return === 'OK' && env.result) return { ok: true, result: env.result };

      const msg = env.message ?? '';
      // Sem saldo / token inválido / IP não autorizado: problema operacional, não "não encontrado".
      if (/sem saldo|token (inv|bloque)|ip de origem|limite excedido/i.test(msg)) {
        this.logger.error(`Hub "${produto}" — falha operacional: ${msg}`);
        return { ok: false, motivo: 'operacional' };
      }
      this.logger.warn(`Hub "${produto}" NOK${msg ? `: ${msg}` : ''}.`);
      return { ok: false, motivo: 'nao_encontrado' };
    } catch (e) {
      this.logger.warn(`Hub "${produto}" indisponível: ${(e as Error).message}`);
      return { ok: false, motivo: 'indisponivel' };
    } finally {
      clearTimeout(timer);
    }
  }
}
