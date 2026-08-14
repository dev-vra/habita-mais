import Link from 'next/link';
import { apiFetch } from '@/lib/api/server';
import { situacaoPrograma } from '@/lib/status';

interface ProgramaLista {
  id: string;
  nome: string;
  slug: string;
  fonteRecurso: string;
  vagas: number;
  situacao: string;
  inscricaoInicio: string;
  inscricaoFim: string;
  inscricoes: number;
}

export default async function PaginaProgramas() {
  const programas = await apiFetch<ProgramaLista[]>('/programas');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-texto-suave">Início › Programas</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">Programas</h1>
        </div>
        <Link
          href="/programas/novo"
          className="rounded-md bg-primary px-4 py-2.5 font-semibold text-surface transition hover:bg-primary/90"
        >
          Novo programa
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {programas.map((programa) => (
          <li key={programa.id} className="rounded-lg border border-borda bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/programas/${programa.slug}`}
                className="font-display text-lg font-bold text-institucional hover:underline"
              >
                {programa.nome}
              </Link>
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-texto-suave">
                {situacaoPrograma(programa.situacao)}
              </span>
            </div>
            <p className="mt-1 text-sm text-texto-suave">{programa.fonteRecurso}</p>
            <dl className="tabular mt-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-texto-suave">Vagas</dt>
                <dd className="font-semibold">{programa.vagas}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-suave">Inscrições</dt>
                <dd className="font-semibold">{programa.inscricoes}</dd>
              </div>
              <div>
                <dt className="text-xs text-texto-suave">Prazo</dt>
                <dd className="font-semibold">
                  {new Date(programa.inscricaoFim).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </dl>
            <Link
              href={`/fila/${programa.slug}`}
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Ver a fila
            </Link>
          </li>
        ))}
      </ul>

      {programas.length === 0 && (
        <p className="mt-8 text-center text-texto-suave">Nenhum programa cadastrado ainda.</p>
      )}
    </div>
  );
}
