'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { baixarPorRecadastramento } from '@/app/actions/programas';
import { Aviso } from '@/components/ui/formulario';

interface Candidata {
  inscricaoId: string;
  protocolo: string;
  familia: string;
  fichaVenceuEm: string;
  diasVencida: number;
}

/**
 * Baixa por recadastramento.
 *
 * Nada é baixado sozinho: a lista mostra quem está com ficha vencida além da carência, e o gestor
 * marca quem sai. Uma rotina que cancela inscrição à meia-noite é o tipo de coisa que ninguém
 * consegue explicar depois para a família que perdeu a vez.
 */
export function Recadastramento({
  programaId,
  slug,
  candidatas,
}: {
  programaId: string;
  slug: string;
  candidatas: Candidata[];
}) {
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [erro, setErro] = useState<string>();
  const [baixadas, setBaixadas] = useState<number>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  if (candidatas.length === 0) return null;

  const alternar = (id: string) =>
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );

  return (
    <section className="mt-8 rounded-lg border border-warning/40 bg-warning/5 p-5">
      <h2 className="font-display text-lg font-bold text-warning-text">
        Recadastramento — {candidatas.length}{' '}
        {candidatas.length === 1 ? 'inscrição com ficha vencida' : 'inscrições com ficha vencida'}
      </h2>
      <p className="mt-1 text-sm text-warning-text">
        A ficha venceu há mais de 30 dias e não foi revalidada. Baixar move a inscrição para
        cancelada, com motivo — e ela volta se a família se reapresentar.
      </p>

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}
      {baixadas !== undefined && !erro && (
        <div className="mt-3">
          <Aviso tom="info">
            {baixadas} {baixadas === 1 ? 'inscrição baixada' : 'inscrições baixadas'}.
          </Aviso>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {candidatas.map((candidata) => (
          <li key={candidata.inscricaoId}>
            <label className="flex flex-wrap items-center gap-3 rounded-md bg-surface px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={selecionadas.includes(candidata.inscricaoId)}
                onChange={() => alternar(candidata.inscricaoId)}
                className="size-4 rounded border-borda text-primary"
              />
              <span className="font-semibold text-texto">{candidata.familia}</span>
              <span className="tabular text-xs text-texto-suave">
                {candidata.protocolo} · vencida há {candidata.diasVencida} dias (
                {new Date(candidata.fichaVenceuEm).toLocaleDateString('pt-BR')})
              </span>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={pendente || selecionadas.length === 0}
        onClick={() =>
          iniciar(async () => {
            const resultado = await baixarPorRecadastramento(programaId, slug, selecionadas);
            setErro(resultado.erro);
            setBaixadas(resultado.dados?.baixadas);
            setSelecionadas([]);
            if (!resultado.erro) router.refresh();
          })
        }
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-50"
      >
        Baixar {selecionadas.length > 0 ? `${selecionadas.length} selecionada(s)` : 'selecionadas'}
      </button>
    </section>
  );
}
