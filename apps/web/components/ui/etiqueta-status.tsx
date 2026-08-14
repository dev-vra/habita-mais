import { cn } from '@/lib/cn';
import type { TomStatus } from '@/lib/status';

const TONS: Record<TomStatus, { ponto: string; texto: string; fundo: string }> = {
  neutro: { ponto: 'bg-texto-suave', texto: 'text-texto-suave', fundo: 'bg-background' },
  sucesso: { ponto: 'bg-success', texto: 'text-success', fundo: 'bg-success/10' },
  atencao: { ponto: 'bg-warning', texto: 'text-warning-text', fundo: 'bg-warning/15' },
  perigo: { ponto: 'bg-danger', texto: 'text-danger', fundo: 'bg-danger/10' },
  institucional: {
    ponto: 'bg-institucional',
    texto: 'text-institucional',
    fundo: 'bg-institucional/10',
  },
};

/** Ponto + rótulo: a cor reforça, nunca carrega sozinha a informação. */
export function EtiquetaStatus({ rotulo, tom }: { rotulo: string; tom: TomStatus }) {
  const estilo = TONS[tom];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        estilo.fundo,
        estilo.texto,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', estilo.ponto)} />
      {rotulo}
    </span>
  );
}
