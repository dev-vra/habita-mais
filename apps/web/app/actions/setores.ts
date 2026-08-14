'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api/server';

type Resultado = { erro?: string };

async function executar(chamada: () => Promise<unknown>): Promise<Resultado> {
  try {
    await chamada();
    revalidatePath('/administracao/setores');
    return {};
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}

export async function criarSetor(dados: {
  nome: string;
  sigla: string;
  tipo: string;
  secretaria?: string;
}): Promise<Resultado> {
  return executar(() => apiFetch('/setores', { method: 'POST', body: JSON.stringify(dados) }));
}

export async function desativarSetor(setorId: string): Promise<Resultado> {
  return executar(() => apiFetch(`/setores/${setorId}`, { method: 'DELETE' }));
}
