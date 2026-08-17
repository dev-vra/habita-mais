import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { apiFetch } from '@/lib/api/server';
import { data } from '@/lib/formato';

interface LinhaAgenda {
  unidadeId: string;
  protocolo: string;
  identificacao: string;
  endereco: string;
  situacaoUnidade: string;
  entregueEm: string | null;
  empreendimento: { id: string; nome: string; slug: string };
  familia: { id: string; codigo: string; responsavel: string } | null;
  ultimaVisita: { protocolo: string; visitadaEm: string; residenciaConfirmada: boolean } | null;
  situacao: habitacao.SituacaoAcompanhamento;
  proximaVisitaEm: string | null;
  diasParaProxima: number | null;
  ocorrenciasAbertas: number;
  ocorrenciaMaisGrave: string | null;
}

interface Agenda {
  itens: LinhaAgenda[];
  resumo: {
    total: number;
    vencidas: number;
    vencendo: number;
    aguardandoPrimeira: number;
    emDia: number;
    comOcorrenciaAberta: number;
  };
  periodicidade: { prazoPrimeiraVisitaDias: number; periodicidadeMeses: number };
}

interface OcorrenciaAberta {
  id: string;
  protocolo: string;
  tipo: string;
  gravidade: string;
  origem: string;
  situacao: string;
  descricao: string;
  constatadaEm: string;
  prazoRegularizacaoAte: string | null;
  prazoVencido: boolean;
  unidade: {
    id: string;
    identificacao: string;
    empreendimento: { nome: string; slug: string };
    familia: { codigo: string; responsavel: string } | null;
  };
}

const TOM_SITUACAO: Record<habitacao.SituacaoAcompanhamento, string> = {
  SEM_ACOMPANHAMENTO: 'bg-background text-texto-suave',
  AGUARDANDO_PRIMEIRA: 'bg-institucional/10 text-institucional',
  EM_DIA: 'bg-success/10 text-success',
  VENCENDO: 'bg-warning/15 text-warning-text',
  VENCIDA: 'bg-danger/10 text-danger',
};

const TOM_GRAVIDADE: Record<string, string> = {
  ADMINISTRATIVA: 'bg-background text-texto-suave',
  LEVE: 'bg-warning/15 text-warning-text',
  GRAVE: 'bg-danger/10 text-danger',
  GRAVISSIMA: 'bg-danger text-surface',
};

/**
 * Pós-entrega.
 *
 * A ordem da lista é o atraso, não o nome: quem sai a campo monta a rota da semana por aqui, e a
 * primeira linha precisa ser a família há mais tempo sem visita. Entregar a chave não encerra a
 * responsabilidade — é o que o Trabalho Social cobra na prestação de contas do convênio.
 */
