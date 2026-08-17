'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SkeletonTabela } from '@/components/ui/skeleton';

export interface ColunaTabela {
  chave: string;
  rotulo: string;
  /** Trecho de `grid-template-columns`. Só declare quando o padrão apertar a coluna. */
  largura?: string;
  direita?: boolean;
}

export interface LinhaTabela {
  id: string;
  /** Para onde a linha leva. A primeira célula precisa conter o mesmo link, para o teclado. */
  href?: string;
  celulas: React.ReactNode[];
}

/**
 * Tabela padrão de todas as listas do painel.
 *
 * Grade em CSS grid, não `<table>`: com `minmax` a primeira coluna nunca colapsa em tela estreita
 * — foi um defeito real do primeiro corte, com o nome do responsável virando três letras por
 * linha. A linha inteira é clicável por atalho, mas o link de verdade mora na primeira célula:
 * quem navega por teclado ou abre em outra aba não depende do clique na linha.
 */
export function Tabela({
  colunas,
  linhas,
  carregando = false,
  vazio,
  aoAbrir,
  rodape,
  rotulo,
}: {
  colunas: ColunaTabela[];
  linhas: LinhaTabela[];
  carregando?: boolean;
  vazio?: React.ReactNode;
  /** Alternativa ao `href` da linha: abre drawer em vez de navegar (só a partir de client). */
  aoAbrir?: (id: string) => void;
  rodape?: React.ReactNode;
  rotulo: string;
}) {
  const router = useRouter();
  const grade = montarGrade(colunas);

  function abrir(evento: React.MouseEvent, linha: LinhaTabela) {
    // Clique num link ou botão dentro da linha é dele, não da linha: navegar por cima seria
    // ignorar o que a pessoa mirou.
    if ((evento.target as HTMLElement).closest('a, button')) return;
    if (aoAbrir) return aoAbrir(linha.id);
    if (linha.href) router.push(linha.href);
  }

  return (
    <div className="animate-subir overflow-hidden rounded-lg border border-borda bg-surface">
      <div role="table" aria-label={rotulo} aria-rowcount={linhas.length}>
        <div
          role="row"
          className="grid gap-3 border-b border-borda bg-background px-4 py-2.5"
          style={{ gridTemplateColumns: grade }}
        >
          {colunas.map((coluna) => (
            <div
              key={coluna.chave}
              role="columnheader"
              className={cn(
                'truncate text-[11px] font-bold uppercase tracking-wider text-texto-suave',
                coluna.direita && 'text-right',
              )}
            >
              {coluna.rotulo}
            </div>
          ))}
        </div>

        {carregando && <SkeletonTabela grade={grade} colunas={colunas.length} />}

        {!carregando && linhas.length === 0 && vazio}

        {!carregando && linhas.length > 0 && (
          <div className="divide-y divide-borda">
            {linhas.map((linha) => (
              <div
                key={linha.id}
                role="row"
                onClick={(evento) => abrir(evento, linha)}
                className={cn(
                  'grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                  'hover:bg-background/60 focus-within:bg-background/60',
                )}
                style={{ gridTemplateColumns: grade }}
              >
                {linha.celulas.map((celula, indice) => (
                  <div
                    key={colunas[indice]?.chave ?? indice}
                    role="cell"
                    className={cn('min-w-0', colunas[indice]?.direita && 'text-right')}
                  >
                    {celula}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {rodape}
    </div>
  );
}

/** Primeira célula do padrão: nome em cima, o que identifica embaixo. */
export function CelulaPrincipal({
  titulo,
  apoio,
  href,
}: {
  titulo: React.ReactNode;
  apoio?: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="min-w-0">
      {href ? (
        <Link
          href={href}
          onClick={(evento) => evento.stopPropagation()}
          className="block truncate text-[13.5px] font-semibold text-texto outline-none hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-institucional/30"
        >
          {titulo}
        </Link>
      ) : (
        <span className="block truncate text-[13.5px] font-semibold text-texto">{titulo}</span>
      )}
      {apoio && <span className="tabular block truncate text-[11.5px] text-texto-suave">{apoio}</span>}
    </div>
  );
}

/** Rodapé: quantos registros, em que página, e como andar. Tudo em query string. */
export function RodapeTabela({
  total,
  pagina,
  porPagina,
}: {
  total: number;
  pagina: number;
  porPagina: number;
}) {
  const paginas = Math.max(Math.ceil(total / porPagina), 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borda px-4 py-2.5">
      <p className="tabular text-[11.5px] text-texto-suave">
        {total.toLocaleString('pt-BR')} {total === 1 ? 'registro' : 'registros'} · página {pagina} de{' '}
        {paginas}
      </p>
      <div className="flex items-center gap-1.5">
        <BotaoPagina destino={pagina - 1} desabilitado={pagina <= 1} rotulo="Página anterior">
          <ChevronLeft size={15} strokeWidth={1.7} />
        </BotaoPagina>
        <BotaoPagina destino={pagina + 1} desabilitado={pagina >= paginas} rotulo="Próxima página">
          <ChevronRight size={15} strokeWidth={1.7} />
        </BotaoPagina>
      </div>
    </div>
  );
}

function BotaoPagina({
  destino,
  desabilitado,
  rotulo,
  children,
}: {
  destino: number;
  desabilitado: boolean;
  rotulo: string;
  children: React.ReactNode;
}) {
  const caminho = usePathname();
  const parametros = useSearchParams();

  if (desabilitado) {
    return (
      <span
        aria-disabled
        className="flex size-[33px] items-center justify-center rounded-md border border-borda text-texto-suave opacity-45"
      >
        {children}
      </span>
    );
  }

  const proximos = new URLSearchParams(parametros.toString());
  proximos.set('pagina', String(destino));

  return (
    <Link
      href={`${caminho}?${proximos.toString()}`}
      aria-label={rotulo}
      className="flex size-[33px] items-center justify-center rounded-md border border-borda text-texto-suave transition hover:border-institucional/40 hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30"
    >
      {children}
    </Link>
  );
}

function montarGrade(colunas: ColunaTabela[]): string {
  return colunas
    .map((coluna, indice) => {
      if (coluna.largura) return coluna.largura;
      if (indice === 0) return 'minmax(160px,1.7fr)';
      if (coluna.direita) return 'minmax(80px,auto)';
      return 'minmax(0,1fr)';
    })
    .join(' ');
}
