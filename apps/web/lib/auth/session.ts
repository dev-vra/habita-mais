import { cookies } from 'next/headers';

export const COOKIE_ACCESS = 'hb_at';
export const COOKIE_REFRESH = 'hb_rt';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

const OPCOES_COMUNS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const DURACAO_REFRESH_SEGUNDOS = 7 * 24 * 60 * 60;

export interface SessaoUsuario {
  userId: string;
  nome: string;
  perfil?: string;
  capacidades: string[];
  tenantId: string | null;
  trocarSenhaNoLogin: boolean;
  exp: number;
}

/** Lê o payload do JWT sem verificar assinatura — quem verifica é a API, a cada requisição. */
export function lerPayload(token: string): SessaoUsuario | null {
  try {
    const bruto = token.split('.')[1];
    if (!bruto) return null;

    const base64 = bruto.replace(/-/g, '+').replace(/_/g, '/');
    const completo = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const dados = JSON.parse(atob(completo)) as Record<string, unknown>;

    return {
      userId: String(dados.sub ?? ''),
      nome: String(dados.nome ?? ''),
      perfil: dados.perfil ? String(dados.perfil) : undefined,
      capacidades: Array.isArray(dados.capacidades) ? (dados.capacidades as string[]) : [],
      tenantId: dados.tenantId ? String(dados.tenantId) : null,
      trocarSenhaNoLogin: dados.trocarSenhaNoLogin === true,
      exp: Number(dados.exp ?? 0),
    };
  } catch {
    return null;
  }
}

export async function sessaoAtual(): Promise<SessaoUsuario | null> {
  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  return token ? lerPayload(token) : null;
}

export async function gravarSessao(par: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  const jar = await cookies();
  const payload = lerPayload(par.accessToken);
  const expiraEm = payload?.exp ? new Date(payload.exp * 1000) : undefined;

  jar.set(COOKIE_ACCESS, par.accessToken, { ...OPCOES_COMUNS, expires: expiraEm });
  jar.set(COOKIE_REFRESH, par.refreshToken, {
    ...OPCOES_COMUNS,
    maxAge: DURACAO_REFRESH_SEGUNDOS,
  });
}

export async function limparSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_ACCESS);
  jar.delete(COOKIE_REFRESH);
}

/**
 * Renova o access token pelo refresh guardado. Chamado quando a API responde 401 numa navegação:
 * o access dura 15 minutos, e uma aba aberta além disso travaria sem esta renovação.
 */
export async function renovarAcesso(): Promise<string | null> {
  const jar = await cookies();
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  if (!refresh) return null;

  const resposta = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: 'no-store',
  });
  if (!resposta.ok) return null;

  const par = (await resposta.json()) as { accessToken: string; refreshToken: string };
  await gravarSessao(par);
  return par.accessToken;
}
