// Contrato do mutuário: carnê, pagamento e inadimplência.
//
// Habitação de interesse social não é financiamento imobiliário: o saldo é pequeno, a parcela é
// fixa (às vezes um percentual da renda), e o reajuste é anual por índice — não há tabela Price
// nem juros compostos. Modelar como financiamento produziria um número que a família não deve e
// que a prefeitura não sabe explicar.
//
// A escada de inadimplência existe porque rescindir contrato de moradia por dois meses de atraso é
// desproporcional, e porque a prefeitura precisa provar que cobrou antes de retomar.

export const SITUACOES_PARCELA = [
  'ABERTA',
  'PAGA',
  'PAGA_PARCIAL',
  'VENCIDA',
  'RENEGOCIADA',
  'ISENTA',
  'CANCELADA',
] as const;

export type SituacaoParcela = (typeof SITUACOES_PARCELA)[number];

export const SITUACOES_CONTRATO = [
  'EM_ELABORACAO',
  'VIGENTE',
  'SUSPENSO',
  'RENEGOCIADO',
  'QUITADO',
  'RESCINDIDO',
  'TRANSFERIDO',
] as const;

export type SituacaoContrato = (typeof SITUACOES_CONTRATO)[number];

export interface ParcelaGerada {
  numero: number;
  /** Competência no formato AAAA-MM: é por ela que a prefeitura fecha o mês. */
  competencia: string;
  vencimento: string;
  valor: number;
}

export interface MoldeCarne {
  valorFinanciado: number;
  quantidadeParcelas: number;
  /** Dia do mês do vencimento. Ajustado para o último dia em fevereiro e meses curtos. */
  diaVencimento: number;
  /** Mês da primeira parcela (AAAA-MM). A carência já entra escolhendo um mês à frente. */
  primeiraCompetencia: string;
}

/**
 * Gera o carnê inteiro.
 *
 * A sobra dos centavos vai na PRIMEIRA parcela, não na última: é o único jeito de a soma fechar
 * exatamente com o valor financiado sem cobrar um centavo a mais de quem chegou ao fim do carnê —
 * e quem paga a última parcela é quem está quitando, o pior momento para uma surpresa.
 */
export function gerarCarne(molde: MoldeCarne): ParcelaGerada[] {
  if (molde.quantidadeParcelas < 1) return [];

  const centavosTotais = Math.round(molde.valorFinanciado * 100);
  const centavosPorParcela = Math.floor(centavosTotais / molde.quantidadeParcelas);
  const sobra = centavosTotais - centavosPorParcela * molde.quantidadeParcelas;

  const [anoInicial, mesInicial] = molde.primeiraCompetencia.split('-').map(Number);

  return Array.from({ length: molde.quantidadeParcelas }, (_, indice) => {
    const mesCorrido = (mesInicial ?? 1) - 1 + indice;
    const ano = (anoInicial ?? 0) + Math.floor(mesCorrido / 12);
    const mes = (mesCorrido % 12) + 1;

    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const dia = Math.min(molde.diaVencimento, ultimoDia);

    return {
      numero: indice + 1,
      competencia: `${ano}-${String(mes).padStart(2, '0')}`,
      vencimento: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      valor: (centavosPorParcela + (indice === 0 ? sobra : 0)) / 100,
    };
  });
}

/**
 * Reajuste anual por índice.
 *
 * Aplica sobre o valor vigente, nunca sobre o original: reajuste composto é o que faz a parcela de
 * uma família de baixa renda dobrar em cinco anos sem ninguém perceber.
 */
export function reajustarParcela(valorVigente: number, percentualIndice: number): number {
  return Math.round(valorVigente * (1 + percentualIndice / 100) * 100) / 100;
}

export interface ParcelaAvaliavel {
  numero: number;
  vencimento: string;
  valor: number;
  situacao: SituacaoParcela;
  valorPago?: number;
}

export interface ParcelaAvaliada extends ParcelaAvaliavel {
  /** Situação de fato, considerando a data de hoje. */
  situacaoEfetiva: SituacaoParcela;
  diasEmAtraso: number;
  saldo: number;
}

/**
 * Situação real de cada parcela hoje.
 *
 * ABERTA é o que ainda não venceu; VENCIDA é o que passou do dia. A distinção não é cosmética: é
 * ela que alimenta a escada de cobrança, e tratar tudo como "em aberto" faria a inadimplência
 * aparecer só quando alguém reclamasse.
 */
