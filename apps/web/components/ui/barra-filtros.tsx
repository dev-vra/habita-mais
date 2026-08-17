'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { cn } from '@/lib/cn';

export interface Chip {
  valor: string;
  rotulo: string;
}

const ATRASO_MS = 300;

/**
 * Busca e recorte de uma lista. O estado mora na query string, não no React: o servidor manda o
 * link da tela filtrada para o colega, volta nela pelo histórico, e a página segue Server
 * Component. `pagina` é zerada a cada mudança — filtrar e continuar na página 7 devolve vazio.
 */
export function BarraFiltros({
  placeholder,
  chips,
  parametroChip = 'situacao',
  acessorio,
  comBusca = true,
}: {
  placeholder: string;
  chips?: Chip[];
  parametroChip?: string;
  acessorio?: React.ReactNode;
  /** Nem toda lista tem busca por texto — a trilha de auditoria filtra por entidade e período. */
  comBusca?: boolean;
}) {
  const caminho = usePathname();
  const parametros = useSearchParams();
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();

  const buscaAtual = parametros.get('busca') ?? '';
  const chipAtual = parametros.get(parametroChip) ?? '';
  const [termo, setTermo] = useState(buscaAtual);

  // Voltar pelo histórico ou limpar a busca por fora precisa refletir no campo.
  useEffect(() => setTermo(buscaAtual), [buscaAtual]);

  useEffect(() => {
    if (termo === buscaAtual) return;

    const temporizador = setTimeout(() => {
      iniciarTransicao(() => router.replace(montarUrl(caminho, parametros, 'busca', termo)));
    }, ATRASO_MS);

    return () => clearTimeout(temporizador);
  }, [termo, buscaAtual, caminho, parametros, router]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className={cn('relative min-w-[240px] flex-1', !comBusca && 'hidden')}>
        <Search
          size={15}
          strokeWidth={1.7}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-suave"
        />
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-full rounded-md border border-borda bg-surface pl-9 pr-3 text-[13px] outline-none transition focus:border-institucional focus:ring-2 focus:ring-institucional/30"
        />
      </div>

      {chips?.map((chip) => {
        const ativo = chipAtual === chip.valor;
        return (
          <button
            key={chip.valor || 'todos'}
            type="button"
            aria-pressed={ativo}
            onClick={() =>
              iniciarTransicao(() =>
                router.replace(montarUrl(caminho, parametros, parametroChip, ativo ? '' : chip.valor)),
              )
            }
            className={cn(
              'h-9 rounded-md border px-3.5 text-[12.5px] font-semibold transition',
              'focus:outline-none focus:ring-2 focus:ring-institucional/30',
              ativo
                ? 'border-institucional/35 bg-institucional/8 text-institucional'
                : 'border-borda bg-surface text-texto-suave hover:bg-background',
            )}
          >
            {chip.rotulo}
          </button>
        );
      })}

      {acessorio}
    </div>
  );
}

function montarUrl(
  caminho: string,
  parametros: URLSearchParams | ReadonlyURLSearchParamsLike,
  chave: string,
  valor: string,
): string {
  const proximos = new URLSearchParams(parametros.toString());
  if (valor) proximos.set(chave, valor);
  else proximos.delete(chave);
  proximos.delete('pagina');

  const consulta = proximos.toString();
  return consulta ? `${caminho}?${consulta}` : caminho;
}

interface ReadonlyURLSearchParamsLike {
  toString(): string;
}
