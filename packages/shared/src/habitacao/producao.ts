// Produção habitacional: cronograma físico-financeiro, medição e situação da unidade.
//
// A pergunta que este módulo responde é a que o controle interno faz primeiro: *o que já foi pago
// corresponde ao que já foi feito?* Obra parada com medição em dia é o achado clássico de TCE, e
// ele só aparece quando físico e financeiro são medidos separadamente e comparados. Por isso os
// dois percentuais nunca são derivados um do outro aqui.

/** Quanto o financeiro pode passar do físico antes de virar apontamento. */
const TOLERANCIA_DESCOMPASSO = 5;
/** Faixa em que a etapa ainda não atrasou, mas o prazo está perto o bastante para avisar. */
const DIAS_ATENCAO_PRAZO = 15;

export interface EtapaCronograma {
  codigo: string;
  nome: string;
  /** Peso da etapa no total da obra, em pontos percentuais. O conjunto precisa somar 100. */
  peso: number;
  /** Quanto da etapa está executado (0 a 100). */
  executado: number;
  previstaAte: string;
  concluidaEm?: string;
}

export type SituacaoEtapa = 'CONCLUIDA' | 'NO_PRAZO' | 'PROXIMA_DO_PRAZO' | 'ATRASADA';

export interface EtapaAvaliada extends EtapaCronograma {
  situacao: SituacaoEtapa;
  diasParaPrazo: number;
}

/**
 * Avanço físico da obra: média dos executados ponderada pelo peso de cada etapa.
 *
 * Ponderar importa porque etapa não vale o mesmo: fundação concluída não é "um quarto da obra"
 * só por ser uma de quatro etapas. Sem peso, a barra de progresso mente para o gestor.
 */
export function avancoFisico(etapas: readonly EtapaCronograma[]): number {
  if (etapas.length === 0) return 0;

  const total = etapas.reduce((soma, etapa) => soma + etapa.peso, 0);
  if (total <= 0) return 0;

  const executado = etapas.reduce(
    (soma, etapa) => soma + etapa.peso * limitar(etapa.executado, 0, 100),
    0,
  );

  return arredondar(executado / total);
}

/** Os pesos fecham 100? Cronograma que não fecha produz percentual que ninguém consegue defender. */
export function pesosFecham(etapas: readonly EtapaCronograma[]): boolean {
  const total = etapas.reduce((soma, etapa) => soma + etapa.peso, 0);
  return Math.abs(total - 100) < 0.01;
}

export function avaliarEtapas(etapas: readonly EtapaCronograma[], agora: Date): EtapaAvaliada[] {
  return etapas.map((etapa) => {
    const dias = diasEntre(agora, new Date(etapa.previstaAte));

    if (etapa.concluidaEm || etapa.executado >= 100) {
      return { ...etapa, situacao: 'CONCLUIDA', diasParaPrazo: dias };
    }
    if (dias < 0) return { ...etapa, situacao: 'ATRASADA', diasParaPrazo: dias };
    if (dias <= DIAS_ATENCAO_PRAZO) {
      return { ...etapa, situacao: 'PROXIMA_DO_PRAZO', diasParaPrazo: dias };
    }
    return { ...etapa, situacao: 'NO_PRAZO', diasParaPrazo: dias };
  });
}

export interface ResumoObra {
  percentualFisico: number;
  percentualFinanceiro: number;
  /** Financeiro menos físico. Positivo quer dizer pago à frente do executado. */
  descompasso: number;
  /** Pago à frente da obra além da tolerância — vira apontamento, não aviso. */
  pagamentoAdiantado: boolean;
  etapasAtrasadas: number;
  /** Valor do contrato ainda não medido. */
  saldoAMedir: number;
}

/**
 * Foto da obra num instante.
 *
 * O descompasso é a informação central: obra 30% executada com 60% medido é dinheiro adiantado, e
 * quem assina a próxima medição precisa ver isso na tela — não num relatório trimestral.
 */
export function resumirObra(entrada: {
  etapas: readonly EtapaCronograma[];
  valorContrato: number;
  valorMedidoAcumulado: number;
  agora: Date;
}): ResumoObra {
  const percentualFisico = avancoFisico(entrada.etapas);
  const percentualFinanceiro =
    entrada.valorContrato > 0
      ? arredondar((entrada.valorMedidoAcumulado / entrada.valorContrato) * 100)
      : 0;

  const descompasso = arredondar(percentualFinanceiro - percentualFisico);

  return {
    percentualFisico,
    percentualFinanceiro,
    descompasso,
    pagamentoAdiantado: descompasso > TOLERANCIA_DESCOMPASSO,
    etapasAtrasadas: avaliarEtapas(entrada.etapas, entrada.agora).filter(
      (etapa) => etapa.situacao === 'ATRASADA',
    ).length,
    saldoAMedir: arredondar(entrada.valorContrato - entrada.valorMedidoAcumulado),
  };
}

export interface MedicaoProposta {
  /** Percentual físico acumulado que a medição declara. */
  percentualAcumulado: number;
  /** Valor a pagar nesta medição. */
  valor: number;
}

