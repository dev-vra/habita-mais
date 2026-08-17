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

export async function rascunharParecerVisita(dados: {
  acompanhamentoId: string;
  unidade: string;
  familia: string;
  residenciaConfirmada: boolean;
  quemReside?: string;
  moradoresEncontrados?: number;
  eixos: EixoAvaliado[];
  anotacoes?: string;
}): Promise<Resultado<{ sugestaoId: string; texto: string; modelo: string }>> {
  return executar(() =>
    apiFetch<{ sugestaoId: string; texto: string; modelo: string }>(
      '/assistente/parecer-visita',
      { method: 'POST', body: JSON.stringify(dados) },
    ),
  );
}

/**
 * Fecha o ciclo do rascunho: o que a pessoa fez com o texto proposto.
 *
 * Sem esta metade, o registro de que a máquina escreveu algo não serve nem para auditoria nem para
 * saber se o assistente ajuda de fato.
 */
export async function registrarDesfechoSugestao(
  sugestaoId: string,
  desfecho: 'ACEITA' | 'EDITADA' | 'REJEITADA',
  textoFinal?: string,
): Promise<Resultado> {
  return executar(() =>
    apiFetch(`/assistente/sugestoes/${sugestaoId}/desfecho`, {
      method: 'POST',
      body: JSON.stringify({ desfecho, textoFinal }),
    }),
  );
}
