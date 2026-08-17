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

export async function criarContrato(dados: {
  unidadeId: string;
  familiaId: string;
  titularId: string;
  valorUnidade: number;
  valorSubsidio?: number;
  valorEntrada?: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  indiceReajuste: string;
  assinadoEm: string;
  primeiraCompetencia: string;
  tituloGarantiaKey?: string;
}): Promise<Resultado<{ id: string; protocolo: string; parcelas: number }>> {
  return executar(
    () =>
      apiFetch<{ id: string; protocolo: string; parcelas: number }>('/contratos', {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    '/contratos',
  );
}

export async function darBaixa(
  parcelaId: string,
  dados: { valor: number; pagoEm: string; forma: string; comprovanteKey?: string },
  caminho: string,
): Promise<Resultado<{ situacaoParcela: string; quitou: boolean }>> {
  return executar(
    () =>
      apiFetch<{ situacaoParcela: string; quitou: boolean }>(
        `/contratos/parcelas/${parcelaId}/baixa`,
        { method: 'POST', body: JSON.stringify(dados) },
      ),
    caminho,
  );
}

export async function estornarPagamento(
  pagamentoId: string,
  motivo: string,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/contratos/pagamentos/${pagamentoId}/estorno`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      }),
    caminho,
  );
}

export async function renegociarContrato(
  contratoId: string,
  dados: { motivo: string; novaQuantidade: number; primeiraCompetencia: string },
  caminho: string,
): Promise<Resultado<{ saldo: number; parcelas: number; valorParcela: number }>> {
  return executar(
    () =>
      apiFetch<{ saldo: number; parcelas: number; valorParcela: number }>(
        `/contratos/${contratoId}/renegociacao`,
        { method: 'POST', body: JSON.stringify(dados) },
      ),
    caminho,
  );
}

export async function transferirTitularidade(
  contratoId: string,
  dados: {
    motivo: string;
    paraTitularId: string;
    paraFamiliaId: string;
    fundamentacao: string;
  },
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/contratos/${contratoId}/transferencia`, {
        method: 'POST',
        body: JSON.stringify(dados),
      }),
    caminho,
  );
}

export async function definirSituacaoContrato(
  contratoId: string,
  situacao: string,
  motivo: string | undefined,
  caminho: string,
): Promise<Resultado> {
  return executar(
    () =>
      apiFetch(`/contratos/${contratoId}/situacao`, {
        method: 'POST',
        body: JSON.stringify({ situacao, motivo }),
      }),
    caminho,
  );
}
