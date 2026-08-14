// Conferência documental: o que foi entregue, o que venceu e o que ainda falta.
//
// Anexar não é entregar, e entregar não é conferir. A distinção existe porque a prefeitura
// responde por documento aceito: se o comprovante estava vencido no dia da conferência e ninguém
// viu, a falha é do processo, não da família.

export type EstadoExigencia =
  | 'FALTANDO'
  | 'RECEBIDO'
  | 'CONFERIDO'
  | 'VENCIDO'
  | 'RECUSADO'
  | 'VENCENDO';

export interface ExigenciaComDocumento {
  tipoCodigo: string;
  tipoNome: string;
  obrigatorio: boolean;
  orientacao?: string;
  documento?: {
    id: string;
    protocolo: string;
    situacao: 'RECEBIDO' | 'CONFERIDO' | 'RECUSADO' | 'SUBSTITUIDO';
    validoAte?: string;
    motivoRecusa?: string;
    /** Onde o arquivo está — o suficiente para o visualizador abrir pelo BFF. */
    arquivoKey: string;
    nomeArquivo: string;
    mimeType: string;
  };
}

export interface ItemConferencia extends ExigenciaComDocumento {
  estado: EstadoExigencia;
  diasParaVencer: number | null;
  /** Impede o avanço do processo: obrigatório que falta, venceu ou foi recusado. */
  impeditivo: boolean;
}

const DIAS_AVISO_VENCIMENTO = 30;

/**
 * Avalia cada exigência contra o documento entregue.
 *
 * Documento vencido conta como ausente, e é por isso que o vencimento não é decorativo: um
 * comprovante de renda de dois anos atrás não prova a renda de hoje, e a decisão tomada sobre ele
 * não se sustenta em auditoria.
 */
export function conferirDocumentos(
  exigencias: ExigenciaComDocumento[],
  agora: Date,
): ItemConferencia[] {
  return exigencias
    .map((exigencia): ItemConferencia => {
      const documento = exigencia.documento;
      if (!documento || documento.situacao === 'SUBSTITUIDO') {
        return { ...exigencia, estado: 'FALTANDO', diasParaVencer: null, impeditivo: exigencia.obrigatorio };
      }

      if (documento.situacao === 'RECUSADO') {
        return { ...exigencia, estado: 'RECUSADO', diasParaVencer: null, impeditivo: exigencia.obrigatorio };
      }

      const dias = documento.validoAte ? diasEntre(agora, new Date(documento.validoAte)) : null;
      if (dias !== null && dias < 0) {
        return { ...exigencia, estado: 'VENCIDO', diasParaVencer: dias, impeditivo: exigencia.obrigatorio };
      }

      if (dias !== null && dias <= DIAS_AVISO_VENCIMENTO) {
        return { ...exigencia, estado: 'VENCENDO', diasParaVencer: dias, impeditivo: false };
      }

      return {
        ...exigencia,
        estado: documento.situacao === 'CONFERIDO' ? 'CONFERIDO' : 'RECEBIDO',
        diasParaVencer: dias,
        impeditivo: false,
      };
    })
    .sort((a, b) => peso(a) - peso(b));
}

export interface ResumoDocumental {
  total: number;
  conferidos: number;
  faltando: number;
  impeditivos: number;
  completo: boolean;
  /** Percentual só dos obrigatórios — é o que decide se o processo anda. */
  percentualObrigatorios: number;
}

export function resumirConferencia(itens: ItemConferencia[]): ResumoDocumental {
  const obrigatorios = itens.filter((item) => item.obrigatorio);
  const obrigatoriosOk = obrigatorios.filter(
    (item) => item.estado === 'CONFERIDO' || item.estado === 'RECEBIDO' || item.estado === 'VENCENDO',
  );

  return {
    total: itens.length,
    conferidos: itens.filter((item) => item.estado === 'CONFERIDO').length,
    faltando: itens.filter((item) => item.estado === 'FALTANDO').length,
    impeditivos: itens.filter((item) => item.impeditivo).length,
    completo: obrigatorios.length > 0 && obrigatoriosOk.length === obrigatorios.length,
    percentualObrigatorios:
      obrigatorios.length === 0
        ? 100
        : Math.round((obrigatoriosOk.length / obrigatorios.length) * 100),
  };
}

/** Validade a partir da emissão. Tipo sem prazo devolve nulo — RG não vence. */
export function calcularValidade(emitidoEm: Date, validadeMeses: number | null): Date | null {
  if (!validadeMeses) return null;

  const validade = new Date(emitidoEm);
  validade.setMonth(validade.getMonth() + validadeMeses);
  return validade;
}

const ORDEM: Record<EstadoExigencia, number> = {
  FALTANDO: 0,
  VENCIDO: 1,
  RECUSADO: 2,
  VENCENDO: 3,
  RECEBIDO: 4,
  CONFERIDO: 5,
};

/** Impeditivo primeiro, e dentro disso o obrigatório antes do opcional. */
function peso(item: ItemConferencia): number {
  return ORDEM[item.estado] * 2 + (item.obrigatorio ? 0 : 1);
}

function diasEntre(de: Date, ate: Date): number {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.floor((ate.getTime() - de.getTime()) / umDia);
}
