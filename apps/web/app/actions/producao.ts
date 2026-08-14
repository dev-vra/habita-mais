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

export async function criarConvenio(dados: {
  numeroExterno?: string;
  objeto: string;
  origem: string;
  orgaoRepassador: string;
  valorRepasse: number;
  valorContrapartida?: number;
  vigenciaInicio: string;
  vigenciaFim: string;
}): Promise<Resultado<{ id: string; protocolo: string }>> {
  return executar(
    () =>
      apiFetch<{ id: string; protocolo: string }>('/producao/convenios', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    '/producao',
  );
}

export async function criarEmpreendimento(dados: {
  nome: string;
  convenioId?: string;
  programaId?: string;
  endereco: string;
  bairro: string;
  cep?: string;
  unidadesPrevistas: number;
  previsaoEntrega?: string;
}): Promise<Resultado<{ id: string; slug: string; protocolo: string }>> {
  return executar(
    () =>
      apiFetch<{ id: string; slug: string; protocolo: string }>('/producao/empreendimentos', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    '/producao',
  );
}

export async function criarObra(
  dados: {
    empreendimentoId: string;
    descricao: string;
    executoraNome: string;
    executoraCnpj: string;
    numeroContrato: string;
    artRrt?: string;
    valorContrato: number;
    inicioPrevisto: string;
    terminoPrevisto: string;
  },
  caminho: string,
): Promise<Resultado> {
  return executar(
    () => apiFetch('/producao/obras', { method: 'POST', body: JSON.stringify(dados) }),
    caminho,
  );
}

export async function definirEtapas(
  obraId: string,
  etapas: { codigo: string; nome: string; peso: number; previstaAte: string }[],
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/producao/obras/${obraId}/etapas`, {
        method: 'POST',
        body: JSON.stringify({ etapas }),
      }),
    caminho,
  );
}

export async function registrarExecucao(
  etapaId: string,
  executado: number,
  caminho: string,
): Promise<Resultado<{ percentualObra: number }>> {
  return executar(
    () =>
      apiFetch<{ percentualObra: number }>(`/producao/etapas/${etapaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ executado }),
      }),
    caminho,
  );
}

export async function definirSituacaoObra(
  obraId: string,
  situacao: string,
  motivo: string | undefined,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/producao/obras/${obraId}/situacao`, {
        method: 'POST',
        body: JSON.stringify({ situacao, motivo }),
      }),
    caminho,
  );
}

export async function criarMedicao(
  obraId: string,
  dados: {
    periodoInicio: string;
    periodoFim: string;
    percentualAcumulado: number;
    valor: number;
    fiscalNome: string;
  },
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/producao/obras/${obraId}/medicoes`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    caminho,
  );
}

export async function aprovarMedicao(medicaoId: string, caminho: string): Promise<Resultado> {
  return executar(
    () => apiFetch(`/producao/medicoes/${medicaoId}/aprovar`, { method: 'POST' }),
    caminho,
  );
}

export async function encerrarMedicao(
  medicaoId: string,
  situacao: 'REJEITADA' | 'CANCELADA',
  motivo: string,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/producao/medicoes/${medicaoId}/encerrar`, {
        method: 'POST',
        body: JSON.stringify({ situacao, motivo }),
      }),
    caminho,
  );
}

export async function gerarUnidades(
  empreendimentoId: string,
  dados: {
    quantidade: number;
    prefixo?: string;
    inicio?: number;
    quadra?: string;
    tipologia?: string;
    areaConstruida?: number;
    areaTerreno?: number;
    valorAvaliado?: number;
  },
  caminho: string,
): Promise<Resultado<{ criadas: number }>> {
  return executar(
    () =>
      apiFetch<{ criadas: number }>(
        `/producao/empreendimentos/${empreendimentoId}/unidades/lote`,
        { method: 'POST', body: JSON.stringify(dados) },
      ),
    caminho,
  );
}

export async function moverUnidade(
  unidadeId: string,
  situacao: string,
  motivo: string,
  familiaId: string | undefined,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/producao/unidades/${unidadeId}/situacao`, {
        method: 'POST',
        body: JSON.stringify({ situacao, motivo, familiaId }),
      }),
    caminho,
  );
}
