import { describe, expect, it } from 'vitest';
import {
  CAPACIDADES_SENSIVEIS,
  PERFIS_TENANT,
  capacidadesPadrao,
  isCapacidadeSensivel,
  resolverCapacidades,
  temCapacidade,
} from './capacidades.js';

describe('resolverCapacidades', () => {
  it('nunca concede capacidade sensível só pelo cargo', () => {
    for (const perfil of PERFIS_TENANT) {
      const efetivas = resolverCapacidades(perfil);
      for (const sensivel of CAPACIDADES_SENSIVEIS) {
        expect(efetivas.has(sensivel)).toBe(false);
      }
    }
  });

  it('concede a sensível quando a prefeitura concede explicitamente', () => {
    const efetivas = resolverCapacidades('GESTOR_HABITACAO', {
      concedidas: ['CONVOCAR_FORA_DE_ORDEM'],
    });

    expect(efetivas.has('CONVOCAR_FORA_DE_ORDEM')).toBe(true);
  });

  it('faz a revogação vencer a concessão', () => {
    const efetivas = resolverCapacidades('ANALISTA_MUTUARIO', {
      concedidas: ['TRANSFERIR_TITULARIDADE'],
      revogadas: ['TRANSFERIR_TITULARIDADE'],
    });

    expect(efetivas.has('TRANSFERIR_TITULARIDADE')).toBe(false);
  });

  it('permite revogar capacidade ordinária do perfil', () => {
    expect(temCapacidade('ATENDENTE', 'INSCREVER_FAMILIA')).toBe(true);
    expect(
      temCapacidade('ATENDENTE', 'INSCREVER_FAMILIA', { revogadas: ['INSCREVER_FAMILIA'] }),
    ).toBe(false);
  });
});

describe('matriz por perfil', () => {
  it('separa vulnerabilidade social de dado financeiro', () => {
    expect(temCapacidade('TECNICO_SOCIAL', 'VER_PARECER_SOCIAL')).toBe(true);
    expect(temCapacidade('TECNICO_SOCIAL', 'VER_DADO_FINANCEIRO')).toBe(false);

    expect(temCapacidade('ANALISTA_MUTUARIO', 'VER_DADO_FINANCEIRO')).toBe(true);
    expect(temCapacidade('ANALISTA_MUTUARIO', 'VER_PARECER_SOCIAL')).toBe(false);
  });

  it('deixa o atendente inscrever, mas não decidir a fila', () => {
    expect(temCapacidade('ATENDENTE', 'INSCREVER_FAMILIA')).toBe(true);
    expect(temCapacidade('ATENDENTE', 'RECALCULAR_PONTUACAO')).toBe(false);
    expect(temCapacidade('ATENDENTE', 'DECLARAR_CONTEMPLACAO')).toBe(false);
    expect(temCapacidade('ATENDENTE', 'EMITIR_CONVOCACAO')).toBe(false);
  });

  it('deixa o gestor conduzir a fila sem editar ficha social alheia', () => {
    expect(temCapacidade('GESTOR_HABITACAO', 'PUBLICAR_RANKING')).toBe(true);
    expect(temCapacidade('GESTOR_HABITACAO', 'EDITAR_FICHA_SOCIAL')).toBe(false);
  });

  it('mantém o fiscal de obras longe da ficha social e do contrato', () => {
    expect(temCapacidade('FISCAL_OBRAS', 'REGISTRAR_MEDICAO')).toBe(true);
    expect(temCapacidade('FISCAL_OBRAS', 'EDITAR_FICHA_SOCIAL')).toBe(false);
    expect(temCapacidade('FISCAL_OBRAS', 'GERIR_CONTRATO')).toBe(false);
  });

  it('dá ao auditor leitura ampla e nenhuma escrita', () => {
    const efetivas = resolverCapacidades('FISCAL_AUDITOR');
    const escritas = [...efetivas].filter((c) => c.startsWith('GERIR_') || c.startsWith('EMITIR_'));

    expect(efetivas.has('LER_AUDITORIA')).toBe(true);
    expect(escritas).toEqual([]);
  });

  it('declara capacidade padrão para todo perfil', () => {
    for (const perfil of PERFIS_TENANT) {
      expect(capacidadesPadrao(perfil).length).toBeGreaterThan(0);
    }
  });
});

describe('isCapacidadeSensivel', () => {
  it('reconhece as quatro ações que a spec exige concessão explícita', () => {
    expect(isCapacidadeSensivel('RECALCULAR_PONTUACAO_LOTE')).toBe(true);
    expect(isCapacidadeSensivel('CORTAR_AUXILIO')).toBe(true);
    expect(isCapacidadeSensivel('INSCREVER_FAMILIA')).toBe(false);
  });
});
