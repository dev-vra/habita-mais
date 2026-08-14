'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api/server';

type Resultado = { erro?: string; dados?: unknown };

async function executar(chamada: () => Promise<unknown>): Promise<Resultado> {
  try {
    const dados = await chamada();
    revalidatePath('/encaminhamentos');
    return { dados };
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}

export async function abrirEncaminhamento(dados: {
  setorDestinoId: string;
  tipoSolicitacao: string;
  entidade: string;
  entidadeId: string;
  referenciaResumo: string;
  assunto: string;
  descricao: string;
  prazoAte: string;
}): Promise<Resultado> {
  return executar(() =>
    apiFetch('/encaminhamentos', { method: 'POST', body: JSON.stringify(dados) }),
  );
}

export async function responderEncaminhamento(
  encaminhamentoId: string,
  dados: { resposta: string; anexoKey?: string },
): Promise<Resultado> {
  return executar(() =>
    apiFetch(`/encaminhamentos/${encaminhamentoId}/resposta`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }),
  );
}

export async function devolverEncaminhamento(
  encaminhamentoId: string,
  motivo: string,
): Promise<Resultado> {
  return executar(() =>
    apiFetch(`/encaminhamentos/${encaminhamentoId}/devolucao`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),
  );
}