export default async function PaginaAcompanhamento({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string }>;
}) {
  const { situacao } = await searchParams;
  const consulta = situacao ? `?situacao=${encodeURIComponent(situacao)}` : '';

  const [agenda, ocorrencias] = await Promise.all([
    apiFetch<Agenda>(`/pos-entrega/agenda${consulta}`),
    apiFetch<OcorrenciaAberta[]>('/pos-entrega/ocorrencias'),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Pós-entrega</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Acompanhamento pós-entrega
      </h1>
      <p className="mt-1 text-sm text-texto-suave">
        Primeira visita em até {agenda.periodicidade.prazoPrimeiraVisitaDias} dias da entrega,
        depois a cada {agenda.periodicidade.periodicidadeMeses} meses.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Cartao rotulo="Vencidas" valor={agenda.resumo.vencidas} tom="danger" filtro="VENCIDA" />
        <Cartao rotulo="Vencem em breve" valor={agenda.resumo.vencendo} tom="warning" filtro="VENCENDO" />
        <Cartao
          rotulo="Aguardando 1ª visita"
          valor={agenda.resumo.aguardandoPrimeira}
          filtro="AGUARDANDO_PRIMEIRA"
        />
        <Cartao rotulo="Em dia" valor={agenda.resumo.emDia} tom="success" filtro="EM_DIA" />
        <Cartao rotulo="Com ocorrência" valor={agenda.resumo.comOcorrenciaAberta} tom="danger" />
      </section>

      {ocorrencias.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-institucional">
            Ocorrências aguardando decisão
          </h2>
          <ul className="mt-3 space-y-2">
            {ocorrencias.map((ocorrencia) => (
              <li
                key={ocorrencia.id}
                className="rounded-lg border border-borda bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-texto">
                      {habitacao.rotuloTipoOcorrencia(ocorrencia.tipo)}
                      <span className="ml-2 text-sm font-normal text-texto-suave">
                        {ocorrencia.unidade.empreendimento.nome} · unidade{' '}
                        {ocorrencia.unidade.identificacao}
                      </span>
                    </p>
                    <p className="tabular text-xs text-texto-suave">
                      {ocorrencia.protocolo} · {habitacao.rotuloOrigemOcorrencia(ocorrencia.origem)}{' '}
                      · constatada em {data(ocorrencia.constatadaEm)}
                      {ocorrencia.unidade.familia && ` · ${ocorrencia.unidade.familia.responsavel}`}
                    </p>
                    <p className="mt-1 text-sm text-texto-suave">{ocorrencia.descricao}</p>
                    {ocorrencia.prazoRegularizacaoAte && (
                      <p
                        className={`tabular mt-1 text-xs font-semibold ${ocorrencia.prazoVencido ? 'text-danger' : 'text-texto-suave'}`}
                      >
                        Prazo para regularizar: {data(ocorrencia.prazoRegularizacaoAte)}
                        {ocorrencia.prazoVencido && ' — vencido'}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TOM_GRAVIDADE[ocorrencia.gravidade]}`}
                    >
                      {habitacao.rotuloGravidade(ocorrencia.gravidade)}
                    </span>
                    <span className="text-xs text-texto-suave">
                      {habitacao.rotuloSituacaoOcorrencia(ocorrencia.situacao)}
                    </span>
                    <Link
                      href={`/acompanhamento/${ocorrencia.unidade.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Abrir unidade
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-institucional">
            Unidades em acompanhamento
          </h2>
          {situacao && (
            <Link href="/acompanhamento" className="text-sm font-semibold text-primary hover:underline">
              Limpar filtro
            </Link>
          )}
        </div>

        {agenda.itens.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-borda bg-surface p-8 text-center text-sm text-texto-suave">
            {situacao
              ? 'Nenhuma unidade nesta situação.'
              : 'Nenhuma unidade entregue ainda. O acompanhamento começa quando a primeira chave é entregue.'}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-borda bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
                <tr>
                  <th className="px-4 py-3 font-semibold">Unidade</th>
                  <th className="px-4 py-3 font-semibold">Família</th>
                  <th className="px-4 py-3 font-semibold">Última visita</th>
                  <th className="px-4 py-3 font-semibold">Próxima</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody>
                {agenda.itens.map((linha) => (
                  <tr key={linha.unidadeId} className="border-b border-borda align-top last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/acompanhamento/${linha.unidadeId}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {linha.identificacao}
                      </Link>
                      <p className="text-xs text-texto-suave">{linha.empreendimento.nome}</p>
                      {linha.ocorrenciasAbertas > 0 && (
                        <p className="mt-1 text-xs font-semibold text-danger">
                          {linha.ocorrenciasAbertas} ocorrência(s) em aberto
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {linha.familia ? (
                        <>
                          <p className="text-texto">{linha.familia.responsavel}</p>
                          <p className="tabular text-xs text-texto-suave">{linha.familia.codigo}</p>
                        </>
                      ) : (
                        <span className="text-texto-suave">—</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-xs">
                      {linha.ultimaVisita ? (
                        <>
                          {data(linha.ultimaVisita.visitadaEm)}
                          <p className="text-texto-suave">
                            {linha.ultimaVisita.residenciaConfirmada
                              ? 'titular na unidade'
                              : 'titular não encontrado'}
                          </p>
                        </>
                      ) : (
                        <span className="text-texto-suave">nunca visitada</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-xs">
                      {data(linha.proximaVisitaEm)}
                      {linha.diasParaProxima !== null && (
                        <p className="text-texto-suave">
                          {linha.diasParaProxima < 0
                            ? `${Math.abs(linha.diasParaProxima)} dia(s) de atraso`
                            : `em ${linha.diasParaProxima} dia(s)`}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TOM_SITUACAO[linha.situacao]}`}
                      >
                        {habitacao.rotuloSituacaoAcompanhamento(linha.situacao)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Cartao({
  rotulo,
  valor,
  tom,
  filtro,
}: {
  rotulo: string;
  valor: number;
  tom?: 'danger' | 'warning' | 'success';
  filtro?: string;
}) {
  const cor =
    tom === 'danger'
      ? 'text-danger'
      : tom === 'warning'
        ? 'text-warning-text'
        : tom === 'success'
          ? 'text-success'
          : 'text-institucional';

  const conteudo = (
    <>
      <p className="text-xs font-semibold text-texto-suave">{rotulo}</p>
      <p className={`tabular mt-1 text-2xl font-extrabold ${cor}`}>{valor}</p>
    </>
  );

  return filtro ? (
    <Link
      href={`/acompanhamento?situacao=${filtro}`}
      className="rounded-lg border border-borda bg-surface p-4 transition hover:border-institucional"
    >
      {conteudo}
    </Link>
  ) : (
    <div className="rounded-lg border border-borda bg-surface p-4">{conteudo}</div>
  );
}
