import { describe, expect, it } from 'vitest';
import { conferirFicha, resumirInconsistencias, type RetratoFicha } from './inconsistencias.js';
import { iniciais, mascararParaEnvio } from './assistente.js';

const AGORA = new Date('2026-08-17T12:00:00.000Z');
const SALARIO_MINIMO = 1518;

function retrato(sobrescrita: Partial<RetratoFicha> = {}): RetratoFicha {
  return {
    rendaFamiliar: 1200,
    rendaPerCapita: 400,
    quantidadePessoas: 3,
    beneficios: [],
    inscritoCadUnico: true,
    nis: '12345678901',
    nisVerificado: true,
    temIdoso: false,
    temPessoaComDeficiencia: false,
    quantidadeMenores: 0,
    mulherChefeFamilia: false,
    situacaoRisco: false,
    temLaudoRisco: false,
    possuiOutroImovel: false,
    membros: [],
    salarioMinimo: SALARIO_MINIMO,
    ...sobrescrita,
  };
}

const codigos = (retratoFicha: RetratoFicha) =>
  conferirFicha(retratoFicha, AGORA).map((item) => item.codigo);

describe('conferirFicha', () => {
  it('ficha coerente não gera apontamento', () => {
    expect(conferirFicha(retrato(), AGORA)).toHaveLength(0);
  });

  it('per capita que não bate com a conta é achado de maior gravidade', () => {
    const achados = conferirFicha(
      retrato({ rendaFamiliar: 1200, quantidadePessoas: 3, rendaPerCapita: 600 }),
      AGORA,
    );

    expect(achados[0]?.codigo).toBe('PER_CAPITA_DIVERGENTE');
    expect(achados[0]?.afetaPontuacao).toBe(true);
    expect(achados[0]?.detalhe).toContain('400,00');
  });

  it('arredondamento de centavos não vira apontamento', () => {
    const achados = codigos(
      retrato({ rendaFamiliar: 1000, quantidadePessoas: 3, rendaPerCapita: 333.33 }),
    );

    expect(achados).not.toContain('PER_CAPITA_DIVERGENTE');
  });

  it('composição declarada difere dos membros cadastrados', () => {
    const achados = codigos(
      retrato({
        quantidadePessoas: 4,
        rendaPerCapita: 300,
        membros: [{ parentesco: 'RESPONSAVEL' }, { parentesco: 'FILHO' }],
      }),
    );

    expect(achados).toContain('COMPOSICAO_DIVERGENTE');
  });

  it('idoso na família com indicador desmarcado faz a família perder pontuação', () => {
    const achados = conferirFicha(
      retrato({
        quantidadePessoas: 1,
        rendaPerCapita: 1200,
        temIdoso: false,
        quantidadeMenores: 0,
        membros: [{ parentesco: 'RESPONSAVEL', nascimento: '1950-03-10' }],
      }),
      AGORA,
    );

    const idoso = achados.find((item) => item.codigo === 'IDOSO_NAO_MARCADO');
    expect(idoso?.afetaPontuacao).toBe(true);
  });

  it('indicador de idoso marcado sem ninguém com 60 anos', () => {
    const achados = codigos(
      retrato({
        quantidadePessoas: 1,
        rendaPerCapita: 1200,
        temIdoso: true,
        membros: [{ parentesco: 'RESPONSAVEL', nascimento: '1990-01-01' }],
      }),
    );

    expect(achados).toContain('IDOSO_SEM_MEMBRO');
  });

  it('conta menores pela data de nascimento', () => {
    const achados = codigos(
      retrato({
        quantidadePessoas: 2,
        rendaPerCapita: 600,
        quantidadeMenores: 0,
        membros: [
          { parentesco: 'RESPONSAVEL', nascimento: '1990-01-01' },
          { parentesco: 'FILHO', nascimento: '2015-06-20' },
        ],
      }),
    );

    expect(achados).toContain('MENORES_DIVERGENTE');
  });

  it('risco sem laudo é apontamento de alta gravidade', () => {
    const achados = conferirFicha(retrato({ situacaoRisco: true, temLaudoRisco: false }), AGORA);

    const risco = achados.find((item) => item.codigo === 'RISCO_SEM_LAUDO');
    expect(risco?.severidade).toBe('ALTA');
  });

  it('BPC declarado acima de 1/4 do salário mínimo', () => {
    const achados = codigos(
      retrato({ beneficios: ['BPC'], rendaFamiliar: 1500, quantidadePessoas: 3, rendaPerCapita: 500 }),
    );

    expect(achados).toContain('BPC_ACIMA_DA_FAIXA');
  });

  it('BPC dentro da faixa não gera apontamento', () => {
    const achados = codigos(
      retrato({ beneficios: ['BPC'], rendaFamiliar: 900, quantidadePessoas: 3, rendaPerCapita: 300 }),
    );

    expect(achados).not.toContain('BPC_ACIMA_DA_FAIXA');
  });

  it('Bolsa Família acima do teto do programa', () => {
    const achados = codigos(
      retrato({
        beneficios: ['BOLSA_FAMILIA'],
        rendaFamiliar: 1200,
        quantidadePessoas: 3,
        rendaPerCapita: 400,
      }),
    );

    expect(achados).toContain('BOLSA_FAMILIA_ACIMA_DA_FAIXA');
  });

  it('chefia feminina com responsável masculino', () => {
    const achados = codigos(retrato({ mulherChefeFamilia: true, responsavelSexo: 'MASCULINO' }));

    expect(achados).toContain('CHEFIA_FEMININA_DIVERGENTE');
  });

  it('o que afeta pontuação vem antes do que não afeta', () => {
    const achados = conferirFicha(
      retrato({
        rendaFamiliar: 1200,
        quantidadePessoas: 3,
        rendaPerCapita: 900,
        nis: '12345678901',
        nisVerificado: false,
      }),
      AGORA,
    );

    expect(achados[0]?.afetaPontuacao).toBe(true);
    expect(achados[achados.length - 1]?.afetaPontuacao).toBe(false);
  });

  it('resume o que importa para o painel', () => {
    const resumo = resumirInconsistencias(
      conferirFicha(retrato({ situacaoRisco: true, possuiOutroImovel: true }), AGORA),
    );

    expect(resumo.total).toBe(2);
    expect(resumo.altas).toBe(2);
  });
});

describe('mascararParaEnvio', () => {
  it('tira identificadores antes de o texto sair do produto', () => {
    const mascarado = mascararParaEnvio(
      'Marlene, CPF 123.456.789-09, NIS 12345678901, tel (65) 99999-8888, mora no CEP 78300-000, email m@x.com',
    );

    expect(mascarado).not.toContain('123.456.789-09');
    expect(mascarado).not.toContain('12345678901');
    expect(mascarado).not.toContain('78300-000');
    expect(mascarado).not.toContain('m@x.com');
    expect(mascarado).toContain('[CPF]');
    expect(mascarado).toContain('[TELEFONE]');
  });

  it('preserva o que o rascunho precisa entender', () => {
    const mascarado = mascararParaEnvio('Família de 4 pessoas, renda de R$ 1.200,00, casa de madeira.');

    expect(mascarado).toContain('4 pessoas');
    expect(mascarado).toContain('casa de madeira');
  });
});

describe('iniciais', () => {
  it('reduz o nome ao que basta para quem revisa', () => {
    expect(iniciais('Marlene Aparecida dos Santos')).toBe('M.A.S.');
  });
});
