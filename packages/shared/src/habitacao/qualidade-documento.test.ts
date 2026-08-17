import { describe, expect, it } from 'vitest';
import { aferirQualidade, type MedidasArquivo } from './qualidade-documento.js';

function foto(sobrescrita: Partial<MedidasArquivo> = {}): MedidasArquivo {
  return {
    mimeType: 'image/jpeg',
    tamanho: 900 * 1024,
    largura: 2000,
    altura: 1500,
    confiancaOcr: 85,
    caracteresLidos: 400,
    ...sobrescrita,
  };
}

describe('aferirQualidade', () => {
  it('foto nítida passa sem ressalva', () => {
    const avaliacao = aferirQualidade(foto());

    expect(avaliacao.nivel).toBe('BOA');
    expect(avaliacao.problemas).toHaveLength(0);
  });

  it('resolução baixa barra o envio', () => {
    const avaliacao = aferirQualidade(foto({ largura: 640, altura: 480 }));

    expect(avaliacao.aceitavel).toBe(false);
    expect(avaliacao.problemas.map((p) => p.codigo)).toContain('RESOLUCAO_BAIXA');
  });

  it('texto ilegível barra o envio', () => {
    const avaliacao = aferirQualidade(foto({ confiancaOcr: 20 }));

    expect(avaliacao.nivel).toBe('RUIM');
    expect(avaliacao.orientacao).toContain('Refaça a foto');
  });

  it('leitura sofrível avisa, mas não impede', () => {
    const avaliacao = aferirQualidade(foto({ confiancaOcr: 50 }));

    expect(avaliacao.aceitavel).toBe(true);
    expect(avaliacao.nivel).toBe('ACEITAVEL');
  });

  it('página sem texto barra — provavelmente é a página errada', () => {
    const avaliacao = aferirQualidade(foto({ caracteresLidos: 5 }));

    expect(avaliacao.problemas.map((p) => p.codigo)).toContain('SEM_TEXTO');
  });

  it('PDF não é medido por resolução nem por texto de OCR', () => {
    const avaliacao = aferirQualidade({ mimeType: 'application/pdf', tamanho: 20 * 1024 });

    expect(avaliacao.nivel).toBe('BOA');
  });
});
