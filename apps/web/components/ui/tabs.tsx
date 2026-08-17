'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface Aba {
  chave: string;
  rotulo: string;
  conteudo: React.ReactNode;
}

/**
 * Abas da ficha. O conteúdo chega pronto do servidor — a aba só troca o que está à vista, sem
 * novo ir e vir de rede: numa conferência, alternar entre composição e documentos é constante.
 */
export function Tabs({ abas, inicial }: { abas: Aba[]; inicial?: string }) {
  const [ativa, setAtiva] = useState(inicial ?? abas[0]?.chave);
  const conteudo = abas.find((aba) => aba.chave === ativa)?.conteudo;

  return (
    <div>
      <div role="tablist" className="flex gap-4 overflow-x-auto border-b border-borda">
        {abas.map((aba) => {
          const selecionada = aba.chave === ativa;
          return (
            <button
              key={aba.chave}
              type="button"
              role="tab"
              id={`aba-${aba.chave}`}
              aria-selected={selecionada}
              aria-controls={`painel-${aba.chave}`}
              onClick={() => setAtiva(aba.chave)}
              className={cn(
                'relative shrink-0 pb-2.5 pt-1 text-[13px] transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30',
                selecionada ? 'font-bold text-institucional' : 'text-texto-suave hover:text-texto',
              )}
            >
              {aba.rotulo}
              {selecionada && (
                <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`painel-${ativa}`}
        aria-labelledby={`aba-${ativa}`}
        className="animate-surgir pt-4"
      >
        {conteudo}
      </div>
    </div>
  );
}
