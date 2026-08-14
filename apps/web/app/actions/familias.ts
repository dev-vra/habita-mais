'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api/server';
import type { EstadoFormulario } from './auth';

function texto(form: FormData, campo: string): string | undefined {
  const valor = String(form.get(campo) ?? '').trim();
  return valor === '' ? undefined : valor;
}

const numero = (form: FormData, campo: string): number => Number(form.get(campo) ?? 0);
const marcado = (form: FormData, campo: string): boolean => form.get(campo) === 'sim';

/** Monta o corpo da ficha a partir do formulário — mesma forma no cadastro e na reapuração. */
function fichaDoFormulario(form: FormData) {
  return {
    rendaFamiliar: numero(form, 'rendaFamiliar'),
    quantidadePessoas: numero(form, 'quantidadePessoas'),
    quantidadeMenores: numero(form, 'quantidadeMenores'),
    fonteRenda: texto(form, 'fonteRenda'),
    regimeRenda: texto(form, 'regimeRenda'),
    fonteRendaPrincipal: texto(form, 'fonteRendaPrincipal'),
    inscritoCadUnico: marcado(form, 'inscritoCadUnico'),
    beneficios: form.getAll('beneficios').map(String).filter(Boolean),
    vulnerabilidades: form.getAll('vulnerabilidades').map(String).filter(Boolean),
    nivelVulnerabilidade: texto(form, 'nivelVulnerabilidade'),
    situacaoHabitacional: texto(form, 'situacaoHabitacional'),
    abastecimentoAgua: texto(form, 'abastecimentoAgua'),
    energiaEletrica: texto(form, 'energiaEletrica'),
    coletaLixo: texto(form, 'coletaLixo'),
    pavimentacao: texto(form, 'pavimentacao'),
    comodos: form.get('comodos') ? numero(form, 'comodos') : undefined,
    banheiros: form.get('banheiros') ? numero(form, 'banheiros') : undefined,
    iluminacaoPublica: marcado(form, 'iluminacaoPublica'),
    drenagemPluvial: marcado(form, 'drenagemPluvial'),
    acessoEscolaProxima: marcado(form, 'acessoEscolaProxima'),
    acessoSaudeProxima: marcado(form, 'acessoSaudeProxima'),
    acessoTransportePublico: marcado(form, 'acessoTransportePublico'),
    parecerTecnico: texto(form, 'parecerTecnico'),
    nis: texto(form, 'nis'),
    beneficioAtivo: texto(form, 'beneficioAtivo'),
    mulherChefeFamilia: marcado(form, 'mulherChefeFamilia'),
    temPessoaComDeficiencia: marcado(form, 'temPessoaComDeficiencia'),
    temIdoso: marcado(form, 'temIdoso'),
    situacaoRisco: marcado(form, 'situacaoRisco'),
    laudoRiscoKey: texto(form, 'laudoRiscoKey'),
    moradiaInadequada: marcado(form, 'moradiaInadequada'),
    possuiOutroImovel: marcado(form, 'possuiOutroImovel'),
    tipoMoradia: texto(form, 'tipoMoradia'),
    tipoConstrucao: texto(form, 'tipoConstrucao'),
    saneamento: texto(form, 'saneamento'),
    mesesResidenciaMunicipio: numero(form, 'mesesResidenciaMunicipio'),
    apuradaEm: texto(form, 'apuradaEm'),
    validaAte: texto(form, 'validaAte'),
  };
}

export async function cadastrarFamilia(
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  let destino: string;

  try {
    const criada = await apiFetch<{ familiaId: string; codigo: string }>('/familias', {
      method: 'POST',
      body: JSON.stringify({
        responsavel: {
          cpf: texto(form, 'cpf'),
          nome: texto(form, 'nome'),
          nascimento: texto(form, 'nascimento'),
          sexo: texto(form, 'sexo'),
          nis: texto(form, 'nisResponsavel'),
          telefone: texto(form, 'telefone'),
          estadoCivil: texto(form, 'estadoCivil'),
          nomeMae: texto(form, 'nomeMae'),
          nomePai: texto(form, 'nomePai'),
          rg: texto(form, 'rg'),
          orgaoExpedidor: texto(form, 'orgaoExpedidor'),
          profissao: texto(form, 'profissao'),
          escolaridade: texto(form, 'escolaridade'),
          situacaoTrabalho: texto(form, 'situacaoTrabalho'),
          cep: texto(form, 'cep'),
          logradouro: texto(form, 'logradouro'),
          numero: texto(form, 'numero'),
          complemento: texto(form, 'complemento'),
          bairro: texto(form, 'bairro'),
          municipio: texto(form, 'municipio'),
          referencia: texto(form, 'referencia'),
        },
        ficha: fichaDoFormulario(form),
      }),
    });
    destino = `/familias/${criada.familiaId}`;
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }

  revalidatePath('/familias');
  redirect(destino);
}

export async function novaFicha(
  familiaId: string,
  _estado: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  try {
    await apiFetch(`/familias/${familiaId}/fichas`, {
      method: 'POST',
      body: JSON.stringify(fichaDoFormulario(form)),
    });
  } catch (erro) {
    if (erro instanceof ApiError) return { erro: erro.message };
    throw erro;
  }

  revalidatePath(`/familias/${familiaId}`);
  redirect(`/familias/${familiaId}`);
}
