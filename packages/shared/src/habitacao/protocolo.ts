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
  ENC: 'Encaminhamento entre setores',
  DOC: 'Documento juntado ao processo',
  PIL: 'Pilha documental',
  CNV: 'Convênio de repasse',
  EMP: 'Empreendimento habitacional',
  /// Medição de obra — é ordem de pagamento com outro nome, e por isso tem número desde o rascunho.
  MED: 'Medição de obra',
  /// Número público da casa: acompanha do registro em cartório à eventual retomada.
  UNI: 'Unidade habitacional',
  /// Visita de acompanhamento pós-entrega.
  VIS: 'Visita de acompanhamento',
  /// Processo de retomada de unidade.
  RET: 'Processo de retomada',
} as const;

export type SerieProtocolo = keyof typeof SERIES_PROTOCOLO;

const DIGITOS_SEQUENCIAL = 5;

const PADRAO_PROTOCOLO =
  /^(HAB|AUX|MUT|REA|FIS|OFC|REC|FAM|ENC|DOC|PIL|CNV|EMP|MED|UNI|VIS|RET)-(\d{4})\/(\d{5})$/;

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
