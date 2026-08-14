import { describe, expect, it } from 'vitest';
import {
  calcularValidade,
  conferirDocumentos,
  resumirConferencia,
  type ExigenciaComDocumento,
} from './documental.js';

const AGORA = new Date('2026-08-14T12:00:00.000Z');

function exigencia(sobrescrita: Partial<ExigenciaComDocumento> = {}): ExigenciaComDocumento {
  return {
    tipoCodigo: 'COMPROVANTE_RENDA',
    tipoNome: 'Comprovante de renda',
    obrigatorio: true,
    ...sobrescrita,
  };
}

describe('conferirDocumentos', () => {
  it('exigência sem documento falta e impede', () => {
    const [item] = conferirDocumentos([exigencia()], AGORA);

    expect(item?.estado).toBe('FALTANDO');
    expect(item?.impeditivo).toBe(true);
  });

  it('exigência opcional que falta não impede', () => {
    const [item] = conferirDocumentos([exigencia({ obrigatorio: false })], AGORA);

    expect(item?.impeditivo).toBe(false);
  });

  it('documento vencido conta como ausente', () => {
    const [item] = conferirDocumentos(
      [
        exigencia({
          documento: {
            id: '1',
            protocolo: 'DOC-2026/00001',
            situacao: 'CONFERIDO',
            validoAte: '2026-05-01',
          },
        }),
      ],
      AGORA,
    );

    expect(item?.estado).toBe('VENCIDO');
    expect(item?.impeditivo).toBe(true);
  });

  it('avisa antes de vencer, sem impedir', () => {
    const [item] = conferirDocumentos(
      [
        exigencia({
          documento: {
            id: '1',
            protocolo: 'DOC-2026/00001',
            situacao: 'CONFERIDO',
            validoAte: '2026-09-01',
          },
        }),
      ],
      AGORA,
    );

    expect(item?.estado).toBe('VENCENDO');
    expect(item?.impeditivo).toBe(false);
  });

  it('separa recebido de conferido — anexar não é aceitar', () => {
    const itens = conferirDocumentos(
      [
        exigencia({
          tipoCodigo: 'A',
          documento: { id: '1', protocolo: 'DOC-1', situacao: 'RECEBIDO' },
        }),
        exigencia({
          tipoCodigo: 'B',
          documento: { id: '2', protocolo: 'DOC-2', situacao: 'CONFERIDO' },
        }),
      ],
      AGORA,
    );

    expect(itens.find((i) => i.tipoCodigo === 'A')?.estado).toBe('RECEBIDO');
    expect(itens.find((i) => i.tipoCodigo === 'B')?.estado).toBe('CONFERIDO');
  });

  it('documento recusado impede como se não existisse', () => {
    const [item] = conferirDocumentos(
      [
        exigencia({
          documento: {
            id: '1',
            protocolo: 'DOC-1',
            situacao: 'RECUSADO',
            motivoRecusa: 'Ilegível',
          },
        }),
      ],
      AGORA,
    );

    expect(item?.estado).toBe('RECUSADO');
    expect(item?.impeditivo).toBe(true);
  });

  it('substituído volta a faltar — a versão nova é que vale', () => {
    const [item] = conferirDocumentos(
      [exigencia({ documento: { id: '1', protocolo: 'DOC-1', situacao: 'SUBSTITUIDO' } })],
      AGORA,
    );

    expect(item?.estado).toBe('FALTANDO');
  });

  it('ordena o que trava antes do que está pronto', () => {
    const itens = conferirDocumentos(
      [
        exigencia({
          tipoCodigo: 'PRONTO',
          documento: { id: '1', protocolo: 'DOC-1', situacao: 'CONFERIDO' },
        }),
        exigencia({ tipoCodigo: 'FALTA' }),
      ],
      AGORA,
    );

    expect(itens[0]?.tipoCodigo).toBe('FALTA');
  });
});

describe('resumirConferencia', () => {
  it('percentual conta só os obrigatórios', () => {
    const itens = conferirDocumentos(
      [
        exigencia({
          tipoCodigo: 'A',
          documento: { id: '1', protocolo: 'DOC-1', situacao: 'CONFERIDO' },
        }),
        exigencia({ tipoCodigo: 'B' }),
        exigencia({ tipoCodigo: 'C', obrigatorio: false }),
      ],
      AGORA,
    );
    const resumo = resumirConferencia(itens);

    expect(resumo.percentualObrigatorios).toBe(50);
    expect(resumo.completo).toBe(false);
    expect(resumo.impeditivos).toBe(1);
  });

  it('completo quando todo obrigatório está em ordem', () => {
    const itens = conferirDocumentos(
      [
        exigencia({
          tipoCodigo: 'A',
          documento: { id: '1', protocolo: 'DOC-1', situacao: 'CONFERIDO' },
        }),
        exigencia({ tipoCodigo: 'B', obrigatorio: false }),
      ],
      AGORA,
    );

    expect(resumirConferencia(itens).completo).toBe(true);
  });
});

describe('calcularValidade', () => {
  it('soma os meses da emissão', () => {
    expect(calcularValidade(new Date('2026-08-14'), 3)?.toISOString().slice(0, 10)).toBe(
      '2026-11-14',
    );
  });

  it('tipo sem prazo não vence', () => {
    expect(calcularValidade(new Date('2026-08-14'), null)).toBeNull();
  });
});
