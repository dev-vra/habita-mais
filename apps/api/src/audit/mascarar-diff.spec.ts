import { MASCARA, mascararDiffGenerico } from './mascarar-diff';

describe('mascararDiffGenerico', () => {
  it('mascara documento e identificador social', () => {
    const diff = mascararDiffGenerico({ cpf: '03712345622', nis: '16200000000', nome: 'Marlene' });

    expect(diff).toEqual({ cpf: MASCARA, nis: MASCARA, nome: 'Marlene' });
  });

  it('mascara dado bancário do mutuário', () => {
    const diff = mascararDiffGenerico({
      agencia: '1234',
      conta: '98765-4',
      chavePix: 'marlene@email.com',
      banco: '104',
    });

    expect(diff).toEqual({
      agencia: MASCARA,
      conta: MASCARA,
      chavePix: MASCARA,
      banco: MASCARA,
    });
  });

  it('preserva valor devido e vencimento — é o que a prestação de contas confere', () => {
    const diff = mascararDiffGenerico({ valorParcela: 412, vencimento: '2026-09-10' });

    expect(diff).toEqual({ valorParcela: 412, vencimento: '2026-09-10' });
  });

  it('mascara qualquer campo que fale de renda ou vulnerabilidade', () => {
    const diff = mascararDiffGenerico({
      rendaFamiliar: 1090,
      rendaPerCapita: 218,
      vulnerabilidades: ['PCD'],
    });

    expect(diff).toEqual({
      rendaFamiliar: MASCARA,
      rendaPerCapita: MASCARA,
      vulnerabilidades: MASCARA,
    });
  });

  it('desce em objeto aninhado e em array', () => {
    const diff = mascararDiffGenerico({
      familia: { responsavel: { cpf: '03712345622', nome: 'Marlene' } },
      membros: [{ cpf: '11122233344' }],
    });

    expect(diff).toEqual({
      familia: { responsavel: { cpf: MASCARA, nome: 'Marlene' } },
      membros: [{ cpf: MASCARA }],
    });
  });

  it('devolve escalares e null sem tocar', () => {
    expect(mascararDiffGenerico('texto')).toBe('texto');
    expect(mascararDiffGenerico(42)).toBe(42);
    expect(mascararDiffGenerico(null)).toBeNull();
  });
});
