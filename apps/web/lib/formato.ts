/**
 * Formatação de exibição. Armazenar canônico, exibir formatado — a régua é a mesma do
 * `@habita/shared/br`; aqui ficam só os formatos de tela que a API não precisa conhecer.
 */

/** Real com símbolo. Valor de contrato e medição sempre aparece por extenso, nunca em número seco. */
export function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Real compacto para cartão e tabela larga: R$ 6,8 mi em vez de R$ 6.800.000,00.
 * Só onde o número é referência de grandeza — em conferência de pagamento, nunca.
 */
export function moedaCompacta(valor: number): string {
  if (Math.abs(valor) >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(valor) >= 1_000) {
    return `R$ ${(valor / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  }
  return moeda(valor);
}

export function percentual(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function data(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}
