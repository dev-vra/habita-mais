import { apiFetch } from '@/lib/api/server';

interface Evento {
  id: string;
  quando: string;
  operacao: string;
  entidade: string;
  entidadeId: string | null;
  ator: string;
  tipoAtor: string;
  ip: string | null;
  diff: Record<string, unknown> | null;
}

interface Trilha {
  total: number;
  pagina: number;
  paginas: number;
  entidades: { entidade: string; eventos: number }[];
  eventos: Evento[];
}

const OPERACOES: Record<string, { rotulo: string; classe: string }> = {
  INSERT: { rotulo: 'Criou', classe: 'bg-success/10 text-success' },
  UPDATE: { rotulo: 'Alterou', classe: 'bg-institucional/10 text-institucional' },
  DELETE: { rotulo: 'Removeu', classe: 'bg-danger/10 text-danger' },
  READ: { rotulo: 'Consultou', classe: 'bg-background text-texto-suave' },
};

/**
 * Trilha de auditoria. O que aparece aqui é o que a prefeitura mostra ao controle externo — por
 * isso o diff vem mascarado da origem, e não há ação nenhuma nesta tela: ler é tudo que se faz.
 */
export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtro = await searchParams;
  const query = new URLSearchParams(
    Object.entries(filtro).filter(([, valor]) => Boolean(valor)) as [string, string][],
  );
  const trilha = await apiFetch<Trilha>(`/auditoria?${query.toString()}`);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">Início › Trilha de auditoria</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Trilha de auditoria
      </h1>
      <p className="mt-1 text-texto-suave">
        {trilha.total.toLocaleString('pt-BR')} eventos registrados. A trilha é append-only: nada
        aqui pode ser editado ou apagado, nem pelo sistema.
      </p>

      <form className="mt-6 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/auditoria">
        <select
          name="entidade"
          defaultValue={filtro.entidade ?? ''}
          aria-label="Entidade"
          className="rounded-md border border-borda bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas as entidades</option>
          {trilha.entidades.map((item) => (
            <option key={item.entidade} value={item.entidade}>
              {item.entidade} ({item.eventos})
            </option>
          ))}
        </select>
        <select
          name="operacao"
          defaultValue={filtro.operacao ?? ''}
          aria-label="Operação"
          className="rounded-md border border-borda bg-surface px-3 py-2 text-sm"
        >
          <option value="">Toda operação</option>
          {Object.entries(OPERACOES).map(([valor, { rotulo }]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="de"
          defaultValue={filtro.de}
          aria-label="De"
          className="rounded-md border border-borda bg-surface px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="ate"
          defaultValue={filtro.ate}
          aria-label="Até"
          className="rounded-md border border-borda bg-surface px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-borda bg-surface px-4 py-2 text-sm font-semibold text-institucional hover:bg-background"
        >
          Filtrar
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {trilha.eventos.map((evento) => {
          const operacao = OPERACOES[evento.operacao] ?? {
            rotulo: evento.operacao,
            classe: 'bg-background text-texto-suave',
          };
          return (
            <li key={evento.id} className="rounded-lg border border-borda bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${operacao.classe}`}>
                  {operacao.rotulo}
                </span>
                <span className="font-semibold text-texto">{evento.entidade}</span>
                <span className="tabular text-xs text-texto-suave">
                  {new Date(evento.quando).toLocaleString('pt-BR')} · {evento.ator}
                  {evento.ip && ` · ${evento.ip}`}
                </span>
              </div>

              {evento.diff && (
                <pre className="tabular mt-2 overflow-x-auto rounded-md bg-background p-3 text-xs text-texto-suave">
                  {JSON.stringify(evento.diff, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>

      {trilha.eventos.length === 0 && (
        <p className="mt-8 text-center text-texto-suave">Nenhum evento para este filtro.</p>
      )}

      {trilha.paginas > 1 && (
        <p className="mt-4 text-center text-sm text-texto-suave">
          Página {trilha.pagina} de {trilha.paginas}
        </p>
      )}
    </div>
  );
}