export function avaliarParcelas(
  parcelas: readonly ParcelaAvaliavel[],
  agora: Date,
): ParcelaAvaliada[] {
  return parcelas.map((parcela) => {
    const pago = parcela.valorPago ?? 0;
    const saldo = Math.round((parcela.valor - pago) * 100) / 100;
    const dias = diasEntre(new Date(parcela.vencimento), agora);

    const encerrada =
      parcela.situacao === 'PAGA' ||
      parcela.situacao === 'ISENTA' ||
      parcela.situacao === 'CANCELADA' ||
      parcela.situacao === 'RENEGOCIADA';

    const situacaoEfetiva: SituacaoParcela = encerrada
      ? parcela.situacao
      : saldo <= 0
        ? 'PAGA'
        : dias > 0
          ? 'VENCIDA'
          : parcela.situacao === 'PAGA_PARCIAL'
            ? 'PAGA_PARCIAL'
            : 'ABERTA';

    return {
      ...parcela,
      situacaoEfetiva,
      diasEmAtraso: situacaoEfetiva === 'VENCIDA' || (dias > 0 && saldo > 0) ? dias : 0,
      saldo: Math.max(saldo, 0),
    };
  });
}

export interface ResumoContrato {
  totalParcelas: number;
  pagas: number;
  vencidas: number;
  aVencer: number;
  valorPago: number;
  saldoDevedor: number;
  valorEmAtraso: number;
  /** Maior atraso entre as parcelas vencidas. É o número que define a fase da cobrança. */
  maiorAtrasoDias: number;
  percentualQuitado: number;
  quitado: boolean;
}

export function resumirContrato(
  parcelas: readonly ParcelaAvaliavel[],
  agora: Date,
): ResumoContrato {
  const avaliadas = avaliarParcelas(parcelas, agora);
  const consideradas = avaliadas.filter(
    (parcela) => parcela.situacaoEfetiva !== 'CANCELADA' && parcela.situacaoEfetiva !== 'RENEGOCIADA',
  );

  const vencidas = consideradas.filter((parcela) => parcela.situacaoEfetiva === 'VENCIDA');
  const pagas = consideradas.filter(
    (parcela) => parcela.situacaoEfetiva === 'PAGA' || parcela.situacaoEfetiva === 'ISENTA',
  );

  const valorTotal = consideradas.reduce((soma, parcela) => soma + parcela.valor, 0);
  const valorPago = consideradas.reduce((soma, parcela) => soma + (parcela.valorPago ?? 0), 0);
  const saldoDevedor = consideradas.reduce((soma, parcela) => soma + parcela.saldo, 0);

  return {
    totalParcelas: consideradas.length,
    pagas: pagas.length,
    vencidas: vencidas.length,
    aVencer: consideradas.filter((parcela) => parcela.situacaoEfetiva === 'ABERTA').length,
    valorPago: arredondar(valorPago),
    saldoDevedor: arredondar(saldoDevedor),
    valorEmAtraso: arredondar(vencidas.reduce((soma, parcela) => soma + parcela.saldo, 0)),
    maiorAtrasoDias: vencidas.reduce((maior, parcela) => Math.max(maior, parcela.diasEmAtraso), 0),
    percentualQuitado: valorTotal > 0 ? arredondar((valorPago / valorTotal) * 100) : 0,
    quitado: consideradas.length > 0 && saldoDevedor <= 0,
  };
}

export const FASES_INADIMPLENCIA = [
  'EM_DIA',
  'ATRASO_RECENTE',
  'COBRANCA',
  'NOTIFICACAO',
  'PASSIVEL_RESCISAO',
] as const;

export type FaseInadimplencia = (typeof FASES_INADIMPLENCIA)[number];

export interface EscadaCobranca {
  /** Parcelas vencidas a partir das quais se cobra formalmente. */
  parcelasParaCobranca?: number;
  /** Parcelas vencidas que autorizam notificação com prazo. */
  parcelasParaNotificacao?: number;
  /** Parcelas vencidas a partir das quais a rescisão pode ser proposta. */
  parcelasParaRescisao?: number;
}

const ESCADA_PADRAO: Required<EscadaCobranca> = {
  parcelasParaCobranca: 1,
  parcelasParaNotificacao: 3,
  parcelasParaRescisao: 6,
};

export interface AvaliacaoInadimplencia {
  fase: FaseInadimplencia;
  parcelasVencidas: number;
  valorEmAtraso: number;
  maiorAtrasoDias: number;
  /** O que a prefeitura deve fazer agora. Texto para a tela, nunca ação automática. */
  proximoPasso: string;
  /** Já é possível PROPOR rescisão — propor, não rescindir. */
  podePropoRescisao: boolean;
}

/**
 * Em que degrau da cobrança o contrato está.
 *
 * Nada aqui executa: a função diz onde o contrato chegou e o que cabe fazer. Rescindir continua
 * sendo processo com contraditório (ver `retomada.ts`) — inadimplência não é atalho para tirar a
 * casa, é a porta de entrada do mesmo rito.
 */
