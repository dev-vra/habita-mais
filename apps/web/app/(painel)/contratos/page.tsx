import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { apiFetch } from '@/lib/api/server';
import { data, moeda, percentual } from '@/lib/formato';

interface LinhaContrato {
  id: string;
  protocolo: string;
  situacao: string;
  valorFinanciado: number;
  quantidadeParcelas: number;
  assinadoEm: string;
  titular: { id: string; nome: string };
  familia: { id: string; codigo: string };
  unidade: {
    id: string;
    identificacao: string;
    empreendimento: { nome: string; slug: string };
  };
  resumo: habitacao.ResumoContrato;
  inadimplencia: habitacao.AvaliacaoInadimplencia;
}

interface Carteira {
  itens: LinhaContrato[];
  resumo: {
    total: number;
    vigentes: number;
    quitados: number;
    inadimplentes: number;
    aNotificar: number;
    valorEmAtraso: number;
    saldoTotal: number;
  };
}

const TOM_FASE: Record<habitacao.FaseInadimplencia, string> = {
  EM_DIA: 'bg-success/10 text-success',
  ATRASO_RECENTE: 'bg-background text-texto-suave',
  COBRANCA: 'bg-warning/15 text-warning-text',
  NOTIFICACAO: 'bg-danger/10 text-danger',
  PASSIVEL_RESCISAO: 'bg-danger text-surface',
};

/**
 * Carteira de mutuários.
 *
 * Ordena pelo maior atraso porque a lista é de quem cobra: a primeira linha precisa ser a família
 * há mais tempo sem pagar, não a que assinou primeiro. Cobrar cedo costuma resolver; cobrar tarde
 * vira processo.
 */
export default async function PaginaContratos({
  searchParams,
}: {
  searchParams: Promise<{ inadimplentes?: string }>;
}) {
  const { inadimplentes } = await searchParams;
  const soInadimplentes = inadimplentes === 'true';

  const carteira = await apiFetch<Carteira>(
    `/contratos${soInadimplentes ? '?inadimplentes=true' : ''}`,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Mutuários</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            Contratos de mutuário
          </h1>
          <p className="mt-1 text-sm text-texto-suave">
            Carnê, pagamento e cobrança das unidades entregues com contrapartida.
          </p>
        </div>
        <Link
          href={soInadimplentes ? '/contratos' : '/contratos?inadimplentes=true'}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {soInadimplentes ? 'Ver todos' : 'Ver só quem está em atraso'}
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao rotulo="Vigentes" valor={String(carteira.resumo.vigentes)} />
        <Cartao rotulo="Quitados" valor={String(carteira.resumo.quitados)} tom="sucesso" />
        <Cartao
          rotulo="Em atraso"
          valor={String(carteira.resumo.inadimplentes)}
          detalhe={`${carteira.resumo.aNotificar} a notificar`}
          tom="perigo"
        />
        <Cartao
          rotulo="Valor em atraso"
          valor={moeda(carteira.resumo.valorEmAtraso)}
          detalhe={`saldo total ${moeda(carteira.resumo.saldoTotal)}`}
          tom="perigo"
        />
      </section>

      {carteira.itens.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-borda bg-surface p-8 text-center text-sm text-texto-suave">
          {soInadimplentes
            ? 'Nenhum contrato em atraso.'
            : 'Nenhum contrato assinado. O contrato nasce na entrega da unidade, quando há contrapartida da família.'}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-borda bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-3 font-semibold">Contrato</th>
                <th className="px-4 py-3 font-semibold">Titular</th>
                <th className="px-4 py-3 font-semibold">Unidade</th>
                <th className="px-4 py-3 text-right font-semibold">Saldo</th>
                <th className="px-4 py-3 font-semibold">Quitação</th>
                <th className="px-4 py-3 font-semibold">Cobrança</th>
              </tr>
            </thead>
            <tbody>
              {carteira.itens.map((linha) => (
                <tr key={linha.id} className="border-b border-borda align-top last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contratos/${linha.id}`}
                      className="tabular font-semibold text-primary hover:underline"
                    >
                      {linha.protocolo}
                    </Link>
                    <p className="text-xs text-texto-suave">
                      {habitacao.rotuloSituacaoContrato(linha.situacao)} · assinado em{' '}
                      {data(linha.assinadoEm)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-texto">{linha.titular.nome}</p>
                    <p className="tabular text-xs text-texto-suave">{linha.familia.codigo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-texto">{linha.unidade.identificacao}</p>
                    <p className="text-xs text-texto-suave">
                      {linha.unidade.empreendimento.nome}
                    </p>
                  </td>
                  <td className="tabular px-4 py-3 text-right">
                    <p className="font-semibold">{moeda(linha.resumo.saldoDevedor)}</p>
                    {linha.resumo.valorEmAtraso > 0 && (
                      <p className="text-xs font-semibold text-danger">
                        {moeda(linha.resumo.valorEmAtraso)} vencido
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="tabular text-xs text-texto-suave">
                      {linha.resumo.pagas} de {linha.resumo.totalParcelas} ·{' '}
                      {percentual(linha.resumo.percentualQuitado)}
                    </p>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded bg-background">
                      <div
                        className="h-full rounded bg-success"
                        style={{ width: `${Math.min(100, linha.resumo.percentualQuitado)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TOM_FASE[linha.inadimplencia.fase]}`}
                    >
                      {habitacao.rotuloFaseInadimplencia(linha.inadimplencia.fase)}
                    </span>
                    {linha.inadimplencia.maiorAtrasoDias > 0 && (
                      <p className="tabular mt-1 text-xs text-texto-suave">
                        {linha.inadimplencia.maiorAtrasoDias} dia(s) de atraso
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: 'sucesso' | 'perigo';
}) {
  const cor =
    tom === 'perigo' ? 'text-danger' : tom === 'sucesso' ? 'text-success' : 'text-institucional';

  return (
    <div className="rounded-lg border border-borda bg-surface p-4">
      <p className="text-xs font-semibold text-texto-suave">{rotulo}</p>
      <p className={`tabular mt-1 text-2xl font-extrabold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-texto-suave">{detalhe}</p>}
    </div>
  );
}
