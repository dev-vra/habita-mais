'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import {
  aprovarMedicao,
  criarMedicao,
  definirSituacaoObra,
  encerrarMedicao,
  registrarExecucao,
} from '@/app/actions/producao';
import { BarraProgresso } from '@/components/domain/barra-progresso';
import { Aviso } from '@/components/ui/formulario';
import { data, moeda } from '@/lib/formato';
import type { ObraDetalhe } from '@/app/(painel)/producao/[slug]/page';

const TOM_ETAPA: Record<string, string> = {
  CONCLUIDA: 'bg-success/10 text-success',
  NO_PRAZO: 'bg-background text-texto-suave',
  PROXIMA_DO_PRAZO: 'bg-warning/15 text-warning-text',
  ATRASADA: 'bg-danger/10 text-danger',
};

const TOM_MEDICAO: Record<string, string> = {
  RASCUNHO: 'bg-warning/15 text-warning-text',
  APROVADA: 'bg-success/10 text-success',
  REJEITADA: 'bg-danger/10 text-danger',
  CANCELADA: 'bg-background text-texto-suave',
};

/**
 * Uma obra: contrato, cronograma e medições.
 *
 * O bloco de cima existe para uma pergunta só — *o que já foi pago corresponde ao que já foi
 * feito?* Quando não corresponde, o aviso é vermelho e vem antes de qualquer botão de medir: quem
 * assina a próxima medição precisa ver isso na tela, não num relatório trimestral.
 */
