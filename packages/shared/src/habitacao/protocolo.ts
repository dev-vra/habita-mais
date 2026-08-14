// Protocolo público — o número que o munícipe usa para entrar na central e acompanhar o pedido.
// Formato: SÉRIE-AAAA/NNNNN (ex.: HAB-2026/00418). A série diz de que pedido se trata; o
// sequencial é por tenant + série + ano, gerado no banco.

export const SERIES_PROTOCOLO = {
  HAB: 'Inscrição em programa habitacional',
  AUX: 'Auxílio aluguel social',
  MUT: 'Contrato de mutuário',
  REA: 'Caso de reassentamento',
  FIS: 'Ocorrência de fiscalização',
  OFC: 'Ofício de convocação',
  REC: 'Recurso contra a classificação',
  FAM: 'Cadastro de família',
} as const;

export type SerieProtocolo = keyof typeof SERIES_PROTOCOLO;

const DIGITOS_SEQUENCIAL = 5;

const PADRAO_PROTOCOLO = /^(HAB|AUX|MUT|REA|FIS|OFC|REC|FAM)-(\d{4})\/(\d{5})$/;

export interface ProtocoloPartes {
  serie: SerieProtocolo;
  ano: number;
  sequencial: number;
}

export function formatarProtocolo({ serie, ano, sequencial }: ProtocoloPartes): string {
  return `${serie}-${ano}/${String(sequencial).padStart(DIGITOS_SEQUENCIAL, '0')}`;
}

/** Devolve as partes do protocolo, ou null se o formato não bate — nunca lança. */
export function lerProtocolo(valor: string): ProtocoloPartes | null {
  const casamento = PADRAO_PROTOCOLO.exec(valor.trim().toUpperCase());
  if (!casamento) return null;

  const [, serie, ano, sequencial] = casamento;
  return {
    serie: serie as SerieProtocolo,
    ano: Number(ano),
    sequencial: Number(sequencial),
  };
}

export function isProtocoloValido(valor: string): boolean {
  return lerProtocolo(valor) !== null;
}
