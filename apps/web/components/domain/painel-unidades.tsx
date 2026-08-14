'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import { gerarUnidades, moverUnidade } from '@/app/actions/producao';
import { Aviso } from '@/components/ui/formulario';
import { data, moeda } from '@/lib/formato';
import type { CandidataEntrega, UnidadeDetalhe } from '@/app/(painel)/producao/[slug]/page';

const TOM_UNIDADE: Record<habitacao.SituacaoUnidade, string> = {
  PLANEJADA: 'bg-background text-texto-suave',
  EM_OBRA: 'bg-institucional/10 text-institucional',
  PRONTA: 'bg-warning/15 text-warning-text',
  ENTREGUE: 'bg-success/10 text-success',
  DESOCUPADA: 'bg-warning/15 text-warning-text',
  EM_LITIGIO: 'bg-danger/10 text-danger',
  RETOMADA: 'bg-danger/10 text-danger',
  CANCELADA: 'bg-background text-texto-suave',
};

/**
 * As casas do conjunto.
 *
 * A situação carrega motivo obrigatório porque depois da entrega cada mudança afeta a moradia de
 * alguém — e "por quê" é o que a auditoria vai perguntar dois anos depois. A transição oferecida é
 * só a que a máquina de estados permite: oferecer o impossível ensina o servidor a tentar e errar.
 */
