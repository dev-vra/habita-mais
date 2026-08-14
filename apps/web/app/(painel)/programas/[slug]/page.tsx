import Link from 'next/link';
import { apiFetch } from '@/lib/api/server';
import { formatarNota, situacaoPrograma } from '@/lib/status';
import { AcoesPrograma } from './acoes-programa';
import { Exigencias } from './exigencias';
import { Recadastramento } from './recadastramento';

interface VersaoDetalhe {
  id: string;
  versao: number;
  situacao: string;
  publicadoEm: string | null;
  totalPontos: number;
  criterios: { codigo: string; rotulo: string; peso: number; tipo: string }[];
}

interface ProgramaDetalhe {
  id: string;
  nome: string;
  slug: string;
  fonteRecurso: string;
  vagas: number;
  situacao: string;
  inscricaoInicio: string;
  inscricaoFim: string;
  inscricoes: number;
  versoes: VersaoDetalhe[];
}

export default async function PaginaPrograma({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const programa = await apiFetch<ProgramaDetalhe>(`/programas/${slug}/detalhe`);
  const [parametros, candidatas, tipos, exigencias] = await Promise.all([
    apiFetch<{ salarioMinimo: number | null }>('/programas/parametros'),
    apiFetch<
      { inscricaoId: string; protocolo: string; familia: string; fichaVenceuEm: string; diasVencida: number }[]
    >(`/programas/${programa.id}/recadastramento`),
    apiFetch<{ id: string; codigo: string; nome: string; escopo: string; orientacao?: string | null }[]>(
      '/tipos-documento',
    ),
    apiFetch<{ tipoDocumentoId: string }[]>(`/programas/${programa.id}/exigencias`),
  ]);

  const publicada = programa.versoes.find((versao) => versao.situacao === 'PUBLICADA');
  const rascunho = programa.versoes.find((versao) => versao.situacao === 'RASCUNHO');

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">
        <Link href="/programas" className="hover:underline">
          Início › Programas
        </Link>{' '}
        › {programa.nome}
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        {programa.nome}
      </h1>
      <p className="mt-1 text-texto-suave">
        {programa.fonteRecurso} · {programa.vagas} unidades ·{' '}
        {situacaoPrograma(programa.situacao)} · inscrições até{' '}
        {new Date(programa.inscricaoFim).toLocaleDateString('pt-BR')}
      </p>

      {!publicada && (
        <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-text">
          Nenhuma versão de critério publicada. As inscrições não abrem até que os pesos sejam
          publicados — é o que permite dizer que a regra existia antes da fila.
        </div>
      )}

      <AcoesPrograma
        programaId={programa.id}
        slug={programa.slug}
        situacao={programa.situacao}
        temRascunho={Boolean(rascunho)}
        versaoPublicadaId={publicada?.id}
        salarioMinimo={parametros.salarioMinimo}
      />

      <Exigencias
        programaId={programa.id}
        slug={programa.slug}
        tipos={tipos}
        selecionadosIniciais={exigencias.map((exigencia) => exigencia.tipoDocumentoId)}
      />

      <Recadastramento programaId={programa.id} slug={programa.slug} candidatas={candidatas} />

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Versões de critério</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Publicada é imutável. Alterar peso exige nova versão — quem já foi pontuado mantém a
          versão que valia.
        </p>

        <ul className="mt-4 space-y-4">
          {programa.versoes.map((versao) => (
            <li key={versao.id} className="rounded-lg border border-borda bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-institucional">
                    Versão {versao.versao}
                  </h3>
                  <p className="text-xs text-texto-suave">
                    {versao.situacao === 'PUBLICADA' && versao.publicadoEm
                      ? `Publicada em ${new Date(versao.publicadoEm).toLocaleDateString('pt-BR')}`
                      : versao.situacao === 'RASCUNHO'
                        ? 'Rascunho — ainda não vale para pontuação'
                        : 'Substituída por versão mais recente'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-sm font-semibold text-texto-suave">
                    {formatarNota(versao.totalPontos)} pontos
                  </span>
                  {versao.situacao === 'RASCUNHO' && (
                    <Link
                      href={`/programas/${programa.slug}/criterios/${versao.id}`}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-surface transition hover:bg-primary/90"
                    >
                      Editar critérios
                    </Link>
                  )}
                </div>
              </div>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {versao.criterios.map((criterio) => (
                  <li
                    key={criterio.codigo}
                    className="flex justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm"
                  >
                    <span className="text-texto">{criterio.rotulo}</span>
                    <span className="tabular font-semibold text-institucional">{criterio.peso}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {programa.versoes.length === 0 && (
          <p className="mt-4 text-texto-suave">Nenhuma versão criada ainda.</p>
        )}
      </section>
    </div>
  );
}
