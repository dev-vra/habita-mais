import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { PainelCaso } from '@/components/domain/painel-caso';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { data } from '@/lib/formato';

export interface AtoDoCaso {
  id: string;
  ordem: number;
  ocorridoEm: string;
  titulo: string;
  detalhe: string | null;
  autor: string;
}

export interface CasoDetalhe {
  id: string;
  protocolo: string;
  fase: habitacao.FaseRetomada;
  fundamentacaoLegal: string;
  descricao: string;
  abertoEm: string;
  notificadoEm: string | null;
  formaNotificacao: string | null;
  comprovanteKey: string | null;
  tentativasFrustradas: number;
  prazoDefesaAte: string | null;
  defesaApresentadaEm: string | null;
  defesaTeor: string | null;
  defesaApresentadaPor: string | null;
  defesaArquivoKey: string | null;
  decisao: string | null;
  decididoEm: string | null;
  decididoPor: string | null;
  fundamentacaoDecisao: string | null;
  encerradoEm: string | null;
  motivoEncerramento: string | null;
  unidade: {
    id: string;
    identificacao: string;
    endereco: string;
    situacao: string;
    entregueEm: string | null;
    empreendimento: { nome: string; slug: string };
    familia: { id: string; codigo: string; responsavel: string } | null;
  };
  ocorrencia: {
    id: string;
    protocolo: string;
    tipo: string;
    gravidade: string;
    descricao: string;
  } | null;
  atos: AtoDoCaso[];
  avaliacao: {
    podeDecidir: boolean;
    impedimentos: string[];
    motivos: string[];
    revelia: boolean;
    diasParaDefesa: number | null;
  };
  exigenciasPilha: readonly string[];
}

/**
 * O processo por inteiro.
 *
 * A linha do tempo vem primeiro porque é o que responde à pergunta que importa: a família foi
 * cientificada e teve chance de se defender? Tudo o mais — decisão, encaminhamento — depende dessa
 * resposta, e é ela que um juiz lê primeiro.
 */
export default async function PaginaCaso({ params }: { params: Promise<{ casoId: string }> }) {
  const { casoId } = await params;
  const [caso, sessao] = await Promise.all([
    apiFetch<CasoDetalhe>(`/retomada/casos/${casoId}`),
    sessaoAtual(),
  ]);

  const caminho = `/retomada/${casoId}`;
  const podeInstruir = sessao?.capacidades.includes('DECIDIR_OCORRENCIA') ?? false;
  const podeDecidir = sessao?.capacidades.includes('EMITIR_PARECER_JURIDICO') ?? false;
  const podeRegistrarDefesa = sessao?.capacidades.includes('ACESSAR_HABITACAO') ?? false;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">
        <Link href="/retomada" className="hover:underline">
          Retomada
        </Link>{' '}
        › {caso.protocolo}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            {caso.protocolo}
          </h1>
          <p className="mt-1 text-sm text-texto">
            <Link
              href={`/acompanhamento/${caso.unidade.id}`}
              className="font-semibold text-primary hover:underline"
            >
              Unidade {caso.unidade.identificacao}
            </Link>
            <span className="text-texto-suave">
              {' '}
              · {caso.unidade.empreendimento.nome} · {caso.unidade.endereco}
            </span>
          </p>
          {caso.unidade.familia && (
            <p className="tabular mt-0.5 text-sm text-texto-suave">
              {caso.unidade.familia.responsavel} · {caso.unidade.familia.codigo} · unidade entregue
              em {data(caso.unidade.entregueEm)}
            </p>
          )}
        </div>

        <div className="text-right">
          <span className="rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-texto-suave">
            {habitacao.rotuloFaseRetomada(caso.fase)}
          </span>
          {caso.avaliacao.revelia && (
            <p className="mt-1 text-xs font-semibold text-warning-text">Revelia registrada</p>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-borda bg-surface p-5">
        <h2 className="text-sm font-bold text-texto">Fundamento e objeto</h2>
        <p className="mt-2 text-sm text-texto">{caso.fundamentacaoLegal}</p>
        <p className="mt-2 text-sm text-texto-suave">{caso.descricao}</p>

        {caso.ocorrencia && (
          <p className="tabular mt-3 text-xs text-texto-suave">
            Origem:{' '}
            <Link
              href={`/acompanhamento/${caso.unidade.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {caso.ocorrencia.protocolo}
            </Link>{' '}
            · {habitacao.rotuloTipoOcorrencia(caso.ocorrencia.tipo)} ·{' '}
            {habitacao.rotuloGravidade(caso.ocorrencia.gravidade)}
          </p>
        )}
      </section>

      <section className="mt-6">
        <PainelCaso
          caso={caso}
          caminho={caminho}
          podeInstruir={podeInstruir}
          podeDecidir={podeDecidir}
          podeRegistrarDefesa={podeRegistrarDefesa}
        />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Linha do tempo</h2>
        <ol className="mt-3 space-y-3">
          {caso.atos.map((ato) => (
            <li key={ato.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-institucional text-xs font-bold text-surface">
                  {ato.ordem}
                </span>
                <span aria-hidden className="mt-1 w-px flex-1 bg-borda" />
              </div>
              <div className="flex-1 pb-3">
                <p className="text-sm font-semibold text-texto">{ato.titulo}</p>
                <p className="tabular text-xs text-texto-suave">
                  {data(ato.ocorridoEm)} · {ato.autor}
                </p>
                {ato.detalhe && (
                  <p className="mt-1 whitespace-pre-line text-sm text-texto-suave">{ato.detalhe}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {caso.fase !== 'ENCERRADO' && (
        <section className="mt-8 rounded-lg border border-borda bg-surface p-5">
          <h2 className="text-sm font-bold text-texto">
            O que o Jurídico precisa receber junto
          </h2>
          <p className="mt-1 text-xs text-texto-suave">
            Falta de comprovante de notificação derruba a ação por vício de forma, não no mérito.
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm text-texto-suave sm:grid-cols-2">
            {caso.exigenciasPilha.map((exigencia) => (
              <li key={exigencia} className="rounded-md border border-borda px-3 py-2 text-xs">
                {exigencia.replaceAll('_', ' ').toLowerCase()}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
