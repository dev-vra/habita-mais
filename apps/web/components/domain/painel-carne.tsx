'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import {
  darBaixa,
  estornarPagamento,
  renegociarContrato,
  transferirTitularidade,
} from '@/app/actions/contratos';
import { Aviso } from '@/components/ui/formulario';
import { data, moeda } from '@/lib/formato';
import type { ContratoDetalhe, ParcelaDetalhe } from '@/app/(painel)/contratos/[contratoId]/page';

const TOM_PARCELA: Record<habitacao.SituacaoParcela, string> = {
  ABERTA: 'bg-background text-texto-suave',
  PAGA: 'bg-success/10 text-success',
  PAGA_PARCIAL: 'bg-warning/15 text-warning-text',
  VENCIDA: 'bg-danger/10 text-danger',
  RENEGOCIADA: 'bg-background text-texto-suave',
  ISENTA: 'bg-background text-texto-suave',
  CANCELADA: 'bg-background text-texto-suave',
};

type Aba = 'ABERTAS' | 'TODAS' | 'PAGAS';

/**
 * O carnê.
 *
 * Abre nas parcelas em aberto porque é o que o balcão precisa: quem chega para pagar quer a
 * próxima, e quem cobra quer a vencida. O histórico inteiro fica a um clique, não na frente.
 */