export function PainelObra({
  obra,
  caminho,
  podeGerir,
  podeMedir,
  fiscalPadrao,
}: {
  obra: ObraDetalhe;
  caminho: string;
  podeGerir: boolean;
  podeMedir: boolean;
  fiscalPadrao: string;
}) {
  const [erro, setErro] = useState<string>();
  const [medindo, setMedindo] = useState(false);
  const [encerrando, setEncerrando] = useState<string>();
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

  const encerrada = obra.situacao === 'CONCLUIDA' || obra.situacao === 'RESCINDIDA';

  return (
    <article className="rounded-lg border border-borda bg-surface p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-institucional">{obra.descricao}</h3>
          <p className="tabular text-sm text-texto-suave">
            Contrato {obra.numeroContrato} · {obra.executoraNome}
            {obra.artRrt && ` · ART/RRT ${obra.artRrt}`}
          </p>
          <p className="tabular text-xs text-texto-suave">
            {data(obra.inicioPrevisto)} a {data(obra.terminoPrevisto)} · contrato de{' '}
            {moeda(obra.valorContrato)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-texto-suave">
            {habitacao.rotuloSituacaoObra(obra.situacao)}
          </span>
          {podeGerir && !encerrada && (
            <SeletorSituacaoObra
              obraId={obra.id}
              situacaoAtual={obra.situacao}
              pendente={pendente}
              aoEscolher={(situacao, motivo) =>
                rodar(() => definirSituacaoObra(obra.id, situacao, motivo, caminho))
              }
            />
          )}
        </div>
      </header>

      {obra.motivoParalisacao && (
        <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          <strong>Paralisada:</strong> {obra.motivoParalisacao}
        </p>
      )}

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <BarraProgresso
          rotulo="Executado (cronograma)"
          percentual={obra.resumo.percentualFisico}
          tom="institucional"
          detalhe={
            obra.resumo.etapasAtrasadas > 0
              ? `${obra.resumo.etapasAtrasadas} etapa(s) atrasada(s)`
              : 'Nenhuma etapa atrasada'
          }
        />
        <BarraProgresso
          rotulo="Medido (financeiro)"
          percentual={obra.resumo.percentualFinanceiro}
          tom={obra.resumo.pagamentoAdiantado ? 'alerta' : 'primario'}
          detalhe={`${moeda(obra.valorMedido)} medidos · ${moeda(obra.resumo.saldoAMedir)} a medir`}
        />
      </div>

      {obra.resumo.pagamentoAdiantado && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <strong>Pago à frente do executado:</strong> o financeiro está{' '}
          {obra.resumo.descompasso.toFixed(1)} pontos acima do físico. Atualize o cronograma ou
          reveja a última medição antes de aprovar a próxima.
        </p>
      )}

      <section className="mt-5">
        <h4 className="text-sm font-bold text-texto">Cronograma</h4>

        {obra.etapas.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">
            Cronograma não definido. Sem etapas com peso, não há como medir.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {obra.etapas.map((etapa) => (
              <li key={etapa.id} className="rounded-md border border-borda p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-texto">
                      {etapa.nome}{' '}
                      <span className="tabular text-xs font-normal text-texto-suave">
                        peso {etapa.peso}%
                      </span>
                    </p>
                    <p className="tabular text-xs text-texto-suave">
                      Prevista até {data(etapa.previstaAte)}
                      {etapa.situacao === 'ATRASADA' && ` · ${Math.abs(etapa.diasParaPrazo)} dia(s) de atraso`}
                      {etapa.situacao === 'PROXIMA_DO_PRAZO' && ` · vence em ${etapa.diasParaPrazo} dia(s)`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${TOM_ETAPA[etapa.situacao]}`}
                  >
                    {habitacao.rotuloSituacaoEtapa(etapa.situacao)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="min-w-40 flex-1">
                    <BarraProgresso rotulo="Executado" percentual={etapa.executado} />
                  </div>

                  {podeMedir && !encerrada && (
                    <form
                      className="flex items-end gap-1.5"
                      onSubmit={(evento) => {
                        evento.preventDefault();
                        const formulario = new FormData(evento.currentTarget);
                        rodar(() =>
                          registrarExecucao(
                            etapa.id,
                            Number(formulario.get('executado')),
                            caminho,
                          ),
                        );
                      }}
                    >
                      <label className="text-xs text-texto-suave">
                        Executado %
                        <input
                          type="number"
                          name="executado"
                          min={0}
                          max={100}
                          step="0.01"
                          defaultValue={etapa.executado}
                          className="tabular ml-1 w-20 rounded border border-borda px-2 py-1 text-xs"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={pendente}
                        className="rounded-md border border-borda px-2.5 py-1 text-xs font-semibold text-institucional disabled:opacity-60"
                      >
                        Atualizar
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-texto">
            Medições
            {obra.medicoesPendentes > 0 && (
              <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-text">
                {obra.medicoesPendentes} aguardando aprovação
              </span>
            )}
          </h4>

          {podeMedir && !encerrada && obra.etapas.length > 0 && (
            <button
              type="button"
              onClick={() => setMedindo((aberto) => !aberto)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-surface"
            >
              {medindo ? 'Cancelar' : 'Nova medição'}
            </button>
          )}
        </div>

        {medindo && (
          <form
            className="mt-3 grid gap-3 rounded-md border border-borda bg-background p-3 md:grid-cols-5"
            onSubmit={(evento) => {
              evento.preventDefault();
              const formulario = new FormData(evento.currentTarget);
              rodar(
                () =>
                  criarMedicao(
                    obra.id,
                    {
                      periodoInicio: String(formulario.get('periodoInicio')),
                      periodoFim: String(formulario.get('periodoFim')),
                      percentualAcumulado: Number(formulario.get('percentualAcumulado')),
                      valor: Number(formulario.get('valor')),
                      fiscalNome: String(formulario.get('fiscalNome')),
                    },
                    caminho,
                  ),
                () => setMedindo(false),
              );
            }}
          >
            <label className="text-xs font-semibold text-texto-suave">
              Período de
              <input
                type="date"
                name="periodoInicio"
                required
                className="mt-1 w-full rounded border border-borda px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-texto-suave">
              até
              <input
                type="date"
                name="periodoFim"
                required
                className="mt-1 w-full rounded border border-borda px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-texto-suave">
              % acumulado
              <input
                type="number"
                name="percentualAcumulado"
                min={0}
                max={100}
                step="0.01"
                required
                defaultValue={obra.resumo.percentualFisico}
                className="tabular mt-1 w-full rounded border border-borda px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-texto-suave">
              Valor (R$)
              <input
                type="number"
                name="valor"
                min={0.01}
                step="0.01"
                required
                className="tabular mt-1 w-full rounded border border-borda px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-texto-suave">
              Fiscal
              <input
                name="fiscalNome"
                required
                defaultValue={fiscalPadrao}
                className="mt-1 w-full rounded border border-borda px-2 py-1.5 text-sm"
              />
            </label>

            <div className="md:col-span-5">
              <button
                type="submit"
                disabled={pendente}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
              >
                Registrar medição
              </button>
              <p className="mt-1.5 text-xs text-texto-suave">
                A medição nasce aguardando aprovação. Quem mede não aprova sozinho.
              </p>
            </div>
          </form>
        )}

        {obra.medicoes.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Nenhuma medição registrada.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-borda">
            <table className="w-full text-sm">
              <thead className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
                <tr>
                  <th className="px-3 py-2 font-semibold">Medição</th>
                  <th className="px-3 py-2 font-semibold">Período</th>
                  <th className="px-3 py-2 text-right font-semibold">Acumulado</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2 font-semibold">Situação</th>
                  {podeGerir && <th className="px-3 py-2 font-semibold">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {obra.medicoes.map((medicao) => (
                  <tr key={medicao.id} className="border-b border-borda last:border-0 align-top">
                    <td className="px-3 py-2">
                      <p className="tabular text-xs font-semibold text-institucional">
                        {medicao.protocolo}
                      </p>
                      <p className="text-xs text-texto-suave">
                        nº {medicao.numero} · {medicao.fiscalNome}
                      </p>
                    </td>
                    <td className="tabular px-3 py-2 text-xs">
                      {data(medicao.periodoInicio)} a {data(medicao.periodoFim)}
                    </td>
                    <td className="tabular px-3 py-2 text-right">{medicao.percentualAcumulado}%</td>
                    <td className="tabular px-3 py-2 text-right font-semibold">
                      {moeda(medicao.valor)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TOM_MEDICAO[medicao.situacao]}`}
                      >
                        {habitacao.rotuloSituacaoMedicao(medicao.situacao)}
                      </span>
                      {medicao.aprovadaEm && (
                        <p className="tabular mt-1 text-xs text-texto-suave">
                          {data(medicao.aprovadaEm)} · {medicao.aprovadaPor}
                        </p>
                      )}
                      {medicao.motivo && (
                        <p className="mt-1 text-xs text-danger">{medicao.motivo}</p>
                      )}
                    </td>
                    {podeGerir && (
                      <td className="px-3 py-2">
                        {medicao.situacao === 'RASCUNHO' && (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={pendente}
                              onClick={() => rodar(() => aprovarMedicao(medicao.id, caminho))}
                              className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEncerrando(medicao.id)}
                              className="rounded-md border border-borda px-2.5 py-1 text-xs font-semibold text-danger"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                        {medicao.situacao === 'APROVADA' && (
                          <button
                            type="button"
                            onClick={() => setEncerrando(medicao.id)}
                            className="rounded-md border border-borda px-2.5 py-1 text-xs font-semibold text-danger"
                          >
                            Cancelar
                          </button>
                        )}

                        {encerrando === medicao.id && (
                          <form
                            className="mt-2 flex flex-wrap gap-1.5"
                            action={(formulario) =>
                              rodar(
                                () =>
                                  encerrarMedicao(
                                    medicao.id,
                                    medicao.situacao === 'APROVADA' ? 'CANCELADA' : 'REJEITADA',
                                    String(formulario.get('motivo') ?? ''),
                                    caminho,
                                  ),
                                () => setEncerrando(undefined),
                              )
                            }
                          >
                            <input
                              name="motivo"
                              required
                              placeholder="Motivo — vai para a prestação de contas"
                              className="w-56 rounded border border-borda px-2 py-1 text-xs"
                            />
                            <button
                              type="submit"
                              disabled={pendente}
                              className="rounded-md bg-danger px-2.5 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                            >
                              Confirmar
                            </button>
                          </form>
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
    </article>
  );
}

/** Situações da obra que exigem motivo — as que interrompem a execução. */
const EXIGEM_MOTIVO = ['PARALISADA', 'RESCINDIDA'];

function SeletorSituacaoObra({
  situacaoAtual,
  pendente,
  aoEscolher,
}: {
  obraId: string;
  situacaoAtual: string;
  pendente: boolean;
  aoEscolher: (situacao: string, motivo?: string) => void;
}) {
  const [escolhida, setEscolhida] = useState<string>();

  const opcoes = ['NAO_INICIADA', 'EM_EXECUCAO', 'PARALISADA', 'CONCLUIDA', 'RESCINDIDA'].filter(
    (situacao) => situacao !== situacaoAtual,
  );

  if (escolhida && EXIGEM_MOTIVO.includes(escolhida)) {
    return (
      <form
        className="flex flex-wrap justify-end gap-1.5"
        action={(formulario) => {
          aoEscolher(escolhida, String(formulario.get('motivo') ?? ''));
          setEscolhida(undefined);
        }}
      >
        <input
          name="motivo"
          required
          placeholder={`Motivo para ${habitacao.rotuloSituacaoObra(escolhida).toLowerCase()}`}
          className="w-56 rounded border border-borda px-2 py-1 text-xs"
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-danger px-2.5 py-1 text-xs font-semibold text-surface disabled:opacity-60"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => setEscolhida(undefined)}
          className="rounded-md border border-borda px-2.5 py-1 text-xs font-semibold text-texto-suave"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <select
      aria-label="Mudar situação da obra"
      value=""
      disabled={pendente}
      onChange={(evento) => {
        const situacao = evento.target.value;
        if (!situacao) return;
        if (EXIGEM_MOTIVO.includes(situacao)) setEscolhida(situacao);
        else aoEscolher(situacao);
      }}
      className="rounded-md border border-borda bg-surface px-2 py-1 text-xs font-semibold text-texto-suave"
    >
      <option value="">Mudar situação…</option>
      {opcoes.map((situacao) => (
        <option key={situacao} value={situacao}>
          {habitacao.rotuloSituacaoObra(situacao)}
        </option>
      ))}
    </select>
  );
}
