'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api/server';

type Resultado<T = unknown> = { erro?: string; dados?: T };

async function executar<T>(chamada: () => Promise<T>, caminho: string): Promise<Resultado<T>> {
  try {
    const dados = await chamada();
    revalidatePath(caminho);
    return { dados };
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  perfil: string;
}): Promise<Resultado<{ id: string; senhaTemporaria: string }>> {
  return executar(
    () =>
      apiFetch<{ id: string; senhaTemporaria: string }>('/administracao/usuarios', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    '/administracao/usuarios',
  );
}

export async function definirStatusUsuario(
  usuarioId: string,
  status: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/administracao/usuarios/${usuarioId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    '/administracao/usuarios',
  );
}

export async function redefinirSenha(
  usuarioId: string,
): Promise<Resultado<{ senhaTemporaria: string }>> {
  return executar(
    () =>
      apiFetch<{ senhaTemporaria: string }>(`/administracao/usuarios/${usuarioId}/senha`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    '/administracao/usuarios',
  );
}

export async function definirCapacidade(
  usuarioId: string,
  dados: { capacidade: string; concedida: boolean; motivo: string },
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/administracao/usuarios/${usuarioId}/capacidades`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    '/administracao/usuarios',
  );
}

export async function limparCapacidade(usuarioId: string, capacidade: string): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/administracao/usuarios/${usuarioId}/capacidades/${capacidade}`, {
        method: 'DELETE',
      }),
    '/administracao/usuarios',
  );
}

export async function definirSalarioMinimo(valor: number): Promise<Resultado> {
  return executar(
    () =>
      apiFetch('/administracao/parametros/salario-minimo', {
        method: 'POST',
        body: JSON.stringify({ salarioMinimo: valor }),
      }),
    '/administracao/parametros',
  );
}

export async function criarSignatario(dados: {
  nome: string;
  papel: string;
  cargo: string;
}): Promise<Resultado> {
  return executar(
    () =>
      apiFetch('/administracao/signatarios', { method: 'POST', body: JSON.stringify(dados) }),
    '/administracao/parametros',
  );
}

export async function desativarSignatario(signatarioId: string): Promise<Resultado> {
  return executar(
    () => apiFetch(`/administracao/signatarios/${signatarioId}`, { method: 'DELETE' }),
    '/administracao/parametros',
  );
}
