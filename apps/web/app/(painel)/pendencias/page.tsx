import Link from 'next/link';
import { apiFetch } from '@/lib/api/server';

interface PendenciaAberta {
  id: string;
  tipo: string;
  descricao: string;
  prazoAte: string;
  vencida: boolean;
  inscricaoId: string;
  protocolo: string;
  responsavel: string;
  programa: string;
}

/** Fila de trabalho do balcão: quem está suspensa da fila e por quê, ordenada pelo prazo. */
export default async function PaginaPendencias() {
  const pendencias = await apiFetch<PendenciaAberta[]>('/pendencias');
  const vencidas = pendencias.filter((pendencia) => pendencia.vencida).length;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">Início › Pendências</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Pendências documentais
      </h1>
      <p className="mt-1 text-texto-suave">
        {pendencias.length} em aberto
        {vencidas > 0 && ` · ${vencidas} com prazo vencido`}
      </p>

      <ul className="mt-6 space-y-3">
        {pendencias.map((pendencia) => (
          <li
            key={pendencia.id}
            className={`rounded-lg border bg-surface p-4 ${
              pendencia.vencida ? 'border-danger/40' : 'border-borda'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/inscricoes/${pendencia.inscricaoId}`}
                  className="font-semibold text-texto hover:underline"
                >
                  {pendencia.responsavel}
                </Link>
                <p className="tabular text-xs text-texto-suave">
                  {pendencia.protocolo} · {pendencia.programa}
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  pendencia.vencida ? 'text-danger' : 'text-texto-suave'
                }`}
              >
                {pendencia.vencida ? 'Vencida em ' : 'Prazo até '}
                {new Date(pendencia.prazoAte).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="mt-2 text-sm text-texto">
              <span className="font-semibold">{pendencia.tipo}</span> — {pendencia.descricao}
            </p>
          </li>
        ))}
      </ul>

      {pendencias.length === 0 && (
        <p className="mt-8 text-center text-texto-suave">
          Nenhuma pendência em aberto. Nada segurando a fila.
        </p>
      )}
    </div>
  );
}
