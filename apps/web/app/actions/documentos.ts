'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api/server';

type Resultado<T = unknown> = { erro?: string; dados?: T };

async function executar<T>(chamada: () => Promise<T>, caminho?: string): Promise<Resultado<T>> {
  try {
    const dados = await chamada();
    if (caminho) revalidatePath(caminho);
    return { dados };
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}

export async function juntarDocumento(
  dados: {
    tipoDocumentoId: string;
    escopo: string;
    referenciaId: string;
    arquivoKey: string;
    nomeArquivo: string;
    mimeType: string;
    tamanho: number;
    emitidoEm?: string;
  },
  caminho: string,
): Promise<Resultado> {
  return executar(
    () => apiFetch('/documentos', { method: 'POST', body: JSON.stringify(dados) }),
    caminho,
  );
}

export async function conferirDocumento(
  documentoId: string,
  decisao: 'CONFERIDO' | 'RECUSADO',
  motivoRecusa: string | undefined,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/documentos/${documentoId}/conferencia`, {
        method: 'POST',
        body: JSON.stringify({ decisao, motivoRecusa }),
      }),
    caminho,
  );
}

export async function definirExigencias(
  programaId: string,
  tiposDocumento: string[],
  slug: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/programas/${programaId}/exigencias`, {
        method: 'POST',
        body: JSON.stringify({ tiposDocumento }),
      }),
    `/programas/${slug}`,
  );
}

export async function montarPilha(
  dados: {
    finalidade: string;
    escopo: string;
    referenciaId: string;
    nome: string;
    tiposDocumento: string[];
  },
  caminho: string,
): Promise<Resultado<{ id: string; protocolo: string; vinculados: number }>> {
  return executar(
    () =>
      apiFetch<{ id: string; protocolo: string; vinculados: number }>('/pilhas', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    caminho,
  );
}

export async function fecharPilha(
  pilhaId: string,
  entreguePara: string,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/pilhas/${pilhaId}/entrega`, {
        method: 'POST',
        body: JSON.stringify({ entreguePara }),
      }),
    caminho,
  );
}
