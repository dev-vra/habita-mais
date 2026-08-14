import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoHabita } from '@/components/brand/logo';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { sair } from '@/app/actions/auth';

interface ResumoNavegacao {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  programas: { id: string; nome: string; slug: string }[];
}

/**
 * Casca do sistema. Os contadores na navegação não são enfeite: fila e convocações pendentes são
 * o que muda sozinho entre uma sessão e outra, e o gestor precisa ver crescimento sem abrir a tela.
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/entrar');

  const resumo = await apiFetch<ResumoNavegacao>('/painel');

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col bg-institucional px-5 py-6 text-surface lg:flex">
        <LogoHabita tamanho={34} escuro />

        <nav className="mt-9 space-y-6 text-sm">
          <div>
            <p className="px-2 text-xs font-bold uppercase tracking-wider text-institucional-claro">
              Atendimento
            </p>
            <ul className="mt-2 space-y-0.5">
              <ItemNavegacao href="/painel" rotulo="Painel" />
              <ItemNavegacao href="/familias" rotulo="Famílias" contador={resumo.familias} />
              <ItemNavegacao href="/programas" rotulo="Programas" />
              {resumo.programas.map((programa) => (
                <ItemNavegacao
                  key={programa.id}
                  href={`/fila/${programa.slug}`}
                  rotulo={programa.nome}
                  contador={resumo.aptas}
                />
              ))}
            </ul>
          </div>

          <div>
            <p className="px-2 text-xs font-bold uppercase tracking-wider text-institucional-claro">
              Gestão
            </p>
            <ul className="mt-2 space-y-0.5">
              <ItemNavegacao
                href="/painel"
                rotulo="Aguardam convocação"
                contador={resumo.aguardandoConvocacao}
              />
              <ItemNavegacao href="/pendencias" rotulo="Pendências" />
            </ul>
          </div>
        </nav>

        <div className="mt-auto border-t border-surface/15 pt-4">
          <p className="text-sm font-semibold">{sessao.nome}</p>
          <p className="text-xs text-institucional-claro">{rotuloPerfil(sessao.perfil)}</p>
          <form action={sair} className="mt-3">
            <button
              type="submit"
              className="text-xs font-semibold text-surface/80 underline underline-offset-4 hover:text-surface"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}

function ItemNavegacao({
  href,
  rotulo,
  contador,
}: {
  href: string;
  rotulo: string;
  contador?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between rounded-md px-2 py-1.5 transition hover:bg-surface/10"
      >
        <span>{rotulo}</span>
        {contador !== undefined && (
          <span className="tabular text-xs text-institucional-claro">
            {contador.toLocaleString('pt-BR')}
          </span>
        )}
      </Link>
    </li>
  );
}

const PERFIS: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  GESTOR_HABITACAO: 'Gestor de Habitação',
  TECNICO_SOCIAL: 'Técnico social',
  ATENDENTE: 'Atendimento',
  FISCAL_OBRAS: 'Fiscal de obras',
  ANALISTA_MUTUARIO: 'Analista de mutuários',
  JURIDICO: 'Jurídico',
  FISCAL_AUDITOR: 'Controle interno',
};

function rotuloPerfil(perfil?: string): string {
  return perfil ? (PERFIS[perfil] ?? perfil) : 'Servidor';
}
