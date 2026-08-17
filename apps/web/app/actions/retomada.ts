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

export async function abrirCaso(dados: {
  unidadeId: string;
  ocorrenciaId?: string;
  fundamentacaoLegal: string;
  descricao: string;
}): Promise<Resultado<{ id: string; protocolo: string }>> {
  return executar(
    () =>
      apiFetch<{ id: string; protocolo: string }>('/retomada/casos', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    '/retomada',
  );
}

export async function registrarTentativa(
  casoId: string,
  detalhe: string,
  caminho: string,
): Promise<Resultado<{ tentativas: number; editalAdmissivel: boolean }>> {
  return executar(
    () =>
      apiFetch<{ tentativas: number; editalAdmissivel: boolean }>(
        `/retomada/casos/${casoId}/tentativas`,
        { method: 'POST', body: JSON.stringify({ detalhe }) },
      ),
    caminho,
  );
}

export async function notificarCaso(
  casoId: string,
  dados: { forma: string; notificadoEm: string; comprovanteKey?: string; prazoDefesaDias?: number },
  caminho: string,
): Promise<Resultado<{ prazoDefesaAte: string }>> {
  return executar(
    () =>
      apiFetch<{ prazoDefesaAte: string }>(`/retomada/casos/${casoId}/notificar`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    caminho,
  );
}

export async function registrarDefesa(
  casoId: string,
  dados: { apresentadaEm: string; teor: string; apresentadaPor: string; arquivoKey?: string },
  caminho: string,
): Promise<Resultado<{ intempestiva: boolean }>> {
  return executar(
    () =>
      apiFetch<{ intempestiva: boolean }>(`/retomada/casos/${casoId}/defesa`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    caminho,
  );
}

export async function enviarParaAnalise(
  casoId: string,
  caminho: string,
): Promise<Resultado<{ revelia: boolean }>> {
  return executar(
    () =>
      apiFetch<{ revelia: boolean }>(`/retomada/casos/${casoId}/analise`, { method: 'POST' }),
    caminho,
  );
}

export async function decidirCaso(
  casoId: string,
  dados: { decisao: string; fundamentacao: string },
  caminho: string,
): Promise<Resultado<{ retiraUnidade: boolean }>> {
  return executar(
    () =>
      apiFetch<{ retiraUnidade: boolean }>(`/retomada/casos/${casoId}/decisao`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    caminho,
  );
}

export async function encerrarCaso(
  casoId: string,
  motivo: string,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/retomada/casos/${casoId}/encerrar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    caminho,
  );
}
