/**
 * Validação das variáveis obrigatórias no boot. Falha alto em vez de subir com fallback de dev —
 * segredo default esquecido em deploy é a forma mais barata de transformar autenticação em enfeite.
 */
const OBRIGATORIAS = ['JWT_ACCESS_SECRET', 'RUNTIME_DATABASE_URL'] as const;

export function validarEnvObrigatorias(): void {
  const faltando = OBRIGATORIAS.filter((chave) => !process.env[chave]);
  if (faltando.length > 0) {
    throw new Error(
      `Env obrigatória(s) ausente(s): ${faltando.join(', ')}. Configure no .env da raiz (dev) ` +
        'ou nas variáveis do deploy (prod) — ver .env.example.',
    );
  }
}
