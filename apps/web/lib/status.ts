/**
 * Rótulo e tom de cada situação da inscrição. Status nunca aparece só como cor: sempre com ponto
 * e rótulo — quem não distingue as cores precisa ler a mesma informação.
 */
export type TomStatus = 'neutro' | 'sucesso' | 'atencao' | 'perigo' | 'institucional';

export interface Status {
  rotulo: string;
  tom: TomStatus;
}

const STATUS_INSCRICAO: Record<string, Status> = {
  EM_ANALISE: { rotulo: 'Em análise', tom: 'neutro' },
  PENDENTE: { rotulo: 'Com pendência', tom: 'atencao' },
  APTA: { rotulo: 'Apta', tom: 'sucesso' },
  EM_RECURSO: { rotulo: 'Em recurso', tom: 'atencao' },
  CONVOCADA: { rotulo: 'Convocada', tom: 'institucional' },
  CONTEMPLADA: { rotulo: 'Contemplada', tom: 'sucesso' },
  INDEFERIDA: { rotulo: 'Indeferida', tom: 'perigo' },
  INELEGIVEL: { rotulo: 'Inelegível', tom: 'perigo' },
  DESISTENTE: { rotulo: 'Desistiu', tom: 'neutro' },
  CANCELADA: { rotulo: 'Cancelada', tom: 'neutro' },
};

export function statusInscricao(situacao: string): Status {
  return STATUS_INSCRICAO[situacao] ?? { rotulo: situacao, tom: 'neutro' };
}

const SITUACAO_PROGRAMA: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  INSCRICOES_ABERTAS: 'Inscrições abertas',
  INSCRICOES_ENCERRADAS: 'Inscrições encerradas',
  EM_EXECUCAO: 'Em execução',
  ENCERRADO: 'Encerrado',
};

export function situacaoPrograma(situacao: string): string {
  return SITUACAO_PROGRAMA[situacao] ?? situacao;
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarNota(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
