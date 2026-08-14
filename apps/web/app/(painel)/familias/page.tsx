import Link from 'next/link';
import { apiFetch } from '@/lib/api/server';
import { formatarReais } from '@/lib/status';

interface ItemLista {
  id: string;
  codigo: string;
  responsavel: string;
  cpfMascarado: string;
  pessoas: number;
  rendaPerCapita: number | null;
  fichaValidaAte: string | null;
  inscricoes: number;
}

export default async function PaginaFamilias({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  const { itens, total } = await apiFetch<{ itens: ItemLista[]; total: number }>(
    `/familias${query}`,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-texto-suave">Início › Famílias</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">Famílias</h1>
          <p className="mt-1 text-texto-suave">
            {total.toLocaleString('pt-BR')} {total === 1 ? 'família cadastrada' : 'famílias cadastradas'}
          </p>
        </div>
        <Link
          href="/familias/nova"
          className="rounded-md bg-primary px-4 py-2.5 font-semibold text-surface transition hover:bg-primary/90"
        >
          Cadastrar família
        </Link>
      </div>

      <form className="mt-6 flex gap-3" action="/familias">
        <input
          type="search"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome, CPF ou código"
          aria-label="Buscar família"
          className="w-full max-w-md rounded-md border border-borda bg-surface px-3 py-2.5 outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
        />
        <button
          type="submit"
          className="rounded-md border border-borda bg-surface px-4 py-2.5 font-semibold text-institucional transition hover:bg-background"
        >
          Buscar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-borda bg-surface">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-borda bg-background text-xs uppercase tracking-wide text-texto-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Código</th>
              <th scope="col" className="px-4 py-3 font-semibold">Responsável</th>
              <th scope="col" className="px-4 py-3 font-semibold">Composição</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Renda per capita</th>
              <th scope="col" className="px-4 py-3 font-semibold">Ficha</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Inscrições</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {itens.map((item) => (
              <tr key={item.id} className="hover:bg-background/60">
                <td className="tabular px-4 py-3 font-semibold text-texto-suave">
                  <Link href={`/familias/${item.id}`} className="hover:underline">
                    {item.codigo}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/familias/${item.id}`} className="font-semibold text-texto hover:underline">
                    {item.responsavel}
                  </Link>
                  <span className="tabular block text-xs text-texto-suave">{item.cpfMascarado}</span>
                </td>
                <td className="px-4 py-3 text-texto-suave">
                  {item.pessoas} {item.pessoas === 1 ? 'pessoa' : 'pessoas'}
                </td>
                <td className="tabular px-4 py-3 text-right text-texto-suave">
                  {item.rendaPerCapita === null ? '—' : formatarReais(item.rendaPerCapita)}
                </td>
                <td className="px-4 py-3">
                  <ValidadeFicha ate={item.fichaValidaAte} />
                </td>
                <td className="tabular px-4 py-3 text-right text-texto-suave">{item.inscricoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {itens.length === 0 && (
        <p className="mt-6 text-center text-texto-suave">
          Nenhuma família encontrada{busca ? ` para “${busca}”` : ''}.
        </p>
      )}
    </div>
  );
}

/** Ficha vencida é o que tira a família da fila no recadastramento — avisa antes de doer. */
function ValidadeFicha({ ate }: { ate: string | null }) {
  if (!ate) return <span className="text-warning-text">Sem ficha</span>;

  const validade = new Date(ate);
  const vencida = validade < new Date();
  return (
    <span className={vencida ? 'font-semibold text-warning-text' : 'text-texto-suave'}>
      {vencida ? 'Vencida em ' : 'Válida até '}
      {validade.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
    </span>
  );
}