export function avaliarInadimplencia(
  resumo: ResumoContrato,
  escada: EscadaCobranca = {},
): AvaliacaoInadimplencia {
  const regra = { ...ESCADA_PADRAO, ...escada };
  const vencidas = resumo.vencidas;

  const base = {
    parcelasVencidas: vencidas,
    valorEmAtraso: resumo.valorEmAtraso,
    maiorAtrasoDias: resumo.maiorAtrasoDias,
  };

  if (vencidas === 0) {
    return {
      ...base,
      fase: 'EM_DIA',
      proximoPasso: 'Nada a cobrar.',
      podePropoRescisao: false,
    };
  }

  if (vencidas >= regra.parcelasParaRescisao) {
    return {
      ...base,
      fase: 'PASSIVEL_RESCISAO',
      proximoPasso:
        'Avalie renegociação antes de propor rescisão. A rescisão exige processo com notificação e defesa.',
      podePropoRescisao: true,
    };
  }

  if (vencidas >= regra.parcelasParaNotificacao) {
    return {
      ...base,
      fase: 'NOTIFICACAO',
      proximoPasso: `Notifique formalmente, com prazo. São ${vencidas} parcelas vencidas.`,
      podePropoRescisao: false,
    };
  }

  if (vencidas >= regra.parcelasParaCobranca) {
    return {
      ...base,
      fase: 'COBRANCA',
      proximoPasso: 'Contate a família e ofereça renegociação antes que o atraso cresça.',
      podePropoRescisao: false,
    };
  }

  return {
    ...base,
    fase: 'ATRASO_RECENTE',
    proximoPasso: 'Atraso recente. Um contato costuma resolver.',
    podePropoRescisao: false,
  };
}

export type ImpedimentoBaixa =
  | 'PARCELA_ENCERRADA'
  | 'VALOR_INVALIDO'
  | 'VALOR_MAIOR_QUE_SALDO'
  | 'CONTRATO_NAO_VIGENTE';

export const MOTIVOS_IMPEDIMENTO_BAIXA: Readonly<Record<ImpedimentoBaixa, string>> = {
  PARCELA_ENCERRADA: 'Esta parcela já foi encerrada. Para corrigir, estorne a baixa anterior.',
  VALOR_INVALIDO: 'O valor pago precisa ser maior que zero.',
  VALOR_MAIOR_QUE_SALDO:
    'O valor informado passa do saldo da parcela. Confira o comprovante — pagamento a maior vira crédito, não baixa.',
  CONTRATO_NAO_VIGENTE: 'Só contrato vigente recebe baixa de pagamento.',
};

/**
 * O que impede a baixa.
 *
 * Baixar pagamento é dizer que a família pagou. Errar aqui para menos gera cobrança indevida de
 * quem já pagou; errar para mais some com dinheiro público da prestação de contas.
 */
export function impedimentosDaBaixa(entrada: {
  situacaoContrato: SituacaoContrato;
  parcela: ParcelaAvaliada;
  valorPago: number;
}): ImpedimentoBaixa[] {
  const impedimentos: ImpedimentoBaixa[] = [];

  if (entrada.situacaoContrato !== 'VIGENTE') impedimentos.push('CONTRATO_NAO_VIGENTE');

  const encerrada =
    entrada.parcela.situacao === 'PAGA' ||
    entrada.parcela.situacao === 'ISENTA' ||
    entrada.parcela.situacao === 'CANCELADA' ||
    entrada.parcela.situacao === 'RENEGOCIADA';

  if (encerrada) impedimentos.push('PARCELA_ENCERRADA');
  if (entrada.valorPago <= 0) impedimentos.push('VALOR_INVALIDO');
  if (entrada.valorPago > entrada.parcela.saldo + 0.001) impedimentos.push('VALOR_MAIOR_QUE_SALDO');

  return impedimentos;
}

export const MOTIVOS_TRANSFERENCIA = [
  'OBITO_TITULAR',
  'SEPARACAO_DIVORCIO',
  'ABANDONO_LAR',
  'DECISAO_JUDICIAL',
  'OUTRO',
] as const;

export type MotivoTransferencia = (typeof MOTIVOS_TRANSFERENCIA)[number];

/**
 * Documentos que cada motivo de transferência exige.
 *
 * A titularidade de uma unidade pública não muda por acordo verbal: cada motivo tem a prova que o
 * cartório e o controle interno vão pedir depois. Sem isso, a transferência é o caminho mais curto
 * para a unidade acabar com quem a fila não escolheu.
 */
export const DOCUMENTOS_POR_MOTIVO: Readonly<Record<MotivoTransferencia, readonly string[]>> = {
  OBITO_TITULAR: ['Certidão de óbito', 'Documento do sucessor', 'Comprovante de residência do sucessor'],
  SEPARACAO_DIVORCIO: ['Certidão ou sentença de separação/divórcio', 'Documento de quem permanece'],
  ABANDONO_LAR: ['Declaração fundamentada', 'Relatório de visita comprovando a ocupação atual'],
  DECISAO_JUDICIAL: ['Decisão judicial', 'Documento do novo titular'],
  OUTRO: ['Justificativa fundamentada', 'Documento do novo titular'],
};

export function podeTransferirTitularidade(situacao: SituacaoContrato): boolean {
  return situacao === 'VIGENTE' || situacao === 'QUITADO';
}

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

function diasEntre(inicio: Date, fim: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.floor((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}
