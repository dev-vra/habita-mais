'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api/server';
import type { EstadoFormulario } from './auth';

export interface Criterio {
  codigo: string;
  rotulo: string;
  tipo: 'FAIXA' | 'FLAG' | 'PROGRESSIVO';
  peso: number;
  fonte: string;
  evidencia?: string;
  faixas?: { ate: number | null; pontos: number }[];
  pontosPorUnidade?: number;
  unidadeMaxima?: number;
}

export async function criarPrograma(
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  let slug: string;

  try {
    const criado = await apiFetch<{ id: string; slug: string }>('/programas', {
      method: 'POST',
      body: JSON.stringify({
        nome: String(form.get('nome') ?? ''),
        fonteRecurso: String(form.get('fonteRecurso') ?? ''),
        vagas: Number(form.get('vagas') ?? 0),
        inscricaoInicio: String(form.get('inscricaoInicio') ?? ''),
        inscricaoFim: String(form.get('inscricaoFim') ?? ''),
      }),
    });
    slug = criado.slug;
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }

  revalidatePath('/programas');
  redirect(`/programas/${slug}`);
}

export async function definirSituacao(
  programaId: string,
  slug: string,
  situacao: string,
): Promise<{ erro?: string }> {
  try {
    await apiFetch(`/programas/${programaId}/situacao`, {
      method: 'POST',
      body: JSON.stringify({ situacao }),
    });
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }

  revalidatePath(`/programas/${slug}`);
  return {};
}

/** Novo rascunho: copia a versão indicada ou parte do modelo sobre o salário mínimo do município. */
export async function criarRascunho(
  programaId: string,
  slug: string,
  origem: { copiarDaVersaoId?: string; salarioMinimo?: number },
): Promise<{ erro?: string; versaoId?: string }> {
  try {
    const criada = await apiFetch<{ versaoId: string }>(`/programas/${programaId}/criterios`, {
      method: 'POST',
      body: JSON.stringify(origem),
    });
    revalidatePath(`/programas/${slug}`);
    return { versaoId: criada.versaoId };
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}

export async function salvarCriterios(
  versaoId: string,
  criterios: Criterio[],
): Promise<{ erro?: string; avisos?: string[] }> {
  try {
    const { avisos } = await apiFetch<{ avisos: string[] }>(`/criterios/${versaoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ criterios }),
    });
    return { avisos };
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}

export async function publicarCriterios(
  versaoId: string,
  slug: string,
): Promise<{ erro?: string; versao?: number }> {
  try {
    const publicada = await apiFetch<{ versao: number }>(`/criterios/${versaoId}/publicar`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    revalidatePath(`/programas/${slug}`);
    return { versao: publicada.versao };
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }
}
