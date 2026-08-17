'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import { abrirOcorrencia, moverOcorrencia } from '@/app/actions/pos-entrega';
import { Aviso } from '@/components/ui/formulario';
import { data } from '@/lib/formato';
import type { OcorrenciaRegistrada } from '@/app/(painel)/acompanhamento/[unidadeId]/page';

const TOM_GRAVIDADE: Record<string, string> = {
  ADMINISTRATIVA: 'bg-background text-texto-suave',
  LEVE: 'bg-warning/15 text-warning-text',
  GRAVE: 'bg-danger/10 text-danger',
  GRAVISSIMA: 'bg-danger text-surface',
};

/** Situações que encerram a ocorrência — todas exigem motivo escrito. */
const ENCERRAM = ['REGULARIZADA', 'IMPROCEDENTE', 'ENCAMINHADA_JURIDICO'];

/**
 * Ocorrências de uso da unidade.
 *
 * A gravidade não é escolhida por quem registra: sai do tipo do fato, pela mesma tabela que a API
 * usa. Deixar o campo aberto faria a mesma irregularidade valer coisas diferentes conforme quem
 * digitou — e é sobre esse número que a decisão de retomar uma casa se apoia.
 */
export function PainelOcorrencias({
  unidadeId,
  ocorrencias,
  caminho,
  podeRegistrar,
  podeDecidir,
}: {
  unidadeId: string;
  ocorrencias: OcorrenciaRegistrada[];
  caminho: string;
  podeRegistrar: boolean;
  podeDecidir: boolean;
}) {
  const [erro, setErro] = useState<string>();
  const [abrindo, setAbrindo] = useState(false);
  const [tipoEscolhido, setTipoEscolhido] = useState<habitacao.TipoOcorrencia>('CESSAO_TERCEIRO');
  const [movendo, setMovendo] = useState<{ id: string; para: habitacao.SituacaoOcorrencia }>();
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

  const regra = habitacao.regraDaOcorrencia(tipoEscolhido);

  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-texto-suave">
          {ocorrencias.length === 0
            ? 'Nenhuma ocorrência registrada nesta unidade.'
            : `${ocorrencias.length} ocorrência(s) no histórico.`}
        </p>
        {podeRegistrar && (
          <button
            type="button"
            onClick={() => setAbrindo((aberto) => !aberto)}
            className="rounded-md border border-borda px-3 py-1.5 text-xs font-semibold text-institucional"
          >
            {abrindo ? 'Cancelar' : 'Registrar ocorrência'}
          </button>
        )}
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}

      {abrindo && (
        <form
          className="mt-4 space-y-3 rounded-md border border-borda bg-background p-4"
          action={(formulario) =>
            rodar(
              () =>
                abrirOcorrencia(
                  {
                    unidadeId,
                    tipo: tipoEscolhido,
                    origem: String(formulario.get('origem')),
                    descricao: String(formulario.get('descricao')),
                    constatadaEm: String(formulario.get('constatadaEm')),
                  },
                  caminho,
                ),
              () => setAbrindo(false),
            )
          }
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-semibold text-texto">
              O que foi constatado
              <select
                value={tipoEscolhido}
                onChange={(evento) =>
                  setTipoEscolhido(evento.target.value as habitacao.TipoOcorrencia)
                }
                className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
              >
                {habitacao.opcoes(habitacao.TIPO_OCORRENCIA_USO).map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-texto">
              Como se soube
              <select
                name="origem"
                defaultValue="VISITA"
                className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
              >
                {habitacao.opcoes(habitacao.ORIGEM_OCORRENCIA).map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-texto">
              Constatada em
              <input
                type="date"
                name="constatadaEm"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
              />
            </label>
          </div>

          <div className="rounded-md border border-borda bg-surface p-3">
            <p className="text-xs font-semibold text-texto-suave">
              Classificação automática deste tipo
            </p>
            <p className="mt-1 text-sm">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TOM_GRAVIDADE[regra.gravidade]}`}
              >
                {habitacao.rotuloGravidade(regra.gravidade)}
              </span>
              <span className="ml-2 text-texto-suave">
                {regra.prazoRegularizacaoDias === null
                  ? 'Não admite regularização.'
                  : `Prazo de ${regra.prazoRegularizacaoDias} dias para regularizar, contados da notificação.`}
              </span>
            </p>
            <p className="mt-1 text-xs text-texto-suave">{regra.encaminhamento}</p>
          </div>

          <label className="block text-sm font-semibold text-texto">
            Descrição
            <textarea
              name="descricao"
              required
              rows={3}
              placeholder="O que foi visto, por quem, e o que já foi apurado."
              className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
            />
          </label>

          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
          >
            Registrar ocorrência
          </button>
        </form>
      )}

      {ocorrencias.length > 0 && (
        <ul className="mt-4 space-y-3">
          {ocorrencias.map((ocorrencia) => (
            <li key={ocorrencia.id} className="rounded-md border border-borda p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-texto">
                    {habitacao.rotuloTipoOcorrencia(ocorrencia.tipo)}
                  </p>
                  <p className="tabular text-xs text-texto-suave">
                    {ocorrencia.protocolo} ·{' '}
                    {habitacao.rotuloOrigemOcorrencia(ocorrencia.origem)} · constatada em{' '}
                    {data(ocorrencia.constatadaEm)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TOM_GRAVIDADE[ocorrencia.gravidade]}`}
                  >
                    {habitacao.rotuloGravidade(ocorrencia.gravidade)}
                  </span>
                  <span className="text-xs font-semibold text-texto-suave">
                    {habitacao.rotuloSituacaoOcorrencia(ocorrencia.situacao)}
                  </span>
                </div>
              </div>

              <p className="mt-2 whitespace-pre-line text-sm text-texto">{ocorrencia.descricao}</p>

              <dl className="tabular mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-texto-suave">
                {ocorrencia.notificadaEm && (
                  <div>
                    <dt className="inline font-semibold">Notificada: </dt>
                    <dd className="inline">{data(ocorrencia.notificadaEm)}</dd>
                  </div>
                )}
                {ocorrencia.prazoRegularizacaoAte && (
                  <div className={ocorrencia.prazoVencido ? 'text-danger' : undefined}>
                    <dt className="inline font-semibold">Prazo: </dt>
                    <dd className="inline">
                      {data(ocorrencia.prazoRegularizacaoAte)}
                      {ocorrencia.prazoVencido && ' — vencido'}
                    </dd>
                  </div>
                )}
                {ocorrencia.encerradaEm && (
                  <div>
                    <dt className="inline font-semibold">Encerrada: </dt>
                    <dd className="inline">{data(ocorrencia.encerradaEm)}</dd>
                  </div>
                )}
              </dl>

              {ocorrencia.motivoEncerramento && (
                <p className="mt-2 rounded bg-background px-3 py-2 text-xs text-texto-suave">
                  <strong>Motivo:</strong> {ocorrencia.motivoEncerramento}
                </p>
              )}

              {habitacao.ocorrenciaEmAberto(ocorrencia.situacao) && (
                <p className="mt-2 text-xs text-texto-suave">
                  <strong>Próximo passo sugerido:</strong> {ocorrencia.encaminhamentoSugerido}
                </p>
              )}

              {podeDecidir && ocorrencia.transicoes.length > 0 && (
                <div className="mt-3">
                  {movendo?.id === ocorrencia.id ? (
                    <form
                      className="flex flex-wrap items-end gap-2"
                      action={(formulario) =>
                        rodar(
                          () =>
                            moverOcorrencia(
                              ocorrencia.id,
                              movendo.para,
                              String(formulario.get('motivo') ?? '') || undefined,
                              caminho,
                            ),
                          () => setMovendo(undefined),
                        )
                      }
                    >
                      <p className="w-full text-xs font-semibold text-texto">
                        → {habitacao.rotuloSituacaoOcorrencia(movendo.para)}
                        {movendo.para === 'NOTIFICADA' &&
                          ' — o prazo de regularização começa a contar hoje.'}
                      </p>
                      {ENCERRAM.includes(movendo.para) && (
                        <input
                          name="motivo"
                          required
                          placeholder="Motivo da decisão"
                          className="w-72 rounded border border-borda px-2 py-1 text-xs"
                        />
                      )}
                      <button
                        type="submit"
                        disabled={pendente}
                        className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovendo(undefined)}
                        className="rounded-md border border-borda px-3 py-1 text-xs font-semibold text-texto-suave"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <select
                      aria-label={`Decidir ocorrência ${ocorrencia.protocolo}`}
                      value=""
                      onChange={(evento) => {
                        const para = evento.target.value as habitacao.SituacaoOcorrencia;
                        if (para) setMovendo({ id: ocorrencia.id, para });
                      }}
                      className="rounded-md border border-borda bg-surface px-2 py-1 text-xs font-semibold text-texto-suave"
                    >
                      <option value="">Decidir…</option>
                      {ocorrencia.transicoes.map((situacao) => (
                        <option key={situacao} value={situacao}>
                          {habitacao.rotuloSituacaoOcorrencia(situacao)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
