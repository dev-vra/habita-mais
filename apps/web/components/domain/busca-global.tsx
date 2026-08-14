'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Resultado {
  familias: { id: string; codigo: string; nome: string; cpfMascarado: string }[];
  inscricoes: { id: string; protocolo: string; situacao: string; nome: string }[];
}

const ATRASO_MS = 300;

/**
 * Busca do topo: CPF, nome ou protocolo — os três jeitos de alguém chegar no balcão.
 * O resultado sai pelo BFF; o CPF volta mascarado, porque a lista de busca não precisa do número.
 */
export function BuscaGlobal() {
  const [termo, setTermo] = useState('');
  const [resultado, setResultado] = useState<Resultado>();

  useEffect(() => {
    if (termo.trim().length < 3) {
      setResultado(undefined);
      return;
    }

    const temporizador = setTimeout(async () => {
      const resposta = await fetch(`/api/busca?q=${encodeURIComponent(termo)}`);
      if (resposta.ok) setResultado((await resposta.json()) as Resultado);
    }, ATRASO_MS);

    return () => clearTimeout(temporizador);
  }, [termo]);

  const vazio = resultado && resultado.familias.length === 0 && resultado.inscricoes.length === 0;

  return (
    <div className="relative">
      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Buscar por CPF, nome ou protocolo"
        aria-label="Busca global"
        className="w-full rounded-md border border-surface/20 bg-surface/10 px-3 py-2 text-sm text-surface placeholder:text-surface/60 focus:border-surface/40 focus:outline-none"
      />

      {(resultado || vazio) && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-borda bg-surface text-texto shadow-lg">
          {vazio && <p className="px-3 py-2 text-sm text-texto-suave">Nada encontrado.</p>}

          {resultado?.familias.map((familia) => (
            <Link
              key={familia.id}
              href={`/familias/${familia.id}`}
              onClick={() => setTermo('')}
              className="block px-3 py-2 text-sm hover:bg-background"
            >
              <span className="font-semibold">{familia.nome}</span>
              <span className="tabular block text-xs text-texto-suave">
                {familia.codigo} · {familia.cpfMascarado}
              </span>
            </Link>
          ))}

          {resultado?.inscricoes.map((inscricao) => (
            <Link
              key={inscricao.id}
              href={`/inscricoes/${inscricao.id}`}
              onClick={() => setTermo('')}
              className="block px-3 py-2 text-sm hover:bg-background"
            >
              <span className="font-semibold">{inscricao.protocolo}</span>
              <span className="block text-xs text-texto-suave">
                {inscricao.nome} · {inscricao.situacao.toLowerCase()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
