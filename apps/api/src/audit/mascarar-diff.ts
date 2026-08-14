// Máscara por nome de campo, aplicada antes de gravar e ao ler o audit_log.
//
// É rede de segurança: a maioria das chamadas de AuditService.log monta o diff à mão, sem passar
// por diffCampos. Sem isto, um diff cru com CPF, NIS ou renda vazaria para a tela de trilha.
//
// O Habita+ amplia a lista do Regulariza+ para dado bancário (spec §3, §8): conta e chave PIX do
// mutuário têm sensibilidade diferente da ficha social, e a lista de inadimplentes não pode virar
// relatório de circulação livre. Valor devido e vencimento seguem visíveis de propósito — é
// exatamente o que a prestação de contas precisa conferir.
//
// Best-effort por NOME, não por conteúdo: um texto livre com CPF digitado à mão não é pego.

/** JSON estrutural. Os tipos do Prisma (InputJsonValue/JsonValue) divergem entre escrita e
 *  leitura; a máscara trabalha num tipo só e o cast fica na borda, em audit.service. */
export type ValorJson = string | number | boolean | null | ValorJson[] | { [chave: string]: ValorJson };

export const MASCARA = '•••';

const CHAVES_EXATAS = new Set([
  'cpf',
  'cnpj',
  'documento',
  'nis',
  'senha',
  'senhahash',
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'hash',
  // Dado bancário do mutuário
  'agencia',
  'conta',
  'contacorrente',
  'contapoupanca',
  'chavepix',
  'pix',
  'banco',
  'titularconta',
  // Texto livre de conteúdo social
  'parecer',
  'parecertecnico',
  'observacaosocial',
  'observacaovisita',
]);

const SUBSTRINGS = ['renda', 'vulnerab', 'salario', 'beneficio'];

function chaveSensivel(chave: string): boolean {
  const normalizada = chave.toLowerCase();
  return CHAVES_EXATAS.has(normalizada) || SUBSTRINGS.some((s) => normalizada.includes(s));
}

/** Máscara recursiva por nome de campo — defesa em profundidade sobre o diff cru do audit_log. */
export function mascararDiffGenerico(diff: ValorJson): ValorJson {
  if (diff === null || typeof diff !== 'object') return diff;
  if (Array.isArray(diff)) return diff.map((valor) => mascararDiffGenerico(valor));

  const saida: Record<string, ValorJson> = {};
  for (const [chave, valor] of Object.entries(diff)) {
    saida[chave] = chaveSensivel(chave) ? MASCARA : mascararDiffGenerico(valor ?? null);
  }
  return saida;
}
