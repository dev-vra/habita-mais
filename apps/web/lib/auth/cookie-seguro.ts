/**
 * Decide o flag `Secure` do cookie de sessão.
 *
 * Amarrar isso a NODE_ENV custou uma sessão inteira: em `next start` o ambiente é production, o
 * cookie saía `Secure`, e o navegador DESCARTA cookie Secure em conexão http. O efeito era o pior
 * possível de diagnosticar — o login respondia certo (a resposta da action já renderiza o destino
 * no servidor, com o cookie ainda em memória) e o primeiro clique caía no login, porque aí o
 * navegador não tinha cookie nenhum para mandar.
 *
 * A regra passa a ser o protocolo de quem está falando, não o modo de build: https → Secure, http →
 * sem Secure. `COOKIE_SECURE` força o valor quando a aplicação está atrás de um proxy que não
 * repassa o protocolo.
 */
export function cookieSeguro(protocolo: string | null | undefined): boolean {
  const forcado = process.env.COOKIE_SECURE;
  if (forcado === 'true') return true;
  if (forcado === 'false') return false;

  return (protocolo ?? '').replace(':', '').toLowerCase() === 'https';
}

/** Opções fixas do cookie de sessão. `secure` entra por fora, porque depende da requisição. */
export const OPCOES_COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
};

export const COOKIE_ACCESS = 'hb_at';
export const COOKIE_REFRESH = 'hb_rt';
export const DURACAO_REFRESH_SEGUNDOS = 7 * 24 * 60 * 60;
