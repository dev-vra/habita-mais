'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { definirExigencias } from '@/app/actions/documentos';
import { Aviso } from '@/components/ui/formulario';

/**
 * O que o programa exige de quem se inscreve.
 *
 * A lista vale para as inscrições daqui para frente e para a conferência das existentes — mudar a
 * exigência não invalida documento já conferido, mas passa a cobrar o que faltar.
 */
export function Exigencias({
  programaId,
  slug,
  tipos,
  selecionadosIniciais,
}: {
  programaId: string;
  slug: string;
  tipos: { id: string; codigo: string; nome: string; escopo: string; orientacao?: string | null }[];
  selecionadosIniciais: string[];
}) {
  const [selecionados, setSelecionados] = useState<string[]>(selecionadosIniciais);
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const relevantes = tipos.filter((tipo) =>
    ['PESSOA', 'FAMILIA', 'INSCRICAO'].includes(tipo.escopo),
  );

  const alternar = (id: string) => {
    setSalvo(false);
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );
  };

  return (
    <section className="mt-8 rounded-lg border border-borda bg-surface p-5">
      <h2 className="font-display text-lg font-bold text-institucional">Documentação exigida</h2>
      <p className="mt-1 text-sm text-texto-suave">
        O que a família precisa apresentar. A conferência na inscrição usa esta lista, e o que
        faltar aparece como pendência.
      </p>

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}
      {salvo && !erro && (
        <div className="mt-3">
          <Aviso tom="info">Exigências salvas — {selecionados.length} documento(s).</Aviso>
        </div>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {relevantes.map((tipo) => (
          <li key={tipo.id}>
            <label className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-background">
              <input
                type="checkbox"
                checked={selecionados.includes(tipo.id)}
                onChange={() => alternar(tipo.id)}
                className="mt-0.5 size-4 rounded border-borda text-primary"
              />
              <span>
                <span className="text-texto">{tipo.nome}</span>
                {tipo.orientacao && (
                  <span className="block text-xs text-texto-suave">{tipo.orientacao}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await definirExigencias(programaId, selecionados, slug);
            setErro(resultado.erro);
            setSalvo(!resultado.erro);
            if (!resultado.erro) router.refresh();
          })
        }
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
      >
        Salvar exigências
      </button>
    </section>
  );
}
