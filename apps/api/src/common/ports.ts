// Ports compartilhados entre módulos de domínio. Trilha e numeração não pertencem a nenhum
// agregado: todo caso de uso relevante registra o que fez, e todo pedido do munícipe tem número.

export const TRILHA_AUDITORIA = Symbol('TrilhaAuditoria');
export const GERADOR_PROTOCOLO = Symbol('GeradorProtocolo');

export type SerieProtocoloDominio = 'HAB' | 'AUX' | 'MUT' | 'REA' | 'FIS' | 'OFC' | 'REC' | 'FAM' | 'ENC' | 'DOC' | 'PIL';

/** Registrar é parte do ato, não efeito colateral opcional. */
export interface TrilhaAuditoria {
  registrar(evento: {
    operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'READ';
    entidade: string;
    entidadeId: string;
    diff?: Record<string, unknown>;
  }): Promise<void>;
}

export interface GeradorProtocolo {
  proximo(serie: SerieProtocoloDominio, ano: number): Promise<string>;
}
