// Diff campo a campo do histórico ("mudou uma letra, registra"). Compara o estado anterior com
// os valores propostos e devolve só o que mudou, já com dado sensível mascarado.

import { br } from '@habita/shared';
import { MASCARA } from './mascarar-diff';

export type ValorDiff = string | number | boolean | null;

export interface CampoAlterado {
  campo: string;
  rotulo: string;
  de: ValorDiff;
  para: ValorDiff;
}

export interface EspecCampo {
  /** Rótulo humano exibido na linha do tempo (ex.: "Renda per capita"). */
  rotulo: string;
  /** Máscara aplicada antes de persistir: cpf → parcial (***.456.789-**); oculto → •••. */
  sensivel?: 'cpf' | 'oculto';
}

function normalizar(valor: unknown): ValorDiff {
  if (valor === undefined || valor === null) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (Array.isArray(valor)) return valor.map(String).sort().join(', ') || null;
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
  if (typeof valor === 'string') return valor.trim() === '' ? null : valor;
  // Decimal do Prisma e afins: representação estável em string.
  return String(valor);
}

function mascarar(valor: ValorDiff, sensivel: EspecCampo['sensivel']): ValorDiff {
  if (valor === null || !sensivel) return valor;
  if (sensivel === 'cpf') return br.mascararCpfParcial(String(valor));
  return MASCARA;
}

/**
 * Campos alterados entre `antes` e `depois`, segundo `espec` — só o que está especificado entra
 * no diff, o resto é ignorado de propósito. `undefined` em `depois` significa campo não tocado
 * pela mutação; string vazia equivale a null.
 */
export function diffCampos<T extends Record<string, unknown>>(
  antes: T,
  depois: Partial<Record<keyof T & string, unknown>>,
  espec: Partial<Record<keyof T & string, EspecCampo>>,
): CampoAlterado[] {
  const alterados: CampoAlterado[] = [];

  for (const campo of Object.keys(espec) as (keyof T & string)[]) {
    const especCampo = espec[campo];
    if (!especCampo) continue;
    if (!(campo in depois) || depois[campo] === undefined) continue;

    const de = normalizar(antes[campo]);
    const para = normalizar(depois[campo]);
    if (de === para) continue;

    alterados.push({
      campo,
      rotulo: especCampo.rotulo,
      de: mascarar(de, especCampo.sensivel),
      para: mascarar(para, especCampo.sensivel),
    });
  }

  return alterados;
}

/** Snapshot de criação ou remoção: todo campo não nulo vira uma linha `null → v` (ou `v → null`). */
export function camposDeSnapshot<T extends Record<string, unknown>>(
  registro: T,
  espec: Partial<Record<keyof T & string, EspecCampo>>,
  direcao: 'criacao' | 'remocao',
): CampoAlterado[] {
  const linhas: CampoAlterado[] = [];

  for (const campo of Object.keys(espec) as (keyof T & string)[]) {
    const especCampo = espec[campo];
    if (!especCampo) continue;

    const valor = mascarar(normalizar(registro[campo]), especCampo.sensivel);
    if (valor === null) continue;

    linhas.push(
      direcao === 'criacao'
        ? { campo, rotulo: especCampo.rotulo, de: null, para: valor }
        : { campo, rotulo: especCampo.rotulo, de: valor, para: null },
    );
  }

  return linhas;
}
