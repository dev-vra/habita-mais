import { cookies } from 'next/headers';

/**
 * Sessão da central em cookie próprio, separado do cookie do servidor. Esfera isolada também na
 * borda: um navegador com sessão de servidor não vira sessão de família por engano, e vice-versa.
 */
export const COOKIE_MUNICIPE = 'hb_mun_at';

const OPCOES = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function gravarSessaoMunicipe(accessToken: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_MUNICIPE, accessToken, OPCOES);
}

export async function tokenMunicipe(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_MUNICIPE)?.value;
}

export async function limparSessaoMunicipe(): Promise<void> {
  (await cookies()).delete(COOKIE_MUNICIPE);
}
