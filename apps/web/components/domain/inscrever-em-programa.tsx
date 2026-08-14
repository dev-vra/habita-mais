'use client';

import { useState, useTransition } from 'react';
import { inscreverFamilia } from '@/app/actions/inscricoes';
import { Aviso } from '@/components/ui/formulario';

/**
 * Inscrição no balcão. Só aparecem programas com inscrições abertas — inscrever fora do período
 * publicado é justamente o que a API recusa, e oferecer a opção seria prometer o que não vale.
 */
export function InscreverEmPrograma({
  familiaId,
  programas,
}: {
  familiaId: string;
  programas: { id: string; nome: string }[];
}) {
  const [erro, setErro] = useState<string | undefined>();
  const [programaId, setProgramaId] = useState(programas[0]?.id ?? '');
  const [pendente, iniciar] = useTransition();

  if (programas.length === 0) {
    return (
      <p className="text-sm text-texto-suave">
        Nenhum programa com inscrições abertas no momento.
      </p>
    );
  }

  return (
    <div>
      {erro && <Aviso tom="danger">{erro}</Aviso>}
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={programaId}
          onChange={(e) => setProgramaId(e.target.value)}
          aria-label="Programa"
          className="rounded-md border border-borda bg-surface px-2.5 py-1.5 text-sm"
        >
          {programas.map((programa) => (
            <option key={programa.id} value={programa.id}>
              {programa.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const resultado = await inscreverFamilia(programaId, familiaId);
              setErro(resultado.erro);
            })
          }
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
        >
          Inscrever nesta fila
        </button>
      </div>
    </div>
  );
}
