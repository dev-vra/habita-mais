import { describe, expect, it } from 'vitest';
import { diagnosticarCadastro, resumirDiagnostico, type EstadoCadastro } from './diagnostico.js';

function estado(sobrescrita: Partial<EstadoCadastro> = {}): EstadoCadastro {
  return {
    temFichaVigente: true,
    fichaVencida: false,
    fichaVenceEmDias: 300,
    quantidadePessoas: 3,
    membrosCadastrados: 2,
    rendaFamiliar: 1200,
    fonteRendaInformada: true,
    nisInformado: true,
    nisVerificado: true,
    enderecoCompleto: true,
    situacaoRisco: false,
    temLaudoRisco: false,
    vulnerabilidadesMarcadas: 1,
    inscricoes: [
      { situacao: 'APTA', pendenciasAbertas: 0, pontuacaoDesatualizada: false, temSnapshot: true },
    ],
    programasComInscricaoAberta: 1,
    ...sobrescrita,
  };
}

const codigos = (itens: { codigo: string }[]) => itens.map((item) => item.codigo);

describe('diagnosticarCadastro', () => {
  it('família completa e apta não tem bloqueio', () => {
    const itens = diagnosticarCadastro(estado());

    expect(itens.filter((item) => item.severidade === 'BLOQUEIO')).toEqual([]);
    expect(codigos(itens)).toContain('APTA');
  });

  it('sem ficha, para tudo e não acumula outros avisos', () => {
    const itens = diagnosticarCadastro(estado({ temFichaVigente: false }));

    expect(itens).toHaveLength(1);
    expect(itens[0]?.codigo).toBe('SEM_FICHA');
    expect(itens[0]?.severidade).toBe('BLOQUEIO');
  });

  it('risco declarado sem laudo é bloqueio, com a ação de encaminhar', () => {
    const itens = diagnosticarCadastro(estado({ situacaoRisco: true, temLaudoRisco: false }));
    const risco = itens.find((item) => item.codigo === 'RISCO_SEM_LAUDO');

    expect(risco?.severidade).toBe('BLOQUEIO');
    expect(risco?.acao).toMatch(/Defesa Civil/);
  });

  it('risco com laudo não gera bloqueio', () => {
    const itens = diagnosticarCadastro(estado({ situacaoRisco: true, temLaudoRisco: true }));

    expect(codigos(itens)).not.toContain('RISCO_SEM_LAUDO');
  });

  it('conta o responsável na composição esperada', () => {
    const completo = diagnosticarCadastro(estado({ quantidadePessoas: 3, membrosCadastrados: 2 }));
    const faltando = diagnosticarCadastro(estado({ quantidadePessoas: 5, membrosCadastrados: 1 }));

    expect(codigos(completo)).not.toContain('COMPOSICAO_INCOMPLETA');
    expect(faltando.find((i) => i.codigo === 'COMPOSICAO_INCOMPLETA')?.titulo).toContain('3 membros');
  });

  it('avisa a ficha vencendo antes de ela vencer', () => {
    const perto = diagnosticarCadastro(estado({ fichaVenceEmDias: 30 }));
    const longe = diagnosticarCadastro(estado({ fichaVenceEmDias: 200 }));

    expect(codigos(perto)).toContain('FICHA_VENCENDO');
    expect(codigos(longe)).not.toContain('FICHA_VENCENDO');
  });

  it('pendência aberta bloqueia; pontuação velha só chama atenção', () => {
    const itens = diagnosticarCadastro(
      estado({
        inscricoes: [
          {
            situacao: 'PENDENTE',
            pendenciasAbertas: 2,
            pontuacaoDesatualizada: true,
            temSnapshot: true,
          },
        ],
      }),
    );

    expect(itens.find((i) => i.codigo === 'PENDENCIA_ABERTA')?.severidade).toBe('BLOQUEIO');
    expect(itens.find((i) => i.codigo === 'PONTUACAO_DESATUALIZADA')?.severidade).toBe('ATENCAO');
  });

  it('sem inscrição, sugere inscrever quando há programa aberto', () => {
    const comPrograma = diagnosticarCadastro(
      estado({ inscricoes: [], programasComInscricaoAberta: 2 }),
    );
    const semPrograma = diagnosticarCadastro(
      estado({ inscricoes: [], programasComInscricaoAberta: 0 }),
    );

    expect(comPrograma.find((i) => i.codigo === 'SEM_INSCRICAO')?.severidade).toBe('PROXIMO_PASSO');
    expect(semPrograma.find((i) => i.codigo === 'SEM_INSCRICAO')?.severidade).toBe('ATENCAO');
  });

  it('ordena bloqueio antes de próximo passo, e atenção depois', () => {
    const itens = diagnosticarCadastro(
      estado({
        situacaoRisco: true,
        temLaudoRisco: false,
        nisVerificado: false,
        inscricoes: [],
        programasComInscricaoAberta: 1,
      }),
    );

    expect(itens[0]?.severidade).toBe('BLOQUEIO');
    expect(itens.map((i) => i.severidade).indexOf('PROXIMO_PASSO')).toBeLessThan(
      itens.map((i) => i.severidade).indexOf('ATENCAO'),
    );
  });
});

describe('resumirDiagnostico', () => {
  it('conta bloqueios e atenções e destaca o próximo passo', () => {
    const itens = diagnosticarCadastro(
      estado({ situacaoRisco: true, nisVerificado: false, inscricoes: [] }),
    );
    const resumo = resumirDiagnostico(itens);

    expect(resumo.bloqueios).toBeGreaterThan(0);
    expect(resumo.atencoes).toBeGreaterThan(0);
    expect(resumo.proximoPasso?.codigo).toBe('SEM_INSCRICAO');
  });
});