export function PainelUnidades({
  empreendimentoId,
  unidades,
  candidatas,
  caminho,
  podeGerir,
  podeEntregar,
}: {
  empreendimentoId: string;
  unidades: UnidadeDetalhe[];
  candidatas: CandidataEntrega[];
  caminho: string;
  podeGerir: boolean;
  podeEntregar: boolean;
}) {
  const [erro, setErro] = useState<string>();
  const [gerando, setGerando] = useState(false);
  const [movendo, setMovendo] = useState<{ id: string; para: habitacao.SituacaoUnidade }>();
  const [filtro, setFiltro] = useState<'TODAS' | habitacao.SituacaoUnidade>('TODAS');
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>, aoConcluir?: () => void) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) {
        aoConcluir?.();
        router.refresh();
      }
    });

  const visiveis = useMemo(
    () => (filtro === 'TODAS' ? unidades : unidades.filter((u) => u.situacao === filtro)),
    [unidades, filtro],
  );

  const situacoesPresentes = useMemo(
    () => habitacao.SITUACOES_UNIDADE.filter((s) => unidades.some((u) => u.situacao === s)),
    [unidades],
  );

  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <BotaoFiltro ativo={filtro === 'TODAS'} onClick={() => setFiltro('TODAS')}>
            Todas ({unidades.length})
          </BotaoFiltro>
          {situacoesPresentes.map((situacao) => (
            <BotaoFiltro
              key={situacao}
              ativo={filtro === situacao}
              onClick={() => setFiltro(situacao)}
            >
              {habitacao.rotuloSituacaoUnidade(situacao)} (
              {unidades.filter((u) => u.situacao === situacao).length})
            </BotaoFiltro>
          ))}
        </div>

        {podeGerir && (
          <button
            type="button"
            onClick={() => setGerando((aberto) => !aberto)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-surface"
          >
            {gerando ? 'Cancelar' : 'Gerar unidades'}
          </button>
        )}
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}

      {gerando && (
        <form
          className="mt-4 grid gap-3 rounded-md border border-borda bg-background p-3 md:grid-cols-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            const formulario = new FormData(evento.currentTarget);
            const opcional = (campo: string) => {
              const valor = formulario.get(campo);
              return valor ? Number(valor) : undefined;
            };

            rodar(
              () =>
                gerarUnidades(
                  empreendimentoId,
                  {
                    quantidade: Number(formulario.get('quantidade')),
                    prefixo: String(formulario.get('prefixo') ?? '') || undefined,
                    inicio: opcional('inicio'),
                    quadra: String(formulario.get('quadra') ?? '') || undefined,
                    tipologia: String(formulario.get('tipologia') ?? '') || undefined,
                    areaConstruida: opcional('areaConstruida'),
                    areaTerreno: opcional('areaTerreno'),
                    valorAvaliado: opcional('valorAvaliado'),
                  },
                  caminho,
                ),
              () => setGerando(false),
            );
          }}
        >
          <Campo nome="quantidade" rotulo="Quantidade" tipo="number" obrigatorio min={1} />
          <Campo nome="prefixo" rotulo="Prefixo" placeholder="Casa" />
          <Campo nome="inicio" rotulo="Começa em" tipo="number" min={1} valorInicial="1" />
          <Campo nome="quadra" rotulo="Quadra" placeholder="A" />
          <Campo nome="tipologia" rotulo="Tipologia" placeholder="Casa térrea 2 quartos" />
          <Campo nome="areaConstruida" rotulo="Área construída (m²)" tipo="number" passo="0.01" />
          <Campo nome="areaTerreno" rotulo="Área do terreno (m²)" tipo="number" passo="0.01" />
          <Campo nome="valorAvaliado" rotulo="Valor avaliado (R$)" tipo="number" passo="0.01" />

          <div className="md:col-span-4">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
            >
              Gerar
            </button>
            <p className="mt-1.5 text-xs text-texto-suave">
              O endereço vem do empreendimento e a numeração é sequencial. Depois é só corrigir o
              que for diferente — repetir a geração não duplica unidade.
            </p>
          </div>
        </form>
      )}

      {visiveis.length === 0 ? (
        <p className="mt-4 text-sm text-texto-suave">Nenhuma unidade nesta situação.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-3 py-2 font-semibold">Unidade</th>
                <th className="px-3 py-2 font-semibold">Titular</th>
                <th className="px-3 py-2 font-semibold">Matrícula</th>
                <th className="px-3 py-2 text-right font-semibold">Avaliação</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                {(podeEntregar || podeGerir) && <th className="px-3 py-2 font-semibold">Mover</th>}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((unidade) => (
                <tr key={unidade.id} className="border-b border-borda align-top last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-texto">{unidade.identificacao}</p>
                    <p className="tabular text-xs text-texto-suave">
                      {unidade.protocolo}
                      {unidade.quadra && ` · quadra ${unidade.quadra}`}
                      {unidade.lote && ` · lote ${unidade.lote}`}
                    </p>
                    {unidade.tipologia && (
                      <p className="text-xs text-texto-suave">{unidade.tipologia}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {unidade.familia ? (
                      <>
                        <Link
                          href={`/familias/${unidade.familia.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {unidade.familia.responsavel}
                        </Link>
                        <p className="tabular text-xs text-texto-suave">
                          {unidade.familia.codigo}
                          {unidade.entregueEm && ` · entregue em ${data(unidade.entregueEm)}`}
                        </p>
                      </>
                    ) : (
                      <span className="text-texto-suave">—</span>
                    )}
                  </td>
                  <td className="tabular px-3 py-2 text-xs">
                    {unidade.matricula ?? <span className="text-texto-suave">—</span>}
                  </td>
                  <td className="tabular px-3 py-2 text-right">
                    {unidade.valorAvaliado ? moeda(unidade.valorAvaliado) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TOM_UNIDADE[unidade.situacao]}`}
                    >
                      {habitacao.rotuloSituacaoUnidade(unidade.situacao)}
                    </span>
                    {unidade.motivoSituacao && (
                      <p className="mt-1 max-w-56 text-xs text-texto-suave">
                        {unidade.motivoSituacao}
                      </p>
                    )}
                    {unidade.exigeAcompanhamento && (
                      <p className="mt-1 text-xs font-semibold text-institucional">
                        Exige acompanhamento
                      </p>
                    )}
                  </td>

                  {(podeEntregar || podeGerir) && (
                    <td className="px-3 py-2">
                      {unidade.transicoes.length === 0 ? (
                        <span className="text-xs text-texto-suave">—</span>
                      ) : movendo?.id === unidade.id ? (
                        <FormularioMover
                          para={movendo.para}
                          candidatas={candidatas}
                          pendente={pendente}
                          aoCancelar={() => setMovendo(undefined)}
                          aoConfirmar={(motivo, familiaId) =>
                            rodar(
                              () =>
                                moverUnidade(
                                  unidade.id,
                                  movendo.para,
                                  motivo,
                                  familiaId,
                                  caminho,
                                ),
                              () => setMovendo(undefined),
                            )
                          }
                        />
                      ) : (
                        <select
                          aria-label={`Mover unidade ${unidade.identificacao}`}
                          value=""
                          onChange={(evento) => {
                            const para = evento.target.value as habitacao.SituacaoUnidade;
                            if (para) setMovendo({ id: unidade.id, para });
                          }}
                          className="rounded-md border border-borda bg-surface px-2 py-1 text-xs font-semibold text-texto-suave"
                        >
                          <option value="">Mover para…</option>
                          {unidade.transicoes.map((situacao) => (
                            <option key={situacao} value={situacao}>
                              {habitacao.rotuloSituacaoUnidade(situacao)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FormularioMover({
  para,
  candidatas,
  pendente,
  aoConfirmar,
  aoCancelar,
}: {
  para: habitacao.SituacaoUnidade;
  candidatas: CandidataEntrega[];
  pendente: boolean;
  aoConfirmar: (motivo: string, familiaId?: string) => void;
  aoCancelar: () => void;
}) {
  return (
    <form
      className="flex w-64 flex-col gap-1.5"
      action={(formulario) =>
        aoConfirmar(
          String(formulario.get('motivo') ?? ''),
          String(formulario.get('familiaId') ?? '') || undefined,
        )
      }
    >
      <p className="text-xs font-semibold text-texto">
        → {habitacao.rotuloSituacaoUnidade(para)}
      </p>

      {para === 'ENTREGUE' &&
        (candidatas.length === 0 ? (
          <p className="rounded bg-warning/15 px-2 py-1 text-xs text-warning-text">
            Nenhuma família contemplada disponível. Convoque pela fila antes de entregar.
          </p>
        ) : (
          <select
            name="familiaId"
            required
            defaultValue=""
            className="rounded border border-borda bg-surface px-2 py-1 text-xs"
          >
            <option value="" disabled>
              Quem recebe a chave…
            </option>
            {candidatas.map((candidata) => (
              <option key={candidata.familiaId} value={candidata.familiaId}>
                {candidata.responsavel} · {candidata.codigo} ({candidata.protocolo})
              </option>
            ))}
          </select>
        ))}

      <input
        name="motivo"
        required
        placeholder="Motivo — fica no histórico da unidade"
        className="rounded border border-borda px-2 py-1 text-xs"
      />

      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-surface disabled:opacity-60"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-md border border-borda px-2.5 py-1 text-xs font-semibold text-texto-suave"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function BotaoFiltro({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        ativo
          ? 'bg-institucional text-surface'
          : 'bg-background text-texto-suave hover:bg-borda/60'
      }`}
    >
      {children}
    </button>
  );
}

function Campo({
  nome,
  rotulo,
  tipo = 'text',
  placeholder,
  obrigatorio,
  min,
  passo,
  valorInicial,
}: {
  nome: string;
  rotulo: string;
  tipo?: 'text' | 'number';
  placeholder?: string;
  obrigatorio?: boolean;
  min?: number;
  passo?: string;
  valorInicial?: string;
}) {
  return (
    <label className="text-xs font-semibold text-texto-suave">
      {rotulo}
      <input
        name={nome}
        type={tipo}
        min={min}
        step={passo}
        required={obrigatorio}
        placeholder={placeholder}
        defaultValue={valorInicial}
        className="mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
      />
    </label>
  );
}
