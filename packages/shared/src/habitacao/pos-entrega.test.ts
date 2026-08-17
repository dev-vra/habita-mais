import { describe, expect, it } from 'vitest';
import {
  avaliarAcompanhamento,
  exigeApuracao,
  ocorrenciaEmAberto,
  podeTransicionarOcorrencia,
  prazoRegularizacao,
  regraDaOcorrencia,
} from './pos-entrega.js';

const AGORA = new Date('2026-08-17T12:00:00.000Z');

describe('avaliarAcompanhamento', () => {
  it('unidade sem entrega não tem acompanhamento a fazer', () => {
    const avaliacao = avaliarAcompanhamento({ exigeAcompanhamento: false }, AGORA);

    expect(avaliacao.situacao).toBe('SEM_ACOMPANHAMENTO');
    expect(avaliacao.proximaVisitaEm).toBeNull();
  });

  it('primeira visita conta da entrega, não de uma visita que nunca houve', () => {
    const avaliacao = avaliarAcompanhamento(
      { entregueEm: '2026-07-01', exigeAcompanhamento: true },
      AGORA,
    );

    // 90 dias após 01/07 → 29/09, ainda no prazo.
    expect(avaliacao.situacao).toBe('AGUARDANDO_PRIMEIRA');
    expect(avaliacao.proximaVisitaEm?.slice(0, 10)).toBe('2026-09-29');
  });

  it('entrega antiga sem nenhuma visita está vencida', () => {
    const avaliacao = avaliarAcompanhamento(
      { entregueEm: '2025-01-10', exigeAcompanhamento: true },
      AGORA,
    );

    expect(avaliacao.situacao).toBe('VENCIDA');
    expect(avaliacao.diasParaProxima).toBeLessThan(0);
  });

  it('depois da primeira visita, o ciclo passa a contar dela', () => {
    const avaliacao = avaliarAcompanhamento(
      { entregueEm: '2025-01-10', ultimaVisitaEm: '2026-06-01', exigeAcompanhamento: true },
      AGORA,
    );

    // 6 meses após 01/06 → 01/12.
    expect(avaliacao.proximaVisitaEm?.slice(0, 10)).toBe('2026-12-01');
    expect(avaliacao.situacao).toBe('EM_DIA');
  });

  it('avisa antes de vencer', () => {
    const avaliacao = avaliarAcompanhamento(
      { entregueEm: '2025-01-10', ultimaVisitaEm: '2026-03-01', exigeAcompanhamento: true },
      AGORA,
    );

    // 6 meses após 01/03 → 01/09: dentro da janela de 30 dias.
    expect(avaliacao.situacao).toBe('VENCENDO');
  });

  it('respeita a periodicidade do município', () => {
    const avaliacao = avaliarAcompanhamento(
      { entregueEm: '2026-01-10', ultimaVisitaEm: '2026-06-01', exigeAcompanhamento: true },
      AGORA,
      { periodicidadeMeses: 2 },
    );

    expect(avaliacao.proximaVisitaEm?.slice(0, 10)).toBe('2026-08-01');
    expect(avaliacao.situacao).toBe('VENCIDA');
  });

  it('visita no fim do mês não empurra o ciclo para o mês seguinte', () => {
    const avaliacao = avaliarAcompanhamento(
      { entregueEm: '2026-01-01', ultimaVisitaEm: '2025-12-31', exigeAcompanhamento: true },
      AGORA,
      { periodicidadeMeses: 2 },
    );

    expect(avaliacao.proximaVisitaEm?.slice(0, 10)).toBe('2026-02-28');
  });
});

describe('ocorrências de uso', () => {
  it('venda é a mais grave e não admite regularização', () => {
    const regra = regraDaOcorrencia('VENDA_TRANSFERENCIA');

    expect(regra.gravidade).toBe('GRAVISSIMA');
    expect(regra.prazoRegularizacaoDias).toBeNull();
    expect(prazoRegularizacao('VENDA_TRANSFERENCIA', AGORA)).toBeNull();
  });

  it('aluguel e cessão exigem apuração formal', () => {
    expect(exigeApuracao('ALUGUEL')).toBe(true);
    expect(exigeApuracao('CESSAO_TERCEIRO')).toBe(true);
  });

  it('óbito do titular e mudança de composição não são infração', () => {
    expect(regraDaOcorrencia('OBITO_TITULAR').gravidade).toBe('ADMINISTRATIVA');
    expect(regraDaOcorrencia('MUDANCA_COMPOSICAO').gravidade).toBe('ADMINISTRATIVA');
    expect(exigeApuracao('OBITO_TITULAR')).toBe(false);
  });

  it('prazo de regularização conta da notificação', () => {
    const prazo = prazoRegularizacao('ALUGUEL', new Date('2026-08-17T00:00:00.000Z'));

    expect(prazo?.toISOString().slice(0, 10)).toBe('2026-09-16');
  });
});

describe('caminho da ocorrência', () => {
  it('não vai de aberta direto ao jurídico', () => {
    expect(podeTransicionarOcorrencia('ABERTA', 'ENCAMINHADA_JURIDICO')).toBe(false);
    expect(podeTransicionarOcorrencia('ABERTA', 'EM_APURACAO')).toBe(true);
  });

  it('só notificada segue para o jurídico', () => {
    expect(podeTransicionarOcorrencia('EM_APURACAO', 'ENCAMINHADA_JURIDICO')).toBe(false);
    expect(podeTransicionarOcorrencia('NOTIFICADA', 'ENCAMINHADA_JURIDICO')).toBe(true);
  });

  it('regularizada e improcedente encerram', () => {
    expect(podeTransicionarOcorrencia('REGULARIZADA', 'EM_APURACAO')).toBe(false);
    expect(podeTransicionarOcorrencia('IMPROCEDENTE', 'ABERTA')).toBe(false);
  });

  it('família que regulariza depois do jurídico encerra o caso', () => {
    expect(podeTransicionarOcorrencia('ENCAMINHADA_JURIDICO', 'REGULARIZADA')).toBe(true);
  });

  it('reconhece o que ainda pesa sobre a unidade', () => {
    expect(ocorrenciaEmAberto('NOTIFICADA')).toBe(true);
    expect(ocorrenciaEmAberto('REGULARIZADA')).toBe(false);
  });
});
