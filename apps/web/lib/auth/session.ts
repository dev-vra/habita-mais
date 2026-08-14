import { cookies, headers } from 'next/headers';
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  DURACAO_REFRESH_SEGUNDOS,
  OPCOES_COOKIE_BASE,
  cookieSeguro,
} from './cookie-seguro';

export { COOKIE_ACCESS, COOKIE_REFRESH };

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/**
 * Protocolo de quem chamou. Atrás de proxy reverso vem em `x-forwarded-proto`; sem proxy, o
 * navegador não conta o esquema, e aí só resta o padrão http — que é justamente o caso do acesso
 * pela rede local.
 */
async function protocoloDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();
  return cabecalhos.get('x-forwarded-proto') ?? 'http';
}

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

  const opcoes = { ...OPCOES_COOKIE_BASE, secure: cookieSeguro(await protocoloDaRequisicao()) };

  jar.set(COOKIE_ACCESS, par.accessToken, { ...opcoes, expires: expiraEm });
  jar.set(COOKIE_REFRESH, par.refreshToken, { ...opcoes, maxAge: DURACAO_REFRESH_SEGUNDOS });
}

export async function limparSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_ACCESS);
  jar.delete(COOKIE_REFRESH);
}

/**
 * Renovações em andamento, por refresh token.
 *
 * Duas coisas aconteciam quando o access expirava com a página aberta: várias chamadas do BFF
 * batiam 401 juntas e cada uma tentava renovar — e como o refresh tem rotação, a primeira revogava
 * o token e as demais falhavam, derrubando a sessão. Compartilhar a renovação em curso resolve a
 * corrida.
 *
 * O caminho normal, porém, é o proxy: ele renova ANTES de a página renderizar e grava os cookies,
 * o que Server Component não pode fazer. Esta função é a rede de segurança para Route Handler e
 * Server Action — ali gravar é permitido, e o token novo persiste.
 */
const renovacoesEmCurso = new Map<string, Promise<string | null>>();

/**
 * Renova o access token pelo refresh guardado. O par novo é gravado quando o contexto permite;
 * em Server Component, o token volta apenas para a chamada em andamento — o proxy persiste na
 * próxima navegação.
 */
export async function renovarAcesso(): Promise<string | null> {
  const jar = await cookies();
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  if (!refresh) return null;

  const emCurso = renovacoesEmCurso.get(refresh);
  if (emCurso) return emCurso;

  const renovacao = executarRenovacao(refresh).finally(() => {
    renovacoesEmCurso.delete(refresh);
  });
  renovacoesEmCurso.set(refresh, renovacao);

  return renovacao;
}

async function executarRenovacao(refresh: string): Promise<string | null> {
  const resposta = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: 'no-store',
  });
  if (!resposta.ok) return null;

  const par = (await resposta.json()) as { accessToken: string; refreshToken: string };
  try {
    await gravarSessao(par);
  } catch {
    // Server Component não grava cookie. Não é erro: o token vale para esta chamada, e o proxy
    // persiste o par na próxima navegação.
  }
  return par.accessToken;
}
