'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { usePrenderFoco } from '@/lib/foco';

export interface Atalho {
  tipo: 'Tela' | 'Fila' | 'Ação';
  rotulo: string;
  apoio?: string;
  href: string;
}

interface Resultado {
  familias: { id: string; codigo: string; nome: string; cpfMascarado: string }[];
  inscricoes: { id: string; protocolo: string; situacao: string; nome: string }[];
}

interface Item {
  chave: string;
  tipo: string;
  rotulo: string;
  apoio?: string;
  href: string;
}

const ATRASO_MS = 300;
const MINIMO_REMOTO = 3;

/**
 * Busca do topo e paleta de comandos.
 *
 * Os três jeitos de alguém chegar no balcão — CPF, nome ou protocolo — mais as telas que a
 * capacidade do usuário já permite abrir. A paleta não inventa acesso: os atalhos chegam prontos
 * do layout, que é quem conhece `sessao.capacidades`. O CPF volta mascarado do BFF, porque a
 * lista de busca não precisa do número.
 */
export function BuscaGlobal({ atalhos, compacto = false }: { atalhos: Atalho[]; compacto?: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState('');
  const [remoto, setRemoto] = useState<Resultado>();
  const [selecionado, setSelecionado] = useState(0);
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => {
    setAberta(false);
    setTermo('');
    setRemoto(undefined);
    setSelecionado(0);
  }, []);

  usePrenderFoco(caixa, aberta, fechar);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setAberta((atual) => !atual);
      }
    }

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  useEffect(() => {
    if (termo.trim().length < MINIMO_REMOTO) {
      setRemoto(undefined);
      return;
    }

    const temporizador = setTimeout(async () => {
      const resposta = await fetch(`/api/busca?q=${encodeURIComponent(termo)}`);
      if (resposta.ok) setRemoto((await resposta.json()) as Resultado);
    }, ATRASO_MS);

    return () => clearTimeout(temporizador);
  }, [termo]);

  const itens = useMemo<Item[]>(() => {
    const busca = termo.trim().toLowerCase();
    const locais = atalhos
      .filter((atalho) => !busca || atalho.rotulo.toLowerCase().includes(busca))
      .map((atalho) => ({ chave: `atalho-${atalho.href}`, ...atalho }));

    const familias = (remoto?.familias ?? []).map((familia) => ({
      chave: `familia-${familia.id}`,
      tipo: 'Família',
      rotulo: familia.nome,
      apoio: `${familia.codigo} · ${familia.cpfMascarado}`,
      href: `/familias/${familia.id}`,
    }));

    const inscricoes = (remoto?.inscricoes ?? []).map((inscricao) => ({
      chave: `inscricao-${inscricao.id}`,
      tipo: 'Inscrição',
      rotulo: inscricao.protocolo,
      apoio: `${inscricao.nome} · ${inscricao.situacao.toLowerCase()}`,
      href: `/inscricoes/${inscricao.id}`,
    }));

    return [...familias, ...inscricoes, ...locais.slice(0, busca ? 8 : 6)];
  }, [atalhos, remoto, termo]);

  useEffect(() => setSelecionado(0), [termo]);

  function navegar(item: Item | undefined) {
    if (!item) return;
    fechar();
    router.push(item.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Buscar (Ctrl+K)"
        className={cn(
          'flex h-9 items-center rounded-md border border-borda bg-background/60 text-texto-suave transition',
          'hover:border-institucional/30 hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30',
          compacto ? 'w-9 justify-center' : 'w-full gap-2 px-3',
        )}
      >
        <Search size={15} strokeWidth={1.7} aria-hidden />
        {!compacto && (
          <>
            <span className="flex-1 truncate text-left text-[12.5px]">Nome, CPF ou código</span>
            <kbd className="rounded border border-borda bg-surface px-1.5 py-0.5 text-[10px] font-semibold">
              ⌘K
            </kbd>
          </>
        )}
      </button>

      {aberta && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <button
            type="button"
            aria-label="Fechar busca"
            onClick={fechar}
            className="animate-surgir absolute inset-0 bg-institucional-escuro/24 backdrop-blur-[3px]"
          />

          <div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-label="Busca"
            className="animate-subir relative w-full max-w-[560px] overflow-hidden rounded-lg border border-borda bg-surface shadow-[0_18px_50px_rgba(20,51,43,0.16)]"
          >
            <div className="flex items-center gap-2.5 border-b border-borda px-4">
              <Search size={17} strokeWidth={1.7} aria-hidden className="shrink-0 text-texto-suave" />
              <input
                autoFocus
                value={termo}
                onChange={(evento) => setTermo(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'ArrowDown') {
                    evento.preventDefault();
                    setSelecionado((atual) => Math.min(atual + 1, itens.length - 1));
                  } else if (evento.key === 'ArrowUp') {
                    evento.preventDefault();
                    setSelecionado((atual) => Math.max(atual - 1, 0));
                  } else if (evento.key === 'Enter') {
                    evento.preventDefault();
                    navegar(itens[selecionado]);
                  }
                }}
                placeholder="Nome, CPF, protocolo ou tela"
                aria-label="Busca global"
                className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-texto-suave"
              />
            </div>

            <ul className="max-h-[52vh] overflow-y-auto py-1.5">
              {itens.length === 0 && (
                <li className="px-4 py-6 text-center text-[12.5px] text-texto-suave">
                  Nada encontrado para “{termo}”.
                </li>
              )}

              {itens.map((item, indice) => (
                <li key={item.chave}>
                  <button
                    type="button"
                    onMouseEnter={() => setSelecionado(indice)}
                    onClick={() => navegar(item)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                      indice === selecionado ? 'bg-background' : 'hover:bg-background/60',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-texto">
                        {item.rotulo}
                      </span>
                      {item.apoio && (
                        <span className="tabular block truncate text-[11.5px] text-texto-suave">
                          {item.apoio}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-texto-suave">
                      {item.tipo}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="border-t border-borda px-4 py-2 text-[11px] text-texto-suave">
              ↑↓ navega · Enter abre · Esc fecha
            </p>
          </div>
        </div>
      )}
    </>
  );
}
