'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  ChevronDown,
  ChevronLeft,
  Home,
  Inbox,
  ListOrdered,
  Menu,
  Receipt,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LogoHabita, SimboloHabita } from '@/components/brand/logo';
import { BuscaGlobal, type Atalho } from '@/components/domain/busca-global';
import { sair } from '@/app/actions/auth';
import { cn } from '@/lib/cn';

export interface ItemMenu {
  rotulo: string;
  href: string;
  contador?: number;
}

export interface GrupoMenu {
  chave: string;
  rotulo: string;
  icone: keyof typeof ICONES;
  itens: ItemMenu[];
}

const ICONES = {
  atendimento: Users,
  filas: ListOrdered,
  producao: Home,
  mutuarios: Receipt,
  gestao: BarChart2,
  administracao: Settings,
  setor: Inbox,
} satisfies Record<string, LucideIcon>;

const CHAVE_COLAPSO = 'habita.menu.colapsado';
const CHAVE_GRUPOS = 'habita.menu.grupos';
const ABERTOS_POR_PADRAO = ['atendimento', 'filas'];

/**
 * Casca de navegação.
 *
 * Branca com borda fina, não o bloco escuro de largura fixa: a sidebar em eucalipto partia a tela
 * ao meio e roubava o contraste de quem realmente decide, que é o conteúdo. O peso institucional
 * volta em doses — item ativo, títulos, KPI.
 *
 * Os grupos são acordeão porque 18 links abertos ao mesmo tempo não são um menu, são uma lista de
 * tudo que existe. Só Atendimento e Filas abrem por padrão; o resto o servidor abre quando precisa,
 * e a escolha fica no `localStorage` — o mesmo servidor senta na mesma máquina todo dia.
 */
