// Validadores BR (fonte única — PADROES-BR.md §2, §3).
// CPF: 11 dígitos, DV módulo 11. CNPJ: alfanumérico desde o dia 1 (DV por ASCII−48).

/** Remove tudo que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Normaliza CNPJ: remove máscara e força UPPERCASE (alfanumérico). */
export function normalizeCnpj(value: string): string {
  return value.replace(/[./-]/g, '').toUpperCase();
}

/** Valida CPF pelos dígitos verificadores (módulo 11). Rejeita sequências iguais. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const dv = (base: string, firstWeight: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base.charAt(i)) * (firstWeight - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  if (dv(cpf.slice(0, 9), 10) !== Number(cpf.charAt(9))) return false;
  return dv(cpf.slice(0, 10), 11) === Number(cpf.charAt(10));
}

const CNPJ_FORMAT = /^[A-Z0-9]{12}[0-9]{2}$/;

/**
 * Valida CNPJ alfanumérico (e numérico legado). 14 posições: 12 primeiras A–Z/0–9,
 * 2 últimas (DV) sempre numéricas. DV por módulo 11 usando ASCII−48 de cada caractere.
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (!CNPJ_FORMAT.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false;

  const charValue = (c: string): number => c.charCodeAt(0) - 48;
  const dv = (base: string): number => {
    let sum = 0;
    let weight = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      sum += charValue(base.charAt(i)) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (dv(cnpj.slice(0, 12)) !== Number(cnpj.charAt(12))) return false;
  return dv(cnpj.slice(0, 13)) === Number(cnpj.charAt(13));
}

/** Valida CEP: 8 dígitos (formato; existência é consulta externa — ViaCEP). */
export function isValidCep(value: string): boolean {
  return onlyDigits(value).length === 8;
}
