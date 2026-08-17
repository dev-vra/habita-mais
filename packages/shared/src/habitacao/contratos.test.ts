import { describe, expect, it } from 'vitest';
import {
  avaliarInadimplencia,
  avaliarParcelas,
  gerarCarne,
  impedimentosDaBaixa,
  podeTransferirTitularidade,
  reajustarParcela,
  resumirContrato,
  type ParcelaAvaliavel,
} from './contratos.js';

const AGORA = new Date('2026-08-17T12:00:00.000Z');

function parcela(sobrescrita: Partial<ParcelaAvaliavel> = {}): ParcelaAvaliavel {
  return { numero: 1, vencimento: '2026-08-10', valor: 200, situacao: 'ABERTA', ...sobrescrita };
}

describe('gerarCarne', () => {
  it('a soma das parcelas fecha exatamente com o valor financiado', () => {
    const carne = gerarCarne({
      valorFinanciado: 10_000,
      quantidadeParcelas: 3,
      diaVencimento: 10,
      primeiraCompetencia: '2026-09',
    });

    const soma = carne.reduce((total, item) => total + item.valor, 0);
    expect(Math.round(soma * 100)).toBe(1_000_000);
  });

  it('a sobra dos centavos fica na primeira parcela, não na última', () => {
    const carne = gerarCarne({
      valorFinanciado: 100,
      quantidadeParcelas: 3,
      diaVencimento: 10,
      primeiraCompetencia: '2026-09',
    });

    expect(carne[0]?.valor).toBe(33.34);
    expect(carne[2]?.valor).toBe(33.33);
  });

  it('vira o ano corretamente', () => {
    const carne = gerarCarne({
      valorFinanciado: 400,
      quantidadeParcelas: 4,
      diaVencimento: 15,
      primeiraCompetencia: '2026-11',
    });

    expect(carne.map((item) => item.competencia)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('dia 31 vira o último dia nos meses curtos', () => {
    const carne = gerarCarne({
      valorFinanciado: 300,
      quantidadeParcelas: 3,
      diaVencimento: 31,
      primeiraCompetencia: '2027-01',
    });

    expect(carne.map((item) => item.vencimento)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
  });
});

describe('reajustarParcela', () => {
  it('aplica o índice sobre o valor vigente', () => {
    expect(reajustarParcela(200, 4.5)).toBe(209);
  });
});

describe('avaliarParcelas', () => {
  it('parcela vencida e não paga conta o atraso', () => {
    const [avaliada] = avaliarParcelas([parcela({ vencimento: '2026-07-10' })], AGORA);

    expect(avaliada?.situacaoEfetiva).toBe('VENCIDA');
    expect(avaliada?.diasEmAtraso).toBe(38);
  });

  it('parcela ainda não vencida fica aberta', () => {
    const [avaliada] = avaliarParcelas([parcela({ vencimento: '2026-09-10' })], AGORA);

    expect(avaliada?.situacaoEfetiva).toBe('ABERTA');
    expect(avaliada?.diasEmAtraso).toBe(0);
  });

  it('pagamento integral quita mesmo com a situação desatualizada no banco', () => {
    const [avaliada] = avaliarParcelas(
      [parcela({ vencimento: '2026-07-10', valorPago: 200, situacao: 'PAGA_PARCIAL' })],
      AGORA,
    );

    expect(avaliada?.situacaoEfetiva).toBe('PAGA');
    expect(avaliada?.saldo).toBe(0);
  });

  it('parcela isenta não vira atraso', () => {
    const [avaliada] = avaliarParcelas(
      [parcela({ vencimento: '2020-01-10', situacao: 'ISENTA' })],
      AGORA,
    );

    expect(avaliada?.situacaoEfetiva).toBe('ISENTA');
  });
});

describe('resumirContrato', () => {
  const carne: ParcelaAvaliavel[] = [
    { numero: 1, vencimento: '2026-05-10', valor: 200, situacao: 'PAGA', valorPago: 200 },
    { numero: 2, vencimento: '2026-06-10', valor: 200, situacao: 'PAGA', valorPago: 200 },
    { numero: 3, vencimento: '2026-07-10', valor: 200, situacao: 'ABERTA' },
    { numero: 4, vencimento: '2026-08-10', valor: 200, situacao: 'ABERTA' },
    { numero: 5, vencimento: '2026-09-10', valor: 200, situacao: 'ABERTA' },
  ];

  it('separa pago, vencido e a vencer', () => {
    const resumo = resumirContrato(carne, AGORA);

    expect(resumo.pagas).toBe(2);
    expect(resumo.vencidas).toBe(2);
    expect(resumo.aVencer).toBe(1);
    expect(resumo.valorEmAtraso).toBe(400);
    expect(resumo.saldoDevedor).toBe(600);
    expect(resumo.percentualQuitado).toBe(40);
  });

  it('parcela renegociada sai da conta', () => {
    const resumo = resumirContrato(
      [...carne, { numero: 6, vencimento: '2026-04-10', valor: 200, situacao: 'RENEGOCIADA' }],
      AGORA,
    );

    expect(resumo.totalParcelas).toBe(5);
  });

  it('reconhece contrato quitado', () => {
    const resumo = resumirContrato(
      carne.map((item) => ({ ...item, situacao: 'PAGA' as const, valorPago: 200 })),
      AGORA,
    );

    expect(resumo.quitado).toBe(true);
    expect(resumo.percentualQuitado).toBe(100);
  });
});

describe('avaliarInadimplencia', () => {
  const comVencidas = (quantidade: number) =>
    resumirContrato(
      Array.from({ length: quantidade }, (_, indice) => ({
        numero: indice + 1,
        vencimento: `2026-0${indice + 1}-10`,
        valor: 200,
        situacao: 'ABERTA' as const,
      })),
      AGORA,
    );

  it('sem atraso não há cobrança', () => {
    const avaliacao = avaliarInadimplencia(
      resumirContrato([parcela({ vencimento: '2026-09-10' })], AGORA),
    );

    expect(avaliacao.fase).toBe('EM_DIA');
    expect(avaliacao.podePropoRescisao).toBe(false);
  });

  it('uma parcela vencida já pede contato', () => {
    expect(avaliarInadimplencia(comVencidas(1)).fase).toBe('COBRANCA');
  });

  it('três parcelas autorizam notificação', () => {
    expect(avaliarInadimplencia(comVencidas(3)).fase).toBe('NOTIFICACAO');
  });

  it('rescisão só é PROPOSTA depois de seis parcelas', () => {
    const avaliacao = avaliarInadimplencia(comVencidas(6));

    expect(avaliacao.fase).toBe('PASSIVEL_RESCISAO');
    expect(avaliacao.podePropoRescisao).toBe(true);
    expect(avaliacao.proximoPasso).toContain('renegociação');
  });

  it('a prefeitura pode apertar ou afrouxar a escada', () => {
    const avaliacao = avaliarInadimplencia(comVencidas(2), { parcelasParaNotificacao: 2 });

    expect(avaliacao.fase).toBe('NOTIFICACAO');
  });
});

describe('impedimentosDaBaixa', () => {
  const [aberta] = avaliarParcelas([parcela({ vencimento: '2026-07-10' })], AGORA);

  it('baixa coerente passa', () => {
    expect(
      impedimentosDaBaixa({ situacaoContrato: 'VIGENTE', parcela: aberta!, valorPago: 200 }),
    ).toHaveLength(0);
  });

  it('não paga acima do saldo da parcela', () => {
    expect(
      impedimentosDaBaixa({ situacaoContrato: 'VIGENTE', parcela: aberta!, valorPago: 250 }),
    ).toContain('VALOR_MAIOR_QUE_SALDO');
  });

  it('não baixa parcela já paga', () => {
    const [paga] = avaliarParcelas(
      [parcela({ vencimento: '2026-07-10', situacao: 'PAGA', valorPago: 200 })],
      AGORA,
    );

    expect(
      impedimentosDaBaixa({ situacaoContrato: 'VIGENTE', parcela: paga!, valorPago: 50 }),
    ).toContain('PARCELA_ENCERRADA');
  });

  it('não baixa em contrato rescindido', () => {
    expect(
      impedimentosDaBaixa({ situacaoContrato: 'RESCINDIDO', parcela: aberta!, valorPago: 200 }),
    ).toContain('CONTRATO_NAO_VIGENTE');
  });
});

describe('podeTransferirTitularidade', () => {
  it('contrato vigente ou quitado transfere', () => {
    expect(podeTransferirTitularidade('VIGENTE')).toBe(true);
    expect(podeTransferirTitularidade('QUITADO')).toBe(true);
  });

  it('contrato rescindido não transfere', () => {
    expect(podeTransferirTitularidade('RESCINDIDO')).toBe(false);
  });
});