export function MenuLateral({
  grupos,
  atalhos,
  usuario,
}: {
  grupos: GrupoMenu[];
  atalhos: Atalho[];
  usuario: { nome: string; perfil: string };
}) {
  const caminho = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ABERTOS_POR_PADRAO.map((chave) => [chave, true])),
  );
  const [movelAberto, setMovelAberto] = useState(false);

  // Ler o `localStorage` no efeito, não na inicialização: no servidor ele não existe, e ler na
  // primeira renderização faria o HTML entregue divergir do que o cliente monta.
  useEffect(() => {
    setColapsado(localStorage.getItem(CHAVE_COLAPSO) === 'sim');

    const salvos = localStorage.getItem(CHAVE_GRUPOS);
    if (!salvos) return;
    try {
      setAbertos(JSON.parse(salvos) as Record<string, boolean>);
    } catch {
      localStorage.removeItem(CHAVE_GRUPOS);
    }
  }, []);

  // A tela atual manda: entrar num link de grupo fechado (pela busca, por um link colado) abre o
  // grupo, senão o menu mostra o servidor "em lugar nenhum".
  useEffect(() => {
    const grupoDaTela = grupos.find((grupo) => grupo.itens.some((item) => ativo(caminho, item.href)));
    if (grupoDaTela) setAbertos((atual) => ({ ...atual, [grupoDaTela.chave]: true }));
    setMovelAberto(false);
  }, [caminho, grupos]);

  function alternarColapso() {
    setColapsado((atual) => {
      localStorage.setItem(CHAVE_COLAPSO, atual ? 'nao' : 'sim');
      return !atual;
    });
  }

  function alternarGrupo(chave: string) {
    // Com a sidebar recolhida não há onde os itens caberem: clicar num grupo reabre e mostra.
    if (colapsado) {
      setColapsado(false);
      localStorage.setItem(CHAVE_COLAPSO, 'nao');
      setAbertos((atual) => {
        const proximos = { ...atual, [chave]: true };
        localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(proximos));
        return proximos;
      });
      return;
    }

    setAbertos((atual) => {
      const proximos = { ...atual, [chave]: !atual[chave] };
      localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(proximos));
      return proximos;
    });
  }

  const navegacao = (
    <>
      <div className={cn('flex items-center', colapsado ? 'justify-center px-2' : 'px-3.5')}>
        {colapsado ? <SimboloHabita tamanho={28} /> : <LogoHabita tamanho={28} />}
      </div>

      <div className={cn('mt-3', colapsado ? 'px-3' : 'px-3.5')}>
        <BuscaGlobal atalhos={atalhos} compacto={colapsado} />
      </div>

      <nav
        aria-label="Navegação principal"
        className={cn('mt-4 flex-1 overflow-y-auto pb-4', colapsado ? 'px-2' : 'px-3.5')}
      >
        {grupos.map((grupo) => {
          const Icone = ICONES[grupo.icone];
          const contemTela = grupo.itens.some((item) => ativo(caminho, item.href));
          const aberto = abertos[grupo.chave] ?? false;

          return (
            <div key={grupo.chave} className="mb-1">
              <button
                type="button"
                onClick={() => alternarGrupo(grupo.chave)}
                aria-expanded={aberto}
                aria-label={colapsado ? grupo.rotulo : undefined}
                title={colapsado ? grupo.rotulo : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md py-2 transition',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30',
                  colapsado ? 'justify-center px-0' : 'px-2.5',
                  contemTela ? 'text-institucional' : 'text-texto-suave/70 hover:bg-background',
                )}
              >
                <Icone size={16} strokeWidth={1.7} aria-hidden className="shrink-0" />
                {!colapsado && (
                  <>
                    <span className="flex-1 text-left text-[10.5px] font-bold uppercase tracking-[0.1em]">
                      {grupo.rotulo}
                    </span>
                    <ChevronDown
                      size={12}
                      strokeWidth={2}
                      aria-hidden
                      className={cn('shrink-0 transition-transform duration-150', !aberto && '-rotate-90')}
                    />
                  </>
                )}
              </button>

              {!colapsado && aberto && (
                <ul className="animate-surgir mt-0.5 space-y-px">
                  {grupo.itens.map((item) => {
                    const selecionado = ativo(caminho, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={selecionado ? 'page' : undefined}
                          className={cn(
                            'relative flex items-center gap-2 rounded-md py-[7px] pl-[11px] pr-2.5 text-[13px] transition',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-institucional/30',
                            selecionado
                              ? 'bg-institucional/8 font-semibold text-institucional'
                              : 'text-texto hover:bg-background',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'absolute left-0 h-[13px] w-[3px] rounded-full',
                              selecionado ? 'bg-primary' : 'bg-transparent',
                            )}
                          />
                          <span className="flex-1 truncate">{item.rotulo}</span>
                          {item.contador !== undefined && (
                            <span className="tabular shrink-0 text-[11.5px] text-texto-suave">
                              {item.contador.toLocaleString('pt-BR')}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className={cn('mt-auto pb-4', colapsado ? 'px-2' : 'px-3.5')}>
        <div
          className={cn(
            'rounded-lg bg-background/50 p-2.5',
            colapsado && 'flex justify-center bg-transparent p-0',
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-institucional/10 text-[11px] font-bold text-institucional"
            >
              {iniciais(usuario.nome)}
            </span>
            {!colapsado && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-texto">{usuario.nome}</p>
                <p className="truncate text-[11px] text-texto-suave">{usuario.perfil}</p>
              </div>
            )}
          </div>

          {!colapsado && (
            <form action={sair} className="mt-2">
              <button
                type="submit"
                className="rounded text-[11.5px] font-semibold text-texto-suave underline underline-offset-4 transition hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30"
              >
                Sair
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Barra do celular: a sidebar sai do fluxo e vira gaveta — 240px fixos numa tela de 360
          não deixam conteúdo. */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-borda bg-surface px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMovelAberto(true)}
          aria-label="Abrir menu"
          className="flex size-11 items-center justify-center rounded-md border border-borda text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
        >
          <Menu size={18} strokeWidth={1.7} />
        </button>
        <LogoHabita tamanho={24} />
      </div>

      {movelAberto && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMovelAberto(false)}
            className="animate-surgir absolute inset-0 bg-institucional-escuro/24"
          />
          <div className="animate-entrada-lateral relative flex h-full w-[260px] flex-col border-r border-borda bg-surface pt-4">
            {navegacao}
          </div>
        </div>
      )}

      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-borda bg-surface pt-[18px] lg:flex',
          'transition-[width] duration-[260ms] ease-[cubic-bezier(0.22,0.8,0.3,1)]',
          colapsado ? 'w-16' : 'w-60',
        )}
      >
        <button
          type="button"
          onClick={alternarColapso}
          aria-label={colapsado ? 'Expandir menu' : 'Recolher menu'}
          className="absolute right-[-13px] top-20 z-10 flex size-[26px] items-center justify-center rounded-md border border-borda bg-surface text-texto-suave shadow-[0_1px_3px_rgba(28,50,42,0.07)] transition hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30"
        >
          <ChevronLeft
            size={14}
            strokeWidth={2}
            aria-hidden
            className={cn('transition-transform duration-200', colapsado && 'rotate-180')}
          />
        </button>

        {navegacao}
      </aside>
    </>
  );
}

/** `/familias` não pode acender em `/familias/nova`? Pode — é a mesma seção. O painel é exato. */
function ativo(caminho: string, href: string): boolean {
  if (href === '/painel') return caminho === href;
  return caminho === href || caminho.startsWith(`${href}/`);
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}
