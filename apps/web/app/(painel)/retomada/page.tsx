import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { apiFetch } from '@/lib/api/server';
import { data } from '@/lib/formato';

interface CasoLista {
  id: string;
  protocolo: string;
  fase: habitacao.FaseRetomada;
  descricao: string;
  abertoEm: string;
  notificadoEm: string | null;
  formaNotificacao: string | null;
  prazoDefesaAte: string | null;
  defesaApresentadaEm: string | null;
  decisao: string | null;
  unidade: {
    id: string;
    identificacao: string;
    situacao: string;
    empreendimento: { nome: string; slug: string };
    familia: { id: string; codigo: string; responsavel: string } | null;
  };
  ocorrencia: { id: string; protocolo: string; tipo: string; gravidade: string } | null;
  podeDecidir: boolean;
  revelia: boolean;
  diasParaDefesa: number | null;
  impedimentos: string[];
}

const TOM_FASE: Record<habitacao.FaseRetomada, string> = {
  ABERTO: 'bg-background text-texto-suave',
  NOTIFICADO: 'bg-institucional/10 text-institucional',
  EM_DEFESA: 'bg-warning/15 text-warning-text',
  EM_ANALISE: 'bg-warning/15 text-warning-text',
  DECIDIDO: 'bg-success/10 text-success',
  ENCERRADO: 'bg-background text-texto-suave',
};

/**
 * Processos de retomada.
 *
 * A ordem é o prazo de defesa: decidir com prazo em curso anula o processo, e deixar o prazo
 * vencer sem seguir engaveta a família. As duas coisas dão errado do mesmo jeito — em silêncio.
 */
export default async function PaginaRetomada({
  searchParams,
}: {
  searchParams: Promise<{ encerrados?: string }>;
}) {
  const { encerrados } = await searchParams;
  const mostrarEncerrados = encerrados === 'true';

  const casos = await apiFetch<CasoLista[]>(
    `/retomada/casos${mostrarEncerrados ? '?encerrados=true' : ''}`,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Retomada</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            Processos de retomada
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-suave">
            O ato mais grave do sistema. Nenhuma decisão sai sem notificação válida, prazo de defesa
            cumprido e fundamentação — é o contraditório do art. 5º LV da Constituição.
          </p>
        </div>
        <Link
          href={mostrarEncerrados ? '/retomada' : '/retomada?encerrados=true'}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {mostrarEncerrados ? 'Ver só os em andamento' : 'Incluir encerrados'}
        </Link>
      </div>

      {casos.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-borda bg-surface p-8 text-center text-sm text-texto-suave">
          Nenhum processo de retomada. Eles nascem de uma ocorrência apurada e notificada, na página
          da unidade — nunca do nada.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {casos.map((caso) => (
            <li key={caso.id} className="rounded-lg border border-borda bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/retomada/${caso.id}`}
                    className="font-display text-lg font-bold text-institucional hover:underline"
                  >
                    {caso.protocolo}
                  </Link>
                  <p className="text-sm text-texto">
                    {caso.unidade.empreendimento.nome} · unidade {caso.unidade.identificacao}
                    {caso.unidade.familia && ` · ${caso.unidade.familia.responsavel}`}
                  </p>
                  <p className="mt-1 text-sm text-texto-suave">{caso.descricao}</p>
                  {caso.ocorrencia && (
                    <p className="tabular mt-1 text-xs text-texto-suave">
                      Origem: {caso.ocorrencia.protocolo} ·{' '}
                      {habitacao.rotuloTipoOcorrencia(caso.ocorrencia.tipo)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TOM_FASE[caso.fase]}`}
                  >
                    {habitacao.rotuloFaseRetomada(caso.fase)}
                  </span>
                  {caso.decisao && (
                    <span className="text-xs font-semibold text-texto-suave">
                      {habitacao.rotuloDecisaoRetomada(caso.decisao)}
                    </span>
                  )}
                  {caso.revelia && (
                    <span className="text-xs font-semibold text-warning-text">
                      Revelia registrada
                    </span>
                  )}
                </div>
              </div>

              <dl className="tabular mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-texto-suave">
                <div>
                  <dt className="inline font-semibold">Aberto: </dt>
                  <dd className="inline">{data(caso.abertoEm)}</dd>
                </div>
                {caso.notificadoEm && (
                  <div>
                    <dt className="inline font-semibold">Notificado: </dt>
                    <dd className="inline">
                      {data(caso.notificadoEm)}
                      {caso.formaNotificacao &&
                        ` (${habitacao.rotuloFormaNotificacao(caso.formaNotificacao)})`}
                    </dd>
                  </div>
                )}
                {caso.prazoDefesaAte && (
                  <div
                    className={
                      caso.diasParaDefesa !== null && caso.diasParaDefesa >= 0
                        ? 'font-semibold text-warning-text'
                        : undefined
                    }
                  >
                    <dt className="inline font-semibold">Defesa até: </dt>
                    <dd className="inline">
                      {data(caso.prazoDefesaAte)}
                      {caso.diasParaDefesa !== null &&
                        caso.diasParaDefesa >= 0 &&
                        ` — faltam ${caso.diasParaDefesa} dia(s)`}
                    </dd>
                  </div>
                )}
                {caso.defesaApresentadaEm && (
                  <div>
                    <dt className="inline font-semibold">Defesa em: </dt>
                    <dd className="inline">{data(caso.defesaApresentadaEm)}</dd>
                  </div>
                )}
              </dl>

              {caso.fase !== 'ENCERRADO' && caso.impedimentos.length > 0 && (
                <p className="mt-3 rounded-md bg-background px-3 py-2 text-xs text-texto-suave">
                  <strong>Próximo passo:</strong>{' '}
                  {habitacao.MOTIVOS_IMPEDIMENTO[
                    caso.impedimentos[0] as keyof typeof habitacao.MOTIVOS_IMPEDIMENTO
                  ] ?? 'Aguardando andamento.'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