export interface ImpedimentoMedicao {
  codigo:
    | 'PERCENTUAL_RETROCEDE'
    | 'PERCENTUAL_INVALIDO'
    | 'VALOR_INVALIDO'
    | 'ESTOURA_CONTRATO'
    | 'ALEM_DO_EXECUTADO';
  mensagem: string;
}

/**
 * O que impede a medição de ser aprovada.
 *
 * Medição é ordem de pagamento com outro nome. Retroceder percentual, estourar o valor do contrato
 * ou medir acima do que as etapas registram são erros que só aparecem depois — quando o dinheiro
 * já saiu. Aqui eles aparecem antes, e cada um com nome próprio para o motivo entrar na trilha.
 */
export function impedimentosDaMedicao(entrada: {
  proposta: MedicaoProposta;
  percentualAcumuladoAnterior: number;
  valorMedidoAcumulado: number;
  valorContrato: number;
  percentualFisicoDasEtapas: number;
}): ImpedimentoMedicao[] {
  const impedimentos: ImpedimentoMedicao[] = [];
  const { proposta } = entrada;

  if (proposta.percentualAcumulado < 0 || proposta.percentualAcumulado > 100) {
    impedimentos.push({
      codigo: 'PERCENTUAL_INVALIDO',
      mensagem: 'O percentual acumulado precisa estar entre 0 e 100.',
    });
  }

  if (proposta.percentualAcumulado < entrada.percentualAcumuladoAnterior) {
    impedimentos.push({
      codigo: 'PERCENTUAL_RETROCEDE',
      mensagem: `A medição anterior já registrou ${entrada.percentualAcumuladoAnterior}%. Para reduzir, cancele a medição anterior com motivo.`,
    });
  }

  if (proposta.valor <= 0) {
    impedimentos.push({ codigo: 'VALOR_INVALIDO', mensagem: 'O valor medido precisa ser maior que zero.' });
  }

  if (entrada.valorMedidoAcumulado + proposta.valor > entrada.valorContrato) {
    impedimentos.push({
      codigo: 'ESTOURA_CONTRATO',
      mensagem: 'A soma das medições passaria do valor do contrato. Aditivo precisa ser registrado antes.',
    });
  }

  // O percentual medido não pode ir além do que o cronograma registra como executado: é o que
  // impede a medição de "puxar" a obra no papel antes de ela existir no canteiro.
  if (proposta.percentualAcumulado > entrada.percentualFisicoDasEtapas + TOLERANCIA_DESCOMPASSO) {
    impedimentos.push({
      codigo: 'ALEM_DO_EXECUTADO',
      mensagem: `O cronograma registra ${entrada.percentualFisicoDasEtapas}% executado. Atualize as etapas antes de medir ${proposta.percentualAcumulado}%.`,
    });
  }

  return impedimentos;
}

export const SITUACOES_UNIDADE = [
  'PLANEJADA',
  'EM_OBRA',
  'PRONTA',
  'ENTREGUE',
  'DESOCUPADA',
  'EM_LITIGIO',
  'RETOMADA',
  'CANCELADA',
] as const;

export type SituacaoUnidade = (typeof SITUACOES_UNIDADE)[number];

/**
 * Para onde a unidade pode ir a partir de onde está.
 *
 * ENTREGUE é o divisor: antes dele a unidade é obra; depois, é a casa de alguém, e toda saída
 * passa por processo com motivo. Não existe caminho de volta de RETOMADA para ENTREGUE sem passar
 * por PRONTA — retomar e reentregar são dois atos, com dois responsáveis.
 */
const TRANSICOES_UNIDADE: Readonly<Record<SituacaoUnidade, readonly SituacaoUnidade[]>> = {
  PLANEJADA: ['EM_OBRA', 'CANCELADA'],
  EM_OBRA: ['PRONTA', 'CANCELADA'],
  PRONTA: ['ENTREGUE', 'EM_OBRA'],
  ENTREGUE: ['DESOCUPADA', 'EM_LITIGIO'],
  DESOCUPADA: ['ENTREGUE', 'EM_LITIGIO', 'RETOMADA'],
  EM_LITIGIO: ['ENTREGUE', 'RETOMADA', 'DESOCUPADA'],
  RETOMADA: ['PRONTA'],
  CANCELADA: [],
};

export function podeTransicionarUnidade(de: SituacaoUnidade, para: SituacaoUnidade): boolean {
  return TRANSICOES_UNIDADE[de].includes(para);
}

export function transicoesUnidade(de: SituacaoUnidade): readonly SituacaoUnidade[] {
  return TRANSICOES_UNIDADE[de];
}

/**
 * Situações em que a unidade tem morador declarado — e portanto exige acompanhamento pós-entrega.
 * É o que faz a visita vencida virar alerta em vez de silêncio.
 */
export function exigeAcompanhamento(situacao: SituacaoUnidade): boolean {
  return situacao === 'ENTREGUE' || situacao === 'EM_LITIGIO';
}

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;
const limitar = (valor: number, minimo: number, maximo: number): number =>
  Math.min(maximo, Math.max(minimo, valor));

function diasEntre(inicio: Date, fim: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.floor((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}
