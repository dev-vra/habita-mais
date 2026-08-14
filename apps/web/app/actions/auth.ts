'use server';

import { redirect } from 'next/navigation';
import { gravarSessao, limparSessao } from '@/lib/auth/session';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

export interface EstadoFormulario {
  erro?: string;
}

interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Entrada do servidor municipal. A resposta da API nunca chega ao browser: os tokens vão para
 * cookies httpOnly aqui no servidor, e o cliente só recebe o redirecionamento.
 */
export async function entrar(
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');

  const resposta = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
    cache: 'no-store',
  });

  if (!resposta.ok) {
    // Mensagem única de propósito: dizer "usuário não existe" entregaria quem tem conta.
    return { erro: 'E-mail ou senha não confere.' };
  }

  await gravarSessao((await resposta.json()) as ParDeTokens);
  redirect('/painel');
}

export async function trocarSenha(
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const senhaAtual = String(form.get('senhaAtual') ?? '');
  const novaSenha = String(form.get('novaSenha') ?? '');
  const confirmacao = String(form.get('confirmacao') ?? '');

  if (novaSenha !== confirmacao) {
    return { erro: 'A confirmação não bate com a nova senha.' };
  }

  const { apiFetch, ApiError } = await import('@/lib/api/server');
  try {
    const par = await apiFetch<ParDeTokens>('/auth/trocar-senha', {
      method: 'POST',
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });
    await gravarSessao(par);
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }

  redirect('/painel');
}

export async function sair(): Promise<void> {
  await limparSessao();
  redirect('/entrar');
}
