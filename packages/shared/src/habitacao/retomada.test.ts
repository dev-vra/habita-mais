import { describe, expect, it } from 'vitest';
import {
  avaliarCaso,
  decisaoRetiraUnidade,
  editalAdmissivel,
  podeTransicionarCaso,
  prazoDefesa,
  type EstadoCaso,
} from './retomada.js';

const AGORA = new Date('2026-08-17T12:00:00.000Z');

function caso(sobrescrita: Partial<EstadoCaso> = {}): EstadoCaso {
  return { fase: 'EM_ANALISE', ...sobrescrita };
}

describe('caminho do caso', () => {
  it('não pula da abertura para a decisão', () => {
    expect(podeTransicionarCaso('ABERTO', 'DECIDIDO')).toBe(false);
    expect(podeTransicionarCaso('ABERTO', 'NOTIFICADO')).toBe(true);
  });

  it('notificado pode ir a análise mesmo sem defesa — é a revelia', () => {
    expect(podeTransicionarCaso('NOTIFICADO', 'EM_ANALISE')).toBe(true);
  });

  it('caso encerrado não volta', () => {
    expect(podeTransicionarCaso('ENCERRADO', 'EM_ANALISE')).toBe(false);
  });

  it('só decide quem está em análise', () => {
    expect(podeTransicionarCaso('EM_DEFESA', 'DECIDIDO')).toBe(false);
    expect(podeTransicionarCaso('EM_ANALISE', 'DECIDIDO')).toBe(true);
  });
});

describe('avaliarCaso', () => {
  it('sem notificação não há decisão', () => {
    const avaliacao = avaliarCaso(caso(), AGORA);

    expect(avaliacao.podeDecidir).toBe(false);
    expect(avaliacao.impedimentos).toContain('SEM_NOTIFICACAO');
  });

  it('prazo de defesa em curso trava a decisão', () => {
    const avaliacao = avaliarCaso(
      caso({
        notificadoEm: '2026-08-10',
        formaNotificacao: 'PESSOAL',
        prazoDefesaAte: '2026-08-25',
      }),
      AGORA,
    );

    expect(avaliacao.podeDecidir).toBe(false);
    expect(avaliacao.impedimentos).toContain('PRAZO_DE_DEFESA_EM_CURSO');
    // Dias completos restantes: de 17/08 meio-dia a 25/08 são 7 dias inteiros e mais um pedaço.
    // Arredondar para cima daria à prefeitura um dia que a família não tem.
    expect(avaliacao.diasParaDefesa).toBe(7);
  });

  it('defesa apresentada libera a decisão antes do fim do prazo', () => {
    const avaliacao = avaliarCaso(
      caso({
        notificadoEm: '2026-08-10',
        formaNotificacao: 'PESSOAL',
        prazoDefesaAte: '2026-08-25',
        defesaApresentadaEm: '2026-08-14',
      }),
      AGORA,
    );

    expect(avaliacao.podeDecidir).toBe(true);
    expect(avaliacao.revelia).toBe(false);
  });

  it('prazo vencido sem defesa é revelia, e revelia não decide nada sozinha', () => {
    const avaliacao = avaliarCaso(
      caso({
        notificadoEm: '2026-07-01',
        formaNotificacao: 'AR_CORREIO',
        prazoDefesaAte: '2026-07-16',
      }),
      AGORA,
    );

    expect(avaliacao.revelia).toBe(true);
    // Pode decidir, mas é uma pessoa que decide — a revelia só tira o impedimento do prazo.
    expect(avaliacao.podeDecidir).toBe(true);
  });

  it('edital sem tentativas anteriores impede a decisão', () => {
    const avaliacao = avaliarCaso(
      caso({
        notificadoEm: '2026-07-01',
        formaNotificacao: 'EDITAL',
        tentativasFrustradas: 1,
        prazoDefesaAte: '2026-07-16',
      }),
      AGORA,
    );

    expect(avaliacao.podeDecidir).toBe(false);
    expect(avaliacao.impedimentos).toContain('EDITAL_SEM_TENTATIVAS');
  });

  it('edital depois de duas tentativas frustradas vale', () => {
    const avaliacao = avaliarCaso(
      caso({
        notificadoEm: '2026-07-01',
        formaNotificacao: 'EDITAL',
        tentativasFrustradas: 2,
        prazoDefesaAte: '2026-07-16',
      }),
      AGORA,
    );

    expect(avaliacao.podeDecidir).toBe(true);
  });

  it('fase errada impede mesmo com tudo em ordem', () => {
    const avaliacao = avaliarCaso(
      caso({
        fase: 'NOTIFICADO',
        notificadoEm: '2026-07-01',
        formaNotificacao: 'PESSOAL',
        prazoDefesaAte: '2026-07-16',
      }),
      AGORA,
    );

    expect(avaliacao.impedimentos).toContain('FASE_NAO_PERMITE');
  });
});

describe('prazos e formas', () => {
  it('prazo de defesa conta 15 dias da ciência', () => {
    expect(prazoDefesa(new Date('2026-08-17T00:00:00.000Z')).toISOString().slice(0, 10)).toBe(
      '2026-09-01',
    );
  });

  it('edital exige duas tentativas', () => {
    expect(editalAdmissivel(1)).toBe(false);
    expect(editalAdmissivel(2)).toBe(true);
  });

  it('só a rescisão retira a unidade', () => {
    expect(decisaoRetiraUnidade('RESCISAO')).toBe(true);
    expect(decisaoRetiraUnidade('ACORDO')).toBe(false);
    expect(decisaoRetiraUnidade('REGULARIZACAO')).toBe(false);
    expect(decisaoRetiraUnidade('ARQUIVAMENTO')).toBe(false);
  });
});
