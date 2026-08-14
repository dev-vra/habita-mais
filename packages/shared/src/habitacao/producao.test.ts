import { describe, expect, it } from 'vitest';
import {
  avaliarEtapas,
  avancoFisico,
  impedimentosDaMedicao,
  pesosFecham,
  podeTransicionarUnidade,
  resumirObra,
  type EtapaCronograma,
} from './producao.js';

const AGORA = new Date('2026-08-14T12:00:00.000Z');

function etapa(sobrescrita: Partial<EtapaCronograma> = {}): EtapaCronograma {
  return {
    codigo: 'FUNDACAO',
    nome: 'Fundação',
    peso: 25,
    executado: 0,
    previstaAte: '2026-12-01',
    ...sobrescrita,
  };
}

describe('avancoFisico', () => {
  it('pondera pelo peso, não pela contagem de etapas', () => {
    const avanco = avancoFisico([
      etapa({ codigo: 'FUNDACAO', peso: 40, executado: 100 }),
      etapa({ codigo: 'ALVENARIA', peso: 60, executado: 0 }),
    ]);

    expect(avanco).toBe(40);
  });

  it('cronograma vazio não inventa avanço', () => {
    expect(avancoFisico([])).toBe(0);
  });

  it('executado acima de 100 na etapa não infla o total', () => {
    const avanco = avancoFisico([etapa({ peso: 100, executado: 150 })]);

    expect(avanco).toBe(100);
  });
});

describe('pesosFecham', () => {
  it('reconhece cronograma fechado em 100', () => {
    expect(pesosFecham([etapa({ peso: 30 }), etapa({ codigo: 'B', peso: 70 })])).toBe(true);
  });

  it('recusa cronograma que não soma 100', () => {
    expect(pesosFecham([etapa({ peso: 30 }), etapa({ codigo: 'B', peso: 30 })])).toBe(false);
  });
});

describe('avaliarEtapas', () => {
  it('etapa vencida sem conclusão está atrasada', () => {
    const [item] = avaliarEtapas([etapa({ previstaAte: '2026-07-01' })], AGORA);

    expect(item?.situacao).toBe('ATRASADA');
  });

  it('etapa concluída não atrasa mesmo com prazo vencido', () => {
    const [item] = avaliarEtapas(
      [etapa({ previstaAte: '2026-07-01', concluidaEm: '2026-06-20' })],
      AGORA,
    );

    expect(item?.situacao).toBe('CONCLUIDA');
  });

  it('avisa antes de vencer', () => {
    const [item] = avaliarEtapas([etapa({ previstaAte: '2026-08-20' })], AGORA);

    expect(item?.situacao).toBe('PROXIMA_DO_PRAZO');
  });
});

describe('resumirObra', () => {
  it('acusa pagamento à frente do executado', () => {
    const resumo = resumirObra({
      etapas: [etapa({ peso: 100, executado: 30 })],
      valorContrato: 1_000_000,
      valorMedidoAcumulado: 600_000,
      agora: AGORA,
    });

    expect(resumo.percentualFisico).toBe(30);
    expect(resumo.percentualFinanceiro).toBe(60);
    expect(resumo.pagamentoAdiantado).toBe(true);
    expect(resumo.saldoAMedir).toBe(400_000);
  });

  it('financeiro dentro da tolerância não vira apontamento', () => {
    const resumo = resumirObra({
      etapas: [etapa({ peso: 100, executado: 50 })],
      valorContrato: 1_000_000,
      valorMedidoAcumulado: 530_000,
      agora: AGORA,
    });

    expect(resumo.pagamentoAdiantado).toBe(false);
  });
});

describe('impedimentosDaMedicao', () => {
  const base = {
    percentualAcumuladoAnterior: 40,
    valorMedidoAcumulado: 400_000,
    valorContrato: 1_000_000,
    percentualFisicoDasEtapas: 60,
  };

  it('medição coerente passa', () => {
    const impedimentos = impedimentosDaMedicao({
      ...base,
      proposta: { percentualAcumulado: 60, valor: 200_000 },
    });

    expect(impedimentos).toHaveLength(0);
  });

  it('percentual não retrocede sem cancelar a medição anterior', () => {
    const impedimentos = impedimentosDaMedicao({
      ...base,
      proposta: { percentualAcumulado: 30, valor: 10_000 },
    });

    expect(impedimentos.map((i) => i.codigo)).toContain('PERCENTUAL_RETROCEDE');
  });

  it('soma das medições não passa do contrato', () => {
    const impedimentos = impedimentosDaMedicao({
      ...base,
      proposta: { percentualAcumulado: 90, valor: 700_000 },
    });

    expect(impedimentos.map((i) => i.codigo)).toContain('ESTOURA_CONTRATO');
  });

  it('não mede além do que o cronograma registra como executado', () => {
    const impedimentos = impedimentosDaMedicao({
      ...base,
      percentualFisicoDasEtapas: 45,
      proposta: { percentualAcumulado: 80, valor: 100_000 },
    });

    expect(impedimentos.map((i) => i.codigo)).toContain('ALEM_DO_EXECUTADO');
  });
});

describe('podeTransicionarUnidade', () => {
  it('unidade pronta é entregue', () => {
    expect(podeTransicionarUnidade('PRONTA', 'ENTREGUE')).toBe(true);
  });

  it('retomada não volta direto para entregue', () => {
    expect(podeTransicionarUnidade('RETOMADA', 'ENTREGUE')).toBe(false);
    expect(podeTransicionarUnidade('RETOMADA', 'PRONTA')).toBe(true);
  });

  it('cancelada é terminal', () => {
    expect(podeTransicionarUnidade('CANCELADA', 'EM_OBRA')).toBe(false);
  });
});
