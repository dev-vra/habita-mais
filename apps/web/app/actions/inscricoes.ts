'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api/server';

type Resultado<T = unknown> = { erro?: string; dados?: T };

/** Toda ação da inscrição volta com a razão do erro — a API já responde em linguagem de balcão. */
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

export async function inscreverFamilia(
  programaId: string,
  familiaId: string,
): Promise<Resultado<{ inscricaoId: string }>> {
  const resultado = await executar(
    () =>
      apiFetch<{ inscricaoId: string; protocolo: string; pontuacao: number }>(
        `/programas/${programaId}/inscricoes`,
        { method: 'POST', body: JSON.stringify({ familiaId }) },
      ),
    `/familias/${familiaId}`,
  );

  if (resultado.dados) redirect(`/inscricoes/${resultado.dados.inscricaoId}`);
  return resultado;
}

export async function abrirPendencia(
  inscricaoId: string,
  dados: { tipo: string; descricao: string; prazoAte: string },
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/inscricoes/${inscricaoId}/pendencias`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    `/inscricoes/${inscricaoId}`,
  );
}

export async function resolverPendencia(
  pendenciaId: string,
  inscricaoId: string,
  desfecho: 'RESOLVIDA' | 'DISPENSADA',
): Promise<Resultado> {
  const resultado = await executar(
    () =>
      apiFetch(`/pendencias/${pendenciaId}/resolver`, {
        method: 'POST',
        body: JSON.stringify({ desfecho }),
      }),
    `/inscricoes/${inscricaoId}`,
  );
  revalidatePath('/pendencias');
  return resultado;
}

export async function recalcularInscricao(
  programaId: string,
  inscricaoId: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/programas/${programaId}/inscricoes/${inscricaoId}/recalcular`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    `/inscricoes/${inscricaoId}`,
  );
}

export async function convocar(
  inscricaoId: string,
  dados: { prazoComparecimentoAte: string; foraDeOrdem: boolean; motivoExcecao?: string },
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/inscricoes/${inscricaoId}/convocacoes`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    `/inscricoes/${inscricaoId}`,
  );
}

export async function registrarDesfecho(
  convocacaoId: string,
  inscricaoId: string,
  dados: { desfecho: string; motivo?: string },
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/convocacoes/${convocacaoId}/desfecho`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    `/inscricoes/${inscricaoId}`,
  );
}
