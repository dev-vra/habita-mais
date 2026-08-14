'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { br } from '@habita/shared';
import { criarObra, definirEtapas } from '@/app/actions/producao';
import { Aviso } from '@/components/ui/formulario';

/** Cronograma padrão de casa térrea. Proposta para editar, não regra — cada obra é uma obra. */
const ETAPAS_SUGERIDAS = [
  { codigo: 'FUND', nome: 'Fundação e infraestrutura', peso: 20 },
  { codigo: 'ALV', nome: 'Alvenaria e estrutura', peso: 35 },
  { codigo: 'COB', nome: 'Cobertura', peso: 15 },
  { codigo: 'ACAB', nome: 'Acabamento e instalações', peso: 25 },
  { codigo: 'URB', nome: 'Urbanização e entrega', peso: 5 },
];

/**
 * Contrato de execução.
 *
 * Ao cadastrar, o cronograma padrão já vai junto com os prazos distribuídos entre início e término
 * — o fiscal ajusta o que for diferente. Obra sem cronograma não pode ser medida, e deixar isso
 * como "próximo passo" é o que faz a primeira medição chegar sem base.
 */
export function NovaObra({
  empreendimentoId,
  caminho,
}: {
  empreendimentoId: string;
  caminho: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-borda bg-surface px-3 py-1.5 text-sm font-semibold text-institucional"
      >
        Cadastrar obra
      </button>
    );
  }

  return (
    <form
      className="mt-3 grid gap-3 rounded-lg border border-borda bg-surface p-5 md:grid-cols-2"
      action={(formulario) =>
        iniciar(async () => {
          const inicio = String(formulario.get('inicioPrevisto'));
          const termino = String(formulario.get('terminoPrevisto'));

          const resultado = await criarObra(
            {
              empreendimentoId,
              descricao: String(formulario.get('descricao')),
              executoraNome: String(formulario.get('executoraNome')),
              executoraCnpj: br.onlyDigits(String(formulario.get('executoraCnpj'))),
              numeroContrato: String(formulario.get('numeroContrato')),
              artRrt: String(formulario.get('artRrt') ?? '').trim() || undefined,
              valorContrato: Number(formulario.get('valorContrato')),
              inicioPrevisto: inicio,
              terminoPrevisto: termino,
            },
            caminho,
          );

          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }

          const obraId = (resultado.dados as { id: string } | undefined)?.id;
          if (obraId && formulario.get('cronogramaPadrao')) {
            const etapas = distribuirPrazos(inicio, termino);
            const comCronograma = await definirEtapas(obraId, etapas, caminho);
            if (comCronograma.erro) {
              setErro(`Obra criada, mas o cronograma falhou: ${comCronograma.erro}`);
              return;
            }
          }

          setAberto(false);
          router.refresh();
        })
      }
    >
      {erro && (
        <div className="md:col-span-2">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}

      <Campo nome="descricao" rotulo="Descrição" obrigatorio placeholder="Execução de 40 unidades" />
      <Campo nome="numeroContrato" rotulo="Nº do contrato" obrigatorio placeholder="CT-018/2026" />
      <Campo nome="executoraNome" rotulo="Executora" obrigatorio placeholder="Construtora Ltda" />
      <Campo nome="executoraCnpj" rotulo="CNPJ da executora" obrigatorio placeholder="00000000000000" />
      <Campo nome="artRrt" rotulo="ART/RRT" placeholder="MT20260012345" />
      <Campo nome="valorContrato" rotulo="Valor do contrato (R$)" tipo="number" passo="0.01" obrigatorio />
      <Campo nome="inicioPrevisto" rotulo="Início previsto" tipo="date" obrigatorio />
      <Campo nome="terminoPrevisto" rotulo="Término previsto" tipo="date" obrigatorio />

      <label className="flex items-start gap-2 text-sm text-texto md:col-span-2">
        <input type="checkbox" name="cronogramaPadrao" defaultChecked className="mt-1" />
        <span>
          Criar cronograma padrão de 5 etapas
          <span className="block text-xs text-texto-suave">
            {ETAPAS_SUGERIDAS.map((etapa) => `${etapa.nome} (${etapa.peso}%)`).join(' · ')}
          </span>
        </span>
      </label>

      <div className="flex gap-2 md:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
        >
          Cadastrar obra
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-texto-suave"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Distribui os prazos das etapas entre início e término, proporcionalmente ao peso.
 * É palpite honesto: o fiscal corrige data por data, mas ninguém começa de uma tela em branco.
 */
function distribuirPrazos(inicio: string, termino: string) {
  const dataInicio = new Date(inicio).getTime();
  const dataTermino = new Date(termino).getTime();
  const duracao = Math.max(dataTermino - dataInicio, 0);

  let acumulado = 0;

  return ETAPAS_SUGERIDAS.map((etapa) => {
    acumulado += etapa.peso;
    const prazo = new Date(dataInicio + duracao * (acumulado / 100));

    return { ...etapa, previstaAte: prazo.toISOString().slice(0, 10) };
  });
}

function Campo({
  nome,
  rotulo,
  tipo = 'text',
  placeholder,
  passo,
  obrigatorio,
}: {
  nome: string;
  rotulo: string;
  tipo?: 'text' | 'number' | 'date';
  placeholder?: string;
  passo?: string;
  obrigatorio?: boolean;
}) {
  return (
    <label className="text-sm font-semibold text-texto">
      {rotulo}
      <input
        name={nome}
        type={tipo}
        step={passo}
        required={obrigatorio}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
      />
    </label>
  );
}
