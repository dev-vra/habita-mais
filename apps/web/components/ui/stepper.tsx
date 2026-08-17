import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Etapa {
  rotulo: string;
  meta?: string;
  /** Marca a etapa com um ponto de atenção sem travar o avanço — o balcão não pode parar. */
  atencao?: boolean;
}

/**
 * Onde a família está — na inscrição e no cadastro. Concluído, atual e futuro se distinguem por
 * forma além de cor: ✓, halo âmbar e cinza vazado.
 */
export function Stepper({
  etapas,
  atual,
  aoIr,
}: {
  etapas: Etapa[];
  /** Índice 0-based da etapa corrente. */
  atual: number;
  /** Só a partir de client component: torna o passo navegável. */
  aoIr?: (indice: number) => void;
}) {
  return (
    <ol className="flex items-start gap-1">
      {etapas.map((etapa, indice) => {
        const concluida = indice < atual;
        const corrente = indice === atual;
        const conteudo = (
          <>
            <span
              aria-hidden
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-[11px] font-bold transition',
                concluida && 'bg-institucional/10 text-institucional',
                corrente && 'bg-primary text-surface shadow-[0_0_0_4px_rgba(151,98,15,0.12)]',
                !concluida && !corrente && 'bg-background text-texto-suave',
              )}
            >
              {concluida ? <Check size={13} strokeWidth={2.4} /> : indice + 1}
            </span>
            <span className="mt-1.5 block text-[12.5px] font-semibold leading-tight text-texto">
              {etapa.rotulo}
            </span>
            {etapa.meta && <span className="block text-[11px] text-texto-suave">{etapa.meta}</span>}
            {etapa.atencao && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-warning-text">
                <span aria-hidden className="size-1.5 rounded-full bg-warning" />
                falta preencher
              </span>
            )}
          </>
        );

        return (
          <li key={etapa.rotulo} className="flex min-w-0 flex-1 items-start gap-1">
            <div className="min-w-0 flex-1">
              {aoIr ? (
                <button
                  type="button"
                  onClick={() => aoIr(indice)}
                  aria-current={corrente ? 'step' : undefined}
                  className="w-full rounded-md text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30"
                >
                  {conteudo}
                </button>
              ) : (
                <div aria-current={corrente ? 'step' : undefined}>{conteudo}</div>
              )}
            </div>

            {indice < etapas.length - 1 && (
              <span aria-hidden className="mt-3 h-[1.5px] flex-1 bg-borda">
                <span
                  className={cn(
                    'animate-crescer block h-full origin-left',
                    concluida ? 'bg-institucional-claro' : 'bg-transparent',
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
