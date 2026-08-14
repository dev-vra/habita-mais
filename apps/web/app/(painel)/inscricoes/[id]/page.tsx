import Link from 'next/link';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { apiFetch } from '@/lib/api/server';
import { formatarNota, statusInscricao } from '@/lib/status';
import { PainelDocumental, type ItemDocumental, type ResumoDocumental } from '@/components/domain/painel-documental';
import { sessaoAtual } from '@/lib/auth/session';
import { AcoesInscricao } from './acoes-inscricao';

interface Inscricao {
  id: string;
  protocolo: string;
  situacao: string;
  motivoSituacao: string | null;
  inscritaEm: string;
  programa: { id: string; nome: string; slug: string; situacao: string };
  familia: { id: string; codigo: string; responsavel: string; fichaValidaAte: string | null };
  pontuacao: {
    total: number;
    totalMaximo: number;
    versaoCriterio: number;
    calculadaEm: string;
    itens: { rotulo: string; pontos: number; peso: number; observacao?: string }[];
  } | null;
  pendencias: {
    id: string;
    tipo: string;
    descricao: string;
    prazoAte: string;
    situacao: string;
    vencida: boolean;
  }[];
  convocacoes: {
    id: string;
    numeroOficio: string;
    emitidaEm: string;
    prazoComparecimentoAte: string;
    foraDeOrdem: boolean;
    motivoExcecao: string | null;
    desfecho: string | null;
  }[];
  recursos: {
    id: string;
    protocolo: string;
    apresentadoEm: string;
    prazoRespostaAte: string;
    decisao: string | null;
  }[];
}

/** A tela onde o caso é trabalhado: pendência, convocação e desfecho, com a nota sempre à vista. */
export default async function PaginaInscricao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inscricao = await apiFetch<Inscricao>(`/inscricoes/${id}`);
  const status = statusInscricao(inscricao.situacao);

  const [documental, tipos, sessao] = await Promise.all([
    apiFetch<{ itens: ItemDocumental[]; resumo: ResumoDocumental }>(
      `/documentos/situacao/FAMILIA/${inscricao.familia.id}?programaId=${inscricao.programa.id}`,
    ),
    apiFetch<{ id: string; codigo: string; nome: string }[]>('/tipos-documento'),
    sessaoAtual(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">
        <Link href={`/fila/${inscricao.programa.slug}`} className="hover:underline">
          Início › Fila › {inscricao.programa.nome}
        </Link>{' '}
        › {inscricao.protocolo}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-institucional">
          <Link href={`/familias/${inscricao.familia.id}`} className="hover:underline">
            {inscricao.familia.responsavel}
          </Link>
        </h1>
        <EtiquetaStatus rotulo={status.rotulo} tom={status.tom} />
      </div>
      <p className="tabular mt-1 text-texto-suave">
        {inscricao.protocolo} · inscrita em{' '}
        {new Date(inscricao.inscritaEm).toLocaleDateString('pt-BR')}
        {inscricao.motivoSituacao && ` · ${inscricao.motivoSituacao}`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-lg border border-borda bg-surface p-6">
          <h2 className="font-display text-lg font-bold text-institucional">Pontuação vigente</h2>
          {inscricao.pontuacao ? (
            <>
              <p className="tabular mt-2 font-display text-4xl font-extrabold text-institucional">
                {formatarNota(inscricao.pontuacao.total)}
                <span className="ml-1 text-base font-normal text-texto-suave">
                  de {formatarNota(inscricao.pontuacao.totalMaximo)}
                </span>
              </p>
              <p className="mt-1 text-xs text-texto-suave">
                congelada em{' '}
                {new Date(inscricao.pontuacao.calculadaEm).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}{' '}
                · critério v{inscricao.pontuacao.versaoCriterio}
              </p>
              <ul className="mt-4 space-y-1 text-sm">
                {inscricao.pontuacao.itens.map((item) => (
                  <li key={item.rotulo} className="flex justify-between gap-3">
                    <span className={item.pontos === 0 ? 'text-texto-suave' : 'text-texto'}>
                      {item.rotulo}
                      {item.observacao && (
                        <span className="block text-xs text-warning-text">{item.observacao}</span>
                      )}
                    </span>
                    <span className="tabular font-semibold">
                      {formatarNota(item.pontos)}
                      <span className="text-texto-suave"> / {item.peso}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-texto-suave">Sem pontuação calculada.</p>
          )}

          {inscricao.convocacoes.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-texto">Convocações</h3>
              <ul className="mt-2 space-y-3 text-sm">
                {inscricao.convocacoes.map((convocacao) => (
                  <li key={convocacao.id} className="rounded-md bg-background p-3">
                    <p className="tabular font-semibold text-texto">
                      <a
                        href={`/api/oficios/${convocacao.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {convocacao.numeroOficio}
                      </a>
                      {convocacao.foraDeOrdem && (
                        <span className="ml-2 rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning-text">
                          fora de ordem
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-texto-suave">
                      Emitida em {new Date(convocacao.emitidaEm).toLocaleDateString('pt-BR')} ·
                      comparecer até{' '}
                      {new Date(convocacao.prazoComparecimentoAte).toLocaleDateString('pt-BR')}
                      {convocacao.desfecho && ` · ${convocacao.desfecho}`}
                    </p>
                    {convocacao.motivoExcecao && (
                      <p className="mt-1 text-xs text-warning-text">{convocacao.motivoExcecao}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {inscricao.recursos.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-texto">Recursos</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {inscricao.recursos.map((recurso) => (
                  <li key={recurso.id} className="tabular text-texto-suave">
                    {recurso.protocolo} ·{' '}
                    {recurso.decisao
                      ? recurso.decisao.toLowerCase()
                      : `resposta até ${new Date(recurso.prazoRespostaAte).toLocaleDateString('pt-BR')}`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="space-y-6">
          <PainelDocumental
            titulo="Documentação exigida pelo programa"
            escopo="FAMILIA"
            referenciaId={inscricao.familia.id}
            itens={documental.itens}
            resumo={documental.resumo}
            tipos={tipos}
            caminho={`/inscricoes/${inscricao.id}`}
            podeConferir={sessao?.capacidades.includes('VALIDAR_DOCUMENTACAO') ?? false}
          />

          <AcoesInscricao
          inscricaoId={inscricao.id}
          programaId={inscricao.programa.id}
          situacao={inscricao.situacao}
          pendencias={inscricao.pendencias}
          convocacaoAberta={inscricao.convocacoes.find((c) => !c.desfecho)?.id}
          />
        </div>
      </div>
    </div>
  );
}
