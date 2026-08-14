import { Injectable, Logger } from '@nestjs/common';
import { onlyDigits } from '@habita/shared/br';
import { HubClient } from './hub.client';

export interface EnderecoCep {
  cep: string;
  logradouro: string;
  bairro: string;
  municipio: string;
  uf: string;
}

/** Campos do endpoint `cep3` do Hub (cidade vem em `localidade`, como no ViaCEP). */
interface HubCep {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

/**
 * Gateway de CEP (camada anticorrupção). Provedor primário: Hub do Desenvolvedor (mesma escolha do Regulariza+);
 * fallback grátis ViaCEP (CEP é público e sem custo) — mantém o autofill no ar se o Hub falhar
 * (sem saldo, IP não autorizado). Trocável sem tocar nos chamadores.
 */
@Injectable()
export class CepGateway {
  private readonly logger = new Logger(CepGateway.name);
  private static readonly TIMEOUT_MS = 5000;

  constructor(private readonly hub: HubClient) {}

  /** Consulta um CEP. Retorna null se não encontrado ou indisponível. */
  async consultar(cepBruto: string): Promise<EnderecoCep | null> {
    const cep = onlyDigits(cepBruto);
    if (cep.length !== 8) return null;

    const r = await this.hub.consultar<HubCep>('cep3', { cep }, CepGateway.TIMEOUT_MS);
    if (r.ok) {
      return {
        cep,
        logradouro: r.result.logradouro ?? '',
        bairro: r.result.bairro ?? '',
        municipio: r.result.localidade ?? '',
        uf: r.result.uf ?? '',
      };
    }
    return this.viaCep(cep);
  }

  /** Fallback público (ViaCEP). Sem chave, sem custo. */
  private async viaCep(cep: string): Promise<EnderecoCep | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CepGateway.TIMEOUT_MS);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctrl.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) return null;
      return {
        cep,
        logradouro: data.logradouro ?? '',
        bairro: data.bairro ?? '',
        municipio: data.localidade ?? '',
        uf: data.uf ?? '',
      };
    } catch (e) {
      this.logger.warn(`Falha ao consultar CEP ${cep} (fallback): ${(e as Error).message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
