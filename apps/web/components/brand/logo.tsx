import { cn } from '@/lib/cn';

/**
 * Símbolo do Habita+: a quadra cadastral do Regulariza+ — quadrado partido por arruamento branco
 * em quatro lotes — com um teto sobre o lote destacado. Mesma malha, outro assunto: um entrega o
 * lote, o outro entrega a casa em cima dele.
 *
 * Geometria herdada do irmão (Identidade §1): quadrado 84, raio 16,8; arruamento de 17,64
 * cruzando no centro. Abaixo de 24 px o arruamento engrossa e o quadrante escuro sai, porque a
 * faixa branca fecha e a quadra vira um bloco chapado.
 */
export function SimboloHabita({ tamanho = 40, className }: { tamanho?: number; className?: string }) {
  const miniatura = tamanho <= 24;
  const arruamento = miniatura ? 19.5 : 17.64;

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 84 84"
      className={className}
      role="img"
      aria-label="Habita+"
    >
      <rect width="84" height="84" rx="16.8" fill="var(--color-institucional)" />
      {!miniatura && <rect x="42" y="0" width="42" height="42" fill="var(--color-institucional-escuro)" />}
      {/* O telhado marca o lote ocupado — é a única diferença em relação à marca do Regulariza+. */}
      <path d="M52.5 27.3 L63 15.75 L73.5 27.3 Z" fill="var(--color-primary-claro)" />
      <rect x="55.65" y="27.3" width="14.7" height="12.6" fill="var(--color-primary-claro)" />
      <rect x={(84 - arruamento) / 2} y="0" width={arruamento} height="84" fill="#ffffff" />
      <rect x="0" y={(84 - arruamento) / 2} width="84" height={arruamento} fill="#ffffff" />
    </svg>
  );
}

/** Assinatura completa. O "+" vai sempre em âmbar, nunca na cor do texto. */
export function LogoHabita({
  tamanho = 40,
  escuro = false,
  className,
}: {
  tamanho?: number;
  escuro?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <SimboloHabita tamanho={tamanho} />
      <span
        className={cn(
          'font-display font-extrabold tracking-tight',
          escuro ? 'text-surface' : 'text-institucional',
        )}
        style={{ fontSize: tamanho * 0.6 }}
      >
        Habita<span className="text-primary-claro">+</span>
      </span>
    </span>
  );
}
