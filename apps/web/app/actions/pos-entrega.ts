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

export interface EixoAvaliado {
  eixo: string;
  situacao: string;
  observacao?: string;
}

export async function registrarAcompanhamento(
  dados: {
    unidadeId: string;
    visitadaEm: string;
    tipo: string;
    tecnicoNome: string;
    residenciaConfirmada: boolean;
    quemReside?: string;
    moradoresEncontrados?: number;
    parecer: string;
    eixos: EixoAvaliado[];
  },
  caminho: string,
): Promise<Resultado<{ protocolo: string; proximaVisitaEm: string | null }>> {
  return executar(
    () =>
      apiFetch<{ protocolo: string; proximaVisitaEm: string | null }>(
        '/pos-entrega/acompanhamentos',
        { method: 'POST', body: JSON.stringify(dados) },
      ),
    caminho,
  );
}

export async function abrirOcorrencia(
  dados: {
    unidadeId: string;
    tipo: string;
    origem: string;
    descricao: string;
    constatadaEm: string;
    acompanhamentoId?: string;
  },
  caminho: string,
): Promise<Resultado<{ protocolo: string; gravidade: string; encaminhamento: string }>> {
  return executar(
    () =>
      apiFetch<{ protocolo: string; gravidade: string; encaminhamento: string }>(
        '/pos-entrega/ocorrencias',
        { method: 'POST', body: JSON.stringify(dados) },
      ),
    caminho,
  );
}

export async function moverOcorrencia(
  ocorrenciaId: string,
  situacao: string,
  motivo: string | undefined,
  caminho: string,
): Promise<Resultado<{ prazoRegularizacaoAte: string | null }>> {
  return executar(
    () =>
      apiFetch<{ prazoRegularizacaoAte: string | null }>(
        `/pos-entrega/ocorrencias/${ocorrenciaId}/situacao`,
        { method: 'POST', body: JSON.stringify({ situacao, motivo }) },
      ),
    caminho,
  );
}
