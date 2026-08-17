import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { BarraProgresso } from '@/components/domain/barra-progresso';
import { PainelCarne } from '@/components/domain/painel-carne';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { data, moeda } from '@/lib/formato';

export interface PagamentoRegistrado {
  id: string;
  valor: number;
  pagoEm: string;
  forma: string;
  baixadoPor: string;
  estornadoEm: string | null;
  motivoEstorno: string | null;
}

export interface ParcelaDetalhe {
  id: string;
  numero: number;
  competencia: string;
  vencimento: string;
  valor: number;
  valorPago: number;
  situacao: habitacao.SituacaoParcela;
  diasEmAtraso: number;
  saldo: number;
  observacao: string | null;
  pagamentos: PagamentoRegistrado[];
}

export interface ContratoDetalhe {
  id: string;
  protocolo: string;
  situacao: habitacao.SituacaoContrato;
  motivoSituacao: string | null;
  valores: {
    unidade: number;
    subsidio: number;
    entrada: number;
    financiado: number;
    parcela: number;
  };
  quantidadeParcelas: number;
  diaVencimento: number;
  indiceReajuste: string;
  assinadoEm: string;
  primeiraCompetencia: string;
  tituloGarantiaKey: string | null;
  titular: { id: string; nome: string; cpf: string };
  familia: { id: string; codigo: string };
  unidade: {
    id: string;
    identificacao: string;
    endereco: string;
    matricula: string | null;
    empreendimento: { nome: string; slug: string };
  };
  resumo: habitacao.ResumoContrato;
  inadimplencia: habitacao.AvaliacaoInadimplencia;
  parcelas: ParcelaDetalhe[];
  renegociacoes: {
    id: string;
    saldoRenegociado: number;
    parcelasSubstituidas: number;
    novaQuantidade: number;
    novoValorParcela: number;
    motivo: string;
    autorizadaPor: string;
    createdAt: string;
  }[];
  transferencias: {
    id: string;
    motivo: string;
    fundamentacao: string;
    autorizadaPor: string;
    efetivadaEm: string;
  }[];
}

/**
 * Um contrato por inteiro.
 *
 * O topo responde o que o balcão pergunta primeiro — quanto falta, quanto está vencido, e em que
 * pé está a cobrança. O carnê vem depois: é onde se dá baixa, e ele fica longo de propósito, com
 * a parcela vencida destacada.
 */
