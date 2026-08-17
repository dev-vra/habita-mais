import { Skeleton, SkeletonTabela } from '@/components/ui/skeleton';

const GRADE = 'minmax(160px,1.7fr) minmax(0,1fr) minmax(0,132px) minmax(80px,auto)';

/**
 * O que fica no lugar da lista enquanto a página busca os dados.
 *
 * Repete a grade real da tabela: tela que pisca e depois pula de layout dá a impressão de que algo
 * quebrou, mesmo quando carregou certo.
 */
export function EsqueletoLista({ comKpi = true }: { comKpi?: boolean }) {
  return (
    <>
      <header className="border-b border-borda bg-background/92 px-5 pb-4 pt-5 lg:px-7">
        <div className="mx-auto max-w-6xl space-y-2">
          <Skeleton className="h-2 w-32" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-2 w-72" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-5 lg:px-7">
        {comKpi && (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
            {Array.from({ length: 3 }, (_, indice) => (
              <div key={indice} className="rounded-lg border border-borda bg-surface p-4">
                <Skeleton className="h-2 w-24" />
                <Skeleton className="mt-3 h-5 w-16" />
                <Skeleton className="mt-3 h-2 w-32" />
              </div>
            ))}
          </div>
        )}

        <div className="mt-7 overflow-hidden rounded-lg border border-borda bg-surface">
          <div className="border-b border-borda bg-background px-4 py-3">
            <Skeleton className="h-2 w-40" />
          </div>
          <SkeletonTabela grade={GRADE} colunas={4} />
        </div>
      </div>
    </>
  );
}
