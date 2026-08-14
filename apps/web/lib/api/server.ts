import { cookies } from 'next/headers';
import { COOKIE_ACCESS, renovarAcesso } from '@/lib/auth/session';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/** Erro padronizado da API: { statusCode, message, error, timestamp, path }. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get semPermissao(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function mensagemDeErro(corpo: unknown, padrao: string): string {
  const erro = corpo as { message?: string | string[]; error?: string };
  if (Array.isArray(erro?.message)) return erro.message.join(' ');
  if (typeof erro?.message === 'string') return erro.message;
  if (typeof erro?.error === 'string') return erro.error;
  return padrao;
}

/**
 * Cliente HTTP do BFF. Anexa o Bearer do cookie httpOnly e nunca expõe o token ao browser —
 * o navegador fala só com o web, e a API fica interna.
 *
 * 401 tenta renovar o access uma vez e repete; se ainda falhar, o erro sobe.
 */
export async function apiFetch<T = unknown>(caminho: string, init?: RequestInit): Promise<T> {
  const chamar = (token?: string) =>
    fetch(`${BASE}${caminho}`, {
      ...init,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  let resposta = await chamar(token);

  if (resposta.status === 401) {
    const novo = await renovarAcesso();
    if (novo) resposta = await chamar(novo);
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ApiError(resposta.status, mensagemDeErro(corpo, 'Falha ao falar com a API.'));
  }

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
