'use client';

import { X } from 'lucide-react';
import { useRef } from 'react';
import { usePrenderFoco } from '@/lib/foco';

/**
 * Painel lateral de resumo. Existe para o servidor conferir uma linha da lista sem perder a lista
 * — clicar em 40 famílias e voltar 40 vezes é o que faz o atendimento demorar. A ficha completa
 * continua sendo uma página, com URL própria; o drawer é a espiada.
 */
export function Drawer({
  aberto,
  aoFechar,
  kicker,
  titulo,
  children,
  acoes,
}: {
  aberto: boolean;
  aoFechar: () => void;
  kicker?: string;
  titulo: string;
  children: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  usePrenderFoco(caixa, aberto, aoFechar);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={aoFechar}
        className="animate-surgir absolute inset-0 bg-institucional-escuro/24 backdrop-blur-[2px]"
      />

      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="animate-entrada-lateral relative flex h-full w-full max-w-[420px] flex-col border-l border-borda bg-surface shadow-[-18px_0_50px_rgba(20,51,43,0.10)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-borda px-5 py-4">
          <div className="min-w-0">
            {kicker && (
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-texto-suave">
                {kicker}
              </p>
            )}
            <h2 className="mt-0.5 truncate font-display text-[17px] font-extrabold text-institucional">
              {titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar painel"
            className="flex size-[30px] shrink-0 items-center justify-center rounded-md border border-borda text-texto-suave transition hover:bg-background hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30"
          >
            <X size={15} strokeWidth={1.7} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {acoes && (
          <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-borda px-5 py-3.5">
            {acoes}
          </footer>
        )}
      </div>
    </div>
  );
}

/** Par rótulo/valor — a mesma régua da ficha, para o drawer não inventar outro layout. */
export function ParDado({
  rotulo,
  children,
  tabular = false,
}: {
  rotulo: string;
  children: React.ReactNode;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-borda py-2.5 last:border-b-0">
      <span className="w-[132px] shrink-0 text-xs text-texto-suave">{rotulo}</span>
      <span className={`min-w-0 flex-1 text-[13px] text-texto ${tabular ? 'tabular' : ''}`}>
        {children}
      </span>
    </div>
  );
}
