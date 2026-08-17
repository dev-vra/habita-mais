import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface DegrauTrilha {
  rotulo: string;
  href?: string;
}

/**
 * Cabeçalho único de todas as telas do painel: trilha, título e a linha de contexto que diz de
 * quanta coisa se está falando ("412 famílias cadastradas"). Fica grudado no topo porque a lista
 * abaixo rola por centenas de linhas, e sem ele o servidor perde de vista em que tela está.
 *
 * Só um primário por tela — se tudo é âmbar, nada é ação (Identidade §2).
 */
export function CabecalhoTela({
  trilha,
  titulo,
  subtitulo,
  acoes,
}: {
  trilha: DegrauTrilha[];
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-background/92 px-5 pb-4 pt-5 backdrop-blur lg:px-7">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <nav aria-label="Trilha de navegação">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-texto-suave">
              {trilha.map((degrau, indice) => (
                <li key={degrau.rotulo} className="flex items-center gap-1.5">
                  {indice > 0 && <span aria-hidden>›</span>}
                  {degrau.href ? (
                    <Link
                      href={degrau.href}
                      className="rounded transition hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30"
                    >
                      {degrau.rotulo}
                    </Link>
                  ) : (
                    <span aria-current="page">{degrau.rotulo}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <h1 className="mt-1 font-display text-[23px] font-extrabold leading-tight tracking-[-0.02em] text-institucional">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1 text-[12.5px] text-texto-suave">{subtitulo}</p>}
        </div>

        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{acoes}</div>}
      </div>
    </header>
  );
}

/** Corpo da tela: a mesma medida do cabeçalho, para o título nascer alinhado com a primeira linha. */
export function CorpoTela({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-6xl px-5 pb-12 pt-5 lg:px-7', className)}>{children}</div>
  );
}

/** Botão primário de cabeçalho — âmbar, 38px, e nunca mais de um por tela. */
export function AcaoPrimaria({
  href,
  children,
  onClick,
  tipo = 'button',
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  tipo?: 'button' | 'submit';
}) {
  const classe = cn(
    'inline-flex h-[38px] items-center rounded-md bg-primary px-4 text-[13px] font-bold text-surface',
    'transition hover:-translate-y-px hover:bg-primary/90 active:translate-y-0',
    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
  );

  if (href) {
    return (
      <Link href={href} className={classe}>
        {children}
      </Link>
    );
  }
  return (
    <button type={tipo} onClick={onClick} className={classe}>
      {children}
    </button>
  );
}

/** Secundária: mesma altura, peso institucional, sem roubar o âmbar. */
export function AcaoSecundaria({
  href,
  children,
  onClick,
  tipo = 'button',
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  tipo?: 'button' | 'submit';
}) {
  const classe = cn(
    'inline-flex h-[38px] items-center rounded-md border border-borda bg-surface px-4 text-[13px] font-bold text-institucional',
    'transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30',
  );

  if (href) {
    return (
      <Link href={href} className={classe}>
        {children}
      </Link>
    );
  }
  return (
    <button type={tipo} onClick={onClick} className={classe}>
      {children}
    </button>
  );
}
