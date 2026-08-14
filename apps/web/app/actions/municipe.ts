'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/server';
import { gravarSessaoMunicipe, limparSessaoMunicipe, tokenMunicipe } from '@/lib/auth/municipe';
import type { EstadoFormulario } from './auth';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/** Acesso da família: protocolo + CPF do responsável, como na tela de referência. */
export async function entrarMunicipe(
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const resposta = await fetch(`${BASE}/auth/municipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: String(form.get('tenantId') ?? ''),
      protocolo: String(form.get('protocolo') ?? ''),
      cpf: String(form.get('cpf') ?? ''),
    }),
    cache: 'no-store',
  });

  if (!resposta.ok) {
    return { erro: 'Protocolo ou CPF não confere. Confira o número do seu comprovante.' };
  }

  const { accessToken } = (await resposta.json()) as { accessToken: string };
  await gravarSessaoMunicipe(accessToken);
  redirect('/minha-inscricao');
}

export async function sairMunicipe(): Promise<void> {
  await limparSessaoMunicipe();
  redirect('/minha-inscricao');
}

/** Chamada autenticada da central. Sem refresh: a família reentra com protocolo e CPF. */
export async function buscarNaCentral<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = await tokenMunicipe();
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(resposta.status, corpo?.message ?? 'Não foi possível consultar agora.');
  }
  return (await resposta.json()) as T;
}

export async function interporRecursoMunicipe(
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  try {
    await buscarNaCentral('/minha-inscricao/recursos', {
      method: 'POST',
      body: JSON.stringify({ motivo: String(form.get('motivo') ?? '') }),
    });
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }

  revalidatePath('/minha-inscricao');
  return {};
}
