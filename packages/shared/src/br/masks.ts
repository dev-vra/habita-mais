// Máscaras de entrada BR (fonte única — PADROES-BR.md §0).
// Regra de ouro: o usuário digita só o conteúdo; a máscara formata sozinha.
// Armazenar canônico (cru) · exibir formatado.

/** Mantém apenas dígitos. */
const digits = (v: string): string => v.replace(/\D/g, '');

/** CPF: 000.000.000-00 (11 dígitos). */
export function maskCpf(v: string): string {
  const d = digits(v).slice(0, 11);
  let o = d.slice(0, 3);
  if (d.length > 3) o += '.' + d.slice(3, 6);
  if (d.length > 6) o += '.' + d.slice(6, 9);
  if (d.length > 9) o += '-' + d.slice(9, 11);
  return o;
}

/** Máscara parcial p/ logs e auditoria (LGPD §11.6): esconde início e DV. Ex.: ***.456.789-**. */
export function mascararCpfParcial(v: string): string {
  const d = digits(v);
  if (d.length !== 11) return '***';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/**
 * CNPJ alfanumérico (ADR-016): 12 posições A–Z|0–9 + 2 dígitos verificadores numéricos.
 * 00.000.000/0000-00.
 */
export function maskCnpj(v: string): string {
  const s = v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
  const base = s.slice(0, 12);
  const dv = s.slice(12).replace(/\D/g, '');
  let o = base.slice(0, 2);
  if (base.length > 2) o += '.' + base.slice(2, 5);
  if (base.length > 5) o += '.' + base.slice(5, 8);
  if (base.length > 8) o += '/' + base.slice(8, 12);
  if (dv) o += '-' + dv;
  return o;
}

/** CEP: 00000-000 (8 dígitos). */
export function maskCep(v: string): string {
  const d = digits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Telefone dinâmico: 10 dígitos = fixo, 11 = celular. (00) 0000-0000 / (00) 00000-0000. */
export function maskPhone(v: string): string {
  const d = digits(v).slice(0, 11);
  if (d.length < 3) return d ? `(${d}` : '';
  if (d.length < 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Data: dd/mm/aaaa. */
export function maskDate(v: string): string {
  const d = digits(v).slice(0, 8);
  let o = d.slice(0, 2);
  if (d.length > 2) o += '/' + d.slice(2, 4);
  if (d.length > 4) o += '/' + d.slice(4, 8);
  return o;
}
