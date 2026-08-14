// Normalização de texto (PT-BR). Fonte única — usado em rótulos e em buscas por município.

/** Remove acentos/diacríticos (faixa de combining marks U+0300–U+036F). */
function semAcento(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Title Case PT-BR: capitaliza cada palavra, mantém conectivos curtos em minúsculo
 * (exceto no início). Ex.: "consórcio intermunicipal" → "Consórcio Intermunicipal".
 */
export function tituloCaso(v: string): string {
  return v
    .trim()
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) =>
      i > 0 && CONECTIVOS.has(p) ? p : p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1),
    )
    .join(' ');
}

/**
 * Slug de URL a partir de um nome em PT-BR.
 *
 * Mora aqui porque o slug é identidade pública — o endereço do programa e o do empreendimento
 * precisam ser gerados pela mesma regra. Duas cópias divergindo produziriam dois links para o
 * mesmo nome, e um deles quebraria.
 */
export function slugify(v: string): string {
  return semAcento(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Chave estável de município p/ casar fontes diferentes: sem acento, maiúsculo, sem espaços extras. */
export function normalizarMunicipio(v: string): string {
  return semAcento(v).toUpperCase().replace(/\s+/g, ' ').trim();
}
