import { cn } from '@/lib/cn';
import { percentual } from '@/lib/formato';

/**
 * Barra de avanço com rótulo e número ao lado.
 *
 * O número acompanha a barra sempre: quem não distingue a cor, e quem imprime em preto e branco,
 * precisa ler a mesma informação. A barra sozinha é decoração.
 */
export function BarraProgresso({
  rotulo,
  percentual: valor,
  tom = 'primario',
  detalhe,
}: {
  rotulo: string;
  percentual: number;
  tom?: 'primario' | 'institucional' | 'alerta' | 'sucesso';
  detalhe?: string;
}) {
  const largura = Math.min(100, Math.max(0, valor));

  const cor = {
    primario: 'bg-primary',
    institucional: 'bg-institucional',
    alerta: 'bg-warning-text',
    sucesso: 'bg-success',
  }[tom];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-texto-suave">{rotulo}</p>
        <p className="tabular text-xs font-bold text-texto">{percentual(valor)}</p>
      </div>
      <div
        role="progressbar"
        aria-label={rotulo}
        aria-valuenow={largura}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 w-full overflow-hidden rounded bg-background"
      >
        <div className={cn('h-full rounded transition-all', cor)} style={{ width: `${largura}%` }} />
      </div>
      {detalhe && <p className="mt-1 text-xs text-texto-suave">{detalhe}</p>}
    </div>
  );
}