export default async function PaginaContrato({
  params,
}: {
  params: Promise<{ contratoId: string }>;
}) {
  const { contratoId } = await params;
  const [contrato, sessao] = await Promise.all([
    apiFetch<ContratoDetalhe>(`/contratos/${contratoId}`),
    sessaoAtual(),
  ]);

  const caminho = `/contratos/${contratoId}`;
  const podeBaixar = sessao?.capacidades.includes('BAIXAR_PAGAMENTO') ?? false;
  const podeRenegociar = sessao?.capacidades.includes('RENEGOCIAR_CONTRATO') ?? false;
  const podeTransferir = sessao?.capacidades.includes('TRANSFERIR_TITULARIDADE') ?? false;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">
        <Link href="/contratos" className="hover:underline">
          Mutuários
        </Link>{' '}
        › {contrato.protocolo}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            {contrato.protocolo}
          </h1>
          <p className="mt-1 text-sm text-texto">
            <Link
              href={`/familias/${contrato.familia.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {contrato.titular.nome}
            </Link>
            <span className="tabular text-texto-suave"> · {contrato.familia.codigo}</span>
          </p>
          <p className="tabular text-sm text-texto-suave">
            <Link
              href={`/acompanhamento/${contrato.unidade.id}`}
              className="hover:underline"
            >
              Unidade {contrato.unidade.identificacao}
            </Link>{' '}
            · {contrato.unidade.empreendimento.nome}
            {contrato.unidade.matricula && ` · matrícula ${contrato.unidade.matricula}`}
          </p>
        </div>

        <div className="text-right">
          <span className="rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-texto-suave">
            {habitacao.rotuloSituacaoContrato(contrato.situacao)}
          </span>
          <p className="tabular mt-1 text-xs text-texto-suave">
            assinado em {data(contrato.assinadoEm)}
          </p>
        </div>
      </div>

      {contrato.motivoSituacao && (
        <p className="mt-4 rounded-md bg-warning/15 px-4 py-3 text-sm text-warning-text">
          {contrato.motivoSituacao}
        </p>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-borda bg-surface p-4">
          <p className="text-xs font-semibold text-texto-suave">Saldo devedor</p>
          <p className="tabular mt-1 text-2xl font-extrabold text-institucional">
            {moeda(contrato.resumo.saldoDevedor)}
          </p>
          <p className="tabular mt-1 text-xs text-texto-suave">
            de {moeda(contrato.valores.financiado)} financiados
          </p>
        </div>

        <div className="rounded-lg border border-borda bg-surface p-4">
          <p className="text-xs font-semibold text-texto-suave">Em atraso</p>
          <p
            className={`tabular mt-1 text-2xl font-extrabold ${contrato.resumo.valorEmAtraso > 0 ? 'text-danger' : 'text-success'}`}
          >
            {moeda(contrato.resumo.valorEmAtraso)}
          </p>
          <p className="tabular mt-1 text-xs text-texto-suave">
            {contrato.resumo.vencidas} parcela(s) vencida(s)
            {contrato.resumo.maiorAtrasoDias > 0 &&
              ` · maior atraso ${contrato.resumo.maiorAtrasoDias} dia(s)`}
          </p>
        </div>

        <div className="rounded-lg border border-borda bg-surface p-4">
          <p className="text-xs font-semibold text-texto-suave">Composição</p>
          <dl className="tabular mt-1 space-y-0.5 text-xs text-texto-suave">
            <div className="flex justify-between">
              <dt>Unidade</dt>
              <dd>{moeda(contrato.valores.unidade)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Subsídio</dt>
              <dd className="text-success">− {moeda(contrato.valores.subsidio)}</dd>
            </div>
            {contrato.valores.entrada > 0 && (
              <div className="flex justify-between">
                <dt>Entrada</dt>
                <dd>− {moeda(contrato.valores.entrada)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-borda pt-0.5 font-semibold text-texto">
              <dt>Financiado</dt>
              <dd>{moeda(contrato.valores.financiado)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-texto-suave">
            {contrato.quantidadeParcelas}× de {moeda(contrato.valores.parcela)} · vence dia{' '}
            {contrato.diaVencimento} · {habitacao.rotuloIndiceReajuste(contrato.indiceReajuste)}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-borda bg-surface p-5">
        <BarraProgresso
          rotulo="Quitação"
          tom="sucesso"
          percentual={contrato.resumo.percentualQuitado}
          detalhe={`${contrato.resumo.pagas} de ${contrato.resumo.totalParcelas} parcelas · ${moeda(contrato.resumo.valorPago)} pagos`}
        />

        {contrato.inadimplencia.fase !== 'EM_DIA' && (
          <div
            className={`mt-4 rounded-md px-4 py-3 text-sm ${
              contrato.inadimplencia.podePropoRescisao
                ? 'bg-danger/10 text-danger'
                : 'bg-warning/15 text-warning-text'
            }`}
          >
            <p className="font-bold">
              {habitacao.rotuloFaseInadimplencia(contrato.inadimplencia.fase)} ·{' '}
              {contrato.inadimplencia.parcelasVencidas} parcela(s) vencida(s)
            </p>
            <p className="mt-0.5">{contrato.inadimplencia.proximoPasso}</p>
            {contrato.inadimplencia.podePropoRescisao && (
              <p className="mt-1 text-xs">
                Rescindir exige processo com notificação e defesa —{' '}
                <Link href="/retomada" className="font-semibold underline">
                  abre-se em Retomada
                </Link>
                , nunca por aqui.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <PainelCarne
          contrato={contrato}
          caminho={caminho}
          podeBaixar={podeBaixar}
          podeRenegociar={podeRenegociar}
          podeTransferir={podeTransferir}
        />
      </section>

      {(contrato.renegociacoes.length > 0 || contrato.transferencias.length > 0) && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-institucional">Histórico do contrato</h2>

          <ul className="mt-3 space-y-2">
            {contrato.renegociacoes.map((item) => (
              <li key={item.id} className="rounded-lg border border-borda bg-surface p-4">
                <p className="text-sm font-semibold text-texto">
                  Renegociação · {data(item.createdAt)}
                </p>
                <p className="tabular text-xs text-texto-suave">
                  {moeda(item.saldoRenegociado)} em {item.novaQuantidade}× de{' '}
                  {moeda(item.novoValorParcela)} · {item.parcelasSubstituidas} parcela(s)
                  substituída(s) · autorizada por {item.autorizadaPor}
                </p>
                <p className="mt-1 text-sm text-texto-suave">{item.motivo}</p>
              </li>
            ))}

            {contrato.transferencias.map((item) => (
              <li key={item.id} className="rounded-lg border border-borda bg-surface p-4">
                <p className="text-sm font-semibold text-texto">
                  Transferência de titularidade ·{' '}
                  {habitacao.rotuloMotivoTransferencia(item.motivo)} · {data(item.efetivadaEm)}
                </p>
                <p className="text-xs text-texto-suave">Autorizada por {item.autorizadaPor}</p>
                <p className="mt-1 text-sm text-texto-suave">{item.fundamentacao}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
