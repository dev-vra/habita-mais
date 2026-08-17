import { cn } from '@/lib/cn';

/** O gradiente vem dos tokens em `style` — className com hex quebra o lint, e com razão. */
const BRILHO = {
  backgroundImage:
    'linear-gradient(90deg, var(--color-background) 25%, var(--color-borda) 37%, var(--color-background) 63%)',
  backgroundSize: '200% 100%',
} as const;

/** Barra cinza que pulsa. Usada só onde já se sabe a forma do que vai chegar. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('animate-brilho block h-2.5 rounded-full', className)}
      style={BRILHO}
    />
  );
}

/**
 * Esqueleto da tabela: repete a mesma grade das colunas reais, para a lista não pular de layout
 * quando os dados chegam. Cinco linhas — o suficiente para preencher a dobra sem prometer volume.
 */
export function SkeletonTabela({
  grade,
  colunas,
  linhas = 5,
}: {
  grade: string;
  colunas: number;
  linhas?: number;
}) {
  const larguras = ['w-[45%]', 'w-[70%]', 'w-[55%]', 'w-[60%]', 'w-[50%]'];

  return (
    <div aria-busy="true" className="divide-y divide-borda">
      {Array.from({ length: linhas }, (_, linha) => (
        <div
          key={linha}
          className="grid items-center gap-3 px-4 py-[13px]"
          style={{ gridTemplateColumns: grade }}
        >
          <span className="block space-y-1.5">
            <Skeleton className="w-[62%]" />
            <Skeleton className="h-2 w-[38%]" />
          </span>
          {Array.from({ length: Math.max(colunas - 1, 0) }, (_, coluna) => (
            <Skeleton key={coluna} className={larguras[coluna % larguras.length]} />
          ))}
        </div>
      ))}
    </div>
  );
}