export function PainelCarne({
  contrato,
  caminho,
  podeBaixar,
  podeRenegociar,
  podeTransferir,
}: {
  contrato: ContratoDetalhe;
  caminho: string;
  podeBaixar: boolean;
  podeRenegociar: boolean;
  podeTransferir: boolean;
}) {
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [aba, setAba] = useState<Aba>('ABERTAS');
  const [baixando, setBaixando] = useState<string>();
  const [estornando, setEstornando] = useState<string>();
  const [renegociando, setRenegociando] = useState(false);
  const [transferindo, setTransferindo] = useState(false);
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

  const encerradas: habitacao.SituacaoParcela[] = ['PAGA', 'ISENTA', 'CANCELADA', 'RENEGOCIADA'];
  const visiveis = contrato.parcelas.filter((parcela) =>
    aba === 'TODAS'
      ? true
      : aba === 'PAGAS'
        ? parcela.situacao === 'PAGA'
        : !encerradas.includes(parcela.situacao),
  );

  const vigente = contrato.situacao === 'VIGENTE';

  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {(['ABERTAS', 'PAGAS', 'TODAS'] as Aba[]).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setAba(opcao)}
              aria-pressed={aba === opcao}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                aba === opcao
                  ? 'bg-institucional text-surface'
                  : 'bg-background text-texto-suave hover:bg-borda/60'
              }`}
            >
              {opcao === 'ABERTAS' ? 'Em aberto' : opcao === 'PAGAS' ? 'Pagas' : 'Todas'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {podeRenegociar && vigente && (
            <button
              type="button"
              onClick={() => setRenegociando((aberto) => !aberto)}
              className="rounded-md border border-borda px-3 py-1.5 text-xs font-semibold text-institucional"
            >
              {renegociando ? 'Cancelar' : 'Renegociar saldo'}
            </button>
          )}
          {podeTransferir && (
            <button
              type="button"
              onClick={() => setTransferindo((aberto) => !aberto)}
              className="rounded-md border border-borda px-3 py-1.5 text-xs font-semibold text-institucional"
            >
              {transferindo ? 'Cancelar' : 'Transferir titularidade'}
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}
      {aviso && (
        <div className="mt-3">
          <Aviso tom="info">{aviso}</Aviso>
        </div>
      )}

      {renegociando && (
        <form
          className="mt-4 grid gap-3 rounded-md border border-borda bg-background p-4 md:grid-cols-3"
          action={(formulario) =>
            rodar(
              () =>
                renegociarContrato(
                  contrato.id,
                  {
                    motivo: String(formulario.get('motivo')),
                    novaQuantidade: Number(formulario.get('novaQuantidade')),
                    primeiraCompetencia: String(formulario.get('primeiraCompetencia')),
                  },
                  caminho,
                ),
              () => {
                setRenegociando(false);
                setAviso('Saldo renegociado. As parcelas antigas saíram da conta e o carnê novo já está aqui.');
              },
            )
          }
        >
          <p className="text-xs text-texto-suave md:col-span-3">
            Todo o saldo em aberto ({moeda(contrato.resumo.saldoDevedor)}) vira um carnê novo. As
            parcelas antigas ficam registradas como renegociadas — o histórico de atraso não some.
          </p>

          <label className="text-xs font-semibold text-texto-suave">
            Parcelas
            <input
              type="number"
              name="novaQuantidade"
              min={1}
              max={600}
              required
              className="tabular mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-texto-suave">
            Primeira competência
            <input
              name="primeiraCompetencia"
              required
              placeholder="2026-10"
              pattern="\d{4}-\d{2}"
              className="tabular mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-texto-suave md:col-span-3">
            Motivo
            <input
              name="motivo"
              required
              placeholder="Ex.: acordo firmado no atendimento de 17/08, família desempregada"
              className="mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60 md:col-span-3 md:justify-self-start"
          >
            Renegociar
          </button>
        </form>
      )}

      {transferindo && (
        <form
          className="mt-4 space-y-3 rounded-md border border-danger/30 bg-danger/5 p-4"
          action={(formulario) =>
            rodar(
              () =>
                transferirTitularidade(
                  contrato.id,
                  {
                    motivo: String(formulario.get('motivo')),
                    paraTitularId: String(formulario.get('paraTitularId')),
                    paraFamiliaId: String(formulario.get('paraFamiliaId')),
                    fundamentacao: String(formulario.get('fundamentacao')),
                  },
                  caminho,
                ),
              () => {
                setTransferindo(false);
                setAviso('Titularidade transferida.');
              },
            )
          }
        >
          <div>
            <p className="text-sm font-bold text-texto">Transferir titularidade</p>
            <p className="text-xs text-texto-suave">
              Ação sensível: a unidade acompanha o contrato. Cada motivo exige a prova que o
              cartório e o controle interno vão pedir depois.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-texto-suave">
              Motivo
              <select
                name="motivo"
                defaultValue="OBITO_TITULAR"
                className="mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
              >
                {habitacao.opcoes(habitacao.MOTIVO_TRANSFERENCIA).map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-texto-suave">
              Novo titular (id da pessoa)
              <input
                name="paraTitularId"
                required
                className="mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-texto-suave">
              Família (id)
              <input
                name="paraFamiliaId"
                required
                defaultValue={contrato.familia.id}
                className="mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-texto-suave">
            Fundamentação
            <textarea
              name="fundamentacao"
              required
              rows={3}
              placeholder="Por que a unidade muda de mãos, e com que documento."
              className="mt-1 w-full rounded border border-borda bg-surface px-2 py-1.5 text-sm"
            />
          </label>

          <ul className="text-xs text-texto-suave">
            <li className="font-semibold">Documentos que o motivo escolhido costuma exigir:</li>
            {habitacao.DOCUMENTOS_POR_MOTIVO.OBITO_TITULAR.map((documento) => (
              <li key={documento}>· {documento}</li>
            ))}
          </ul>

          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
          >
            Transferir
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
            <tr>
              <th className="px-3 py-2 font-semibold">Parcela</th>
              <th className="px-3 py-2 font-semibold">Vencimento</th>
              <th className="px-3 py-2 text-right font-semibold">Valor</th>
              <th className="px-3 py-2 text-right font-semibold">Pago</th>
              <th className="px-3 py-2 font-semibold">Situação</th>
              {podeBaixar && <th className="px-3 py-2 font-semibold">Baixa</th>}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((parcela) => (
              <LinhaParcela
                key={parcela.id}
                parcela={parcela}
                podeBaixar={podeBaixar && vigente}
                emBaixa={baixando === parcela.id}
                emEstorno={estornando}
                pendente={pendente}
                aoAbrirBaixa={() => setBaixando(parcela.id)}
                aoFecharBaixa={() => setBaixando(undefined)}
                aoAbrirEstorno={setEstornando}
                aoBaixar={(dados) =>
                  rodar(() => darBaixa(parcela.id, dados, caminho), () => setBaixando(undefined))
                }
                aoEstornar={(pagamentoId, motivo) =>
                  rodar(
                    () => estornarPagamento(pagamentoId, motivo, caminho),
                    () => setEstornando(undefined),
                  )
                }
              />
            ))}
          </tbody>
        </table>

        {visiveis.length === 0 && (
          <p className="py-6 text-center text-sm text-texto-suave">
            Nenhuma parcela nesta aba.
          </p>
        )}
      </div>
    </section>
  );
}

function LinhaParcela({
  parcela,
  podeBaixar,
  emBaixa,
  emEstorno,
  pendente,
  aoAbrirBaixa,
  aoFecharBaixa,
  aoAbrirEstorno,
  aoBaixar,
  aoEstornar,
}: {
  parcela: ParcelaDetalhe;
  podeBaixar: boolean;
  emBaixa: boolean;
  emEstorno?: string;
  pendente: boolean;
  aoAbrirBaixa: () => void;
  aoFecharBaixa: () => void;
  aoAbrirEstorno: (pagamentoId: string | undefined) => void;
  aoBaixar: (dados: { valor: number; pagoEm: string; forma: string }) => void;
  aoEstornar: (pagamentoId: string, motivo: string) => void;
}) {
  const encerrada = ['PAGA', 'ISENTA', 'CANCELADA', 'RENEGOCIADA'].includes(parcela.situacao);

  return (
    <tr className="border-b border-borda align-top last:border-0">
      <td className="tabular px-3 py-2 font-semibold">{parcela.numero}</td>
      <td className="tabular px-3 py-2">
        {data(parcela.vencimento)}
        <p className="text-xs text-texto-suave">{parcela.competencia}</p>
      </td>
      <td className="tabular px-3 py-2 text-right">{moeda(parcela.valor)}</td>
      <td className="tabular px-3 py-2 text-right">
        {parcela.valorPago > 0 ? moeda(parcela.valorPago) : '—'}
        {parcela.saldo > 0 && parcela.valorPago > 0 && (
          <p className="text-xs text-texto-suave">falta {moeda(parcela.saldo)}</p>
        )}
      </td>
      <td className="px-3 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TOM_PARCELA[parcela.situacao]}`}
        >
          {habitacao.rotuloSituacaoParcela(parcela.situacao)}
        </span>
        {parcela.diasEmAtraso > 0 && (
          <p className="tabular mt-1 text-xs text-danger">{parcela.diasEmAtraso} dia(s)</p>
        )}

        {parcela.pagamentos.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {parcela.pagamentos.map((pagamento) => (
              <li key={pagamento.id} className="tabular text-xs text-texto-suave">
                {moeda(pagamento.valor)} · {data(pagamento.pagoEm)} ·{' '}
                {habitacao.rotuloFormaPagamento(pagamento.forma)}
                {pagamento.estornadoEm ? (
                  <span className="ml-1 font-semibold text-danger">estornado</span>
                ) : (
                  podeBaixar && (
                    <button
                      type="button"
                      onClick={() => aoAbrirEstorno(pagamento.id)}
                      className="ml-1 font-semibold text-danger underline-offset-2 hover:underline"
                    >
                      estornar
                    </button>
                  )
                )}

                {emEstorno === pagamento.id && (
                  <form
                    className="mt-1 flex flex-wrap gap-1"
                    action={(formulario) =>
                      aoEstornar(pagamento.id, String(formulario.get('motivo') ?? ''))
                    }
                  >
                    <input
                      name="motivo"
                      required
                      placeholder="Motivo do estorno"
                      className="w-48 rounded border border-borda px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={pendente}
                      className="rounded bg-danger px-2 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => aoAbrirEstorno(undefined)}
                      className="rounded border border-borda px-2 py-1 text-xs font-semibold text-texto-suave"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </td>

      {podeBaixar && (
        <td className="px-3 py-2">
          {encerrada ? (
            <span className="text-xs text-texto-suave">—</span>
          ) : emBaixa ? (
            <form
              className="flex w-56 flex-col gap-1.5"
              action={(formulario) =>
                aoBaixar({
                  valor: Number(formulario.get('valor')),
                  pagoEm: String(formulario.get('pagoEm')),
                  forma: String(formulario.get('forma')),
                })
              }
            >
              <input
                type="number"
                name="valor"
                step="0.01"
                min={0.01}
                max={parcela.saldo}
                required
                defaultValue={parcela.saldo}
                className="tabular rounded border border-borda px-2 py-1 text-xs"
              />
              <input
                type="date"
                name="pagoEm"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded border border-borda px-2 py-1 text-xs"
              />
              <select
                name="forma"
                defaultValue="PIX"
                className="rounded border border-borda bg-surface px-2 py-1 text-xs"
              >
                {habitacao.opcoes(habitacao.FORMA_PAGAMENTO).map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  type="submit"
                  disabled={pendente}
                  className="rounded bg-primary px-2.5 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                >
                  Dar baixa
                </button>
                <button
                  type="button"
                  onClick={aoFecharBaixa}
                  className="rounded border border-borda px-2.5 py-1 text-xs font-semibold text-texto-suave"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={aoAbrirBaixa}
              className="rounded-md border border-borda px-2.5 py-1 text-xs font-semibold text-institucional"
            >
              Dar baixa
            </button>
          )}
        </td>
      )}
    </tr>
  );
}
