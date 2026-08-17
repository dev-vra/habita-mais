import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoHabita } from '@/components/brand/logo';
import { BuscaGlobal } from '@/components/domain/busca-global';
import { ApiError, apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { sair } from '@/app/actions/auth';

interface ResumoNavegacao {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  /** Visitas de acompanhamento vencidas — o contador que puxa o servidor para o pós-entrega. */
  visitasVencidas?: number;
  programas: { id: string; nome: string; slug: string }[];
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
  DEFESA_CIVIL: 'Defesa Civil',
  SETOR_PARCEIRO: 'Setor parceiro',
};

/**
 * Casca do sistema.
 *
 * O menu mostra só o que o usuário pode abrir: oferecer link que devolve 403 faz o servidor
 * descobrir a própria permissão por tentativa e erro. As filas aparecem nomeadas, uma por programa
 * — "Fila" genérico não diz de qual programa se trata, e é sempre de um programa que se fala.
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/entrar');

  const podeHabitacao = sessao.capacidades.includes('ACESSAR_HABITACAO');
  const podeAdministrar = sessao.capacidades.includes('GERIR_USUARIOS');
  const podeParametros = sessao.capacidades.includes('GERIR_PARAMETROS');
  const podeAuditar = sessao.capacidades.includes('LER_AUDITORIA');
  const podeEncaminhar =
    sessao.capacidades.includes('ENCAMINHAR_SETOR') ||
    sessao.capacidades.includes('RESPONDER_ENCAMINHAMENTO');

  let resumo: ResumoNavegacao = { familias: 0, aptas: 0, aguardandoConvocacao: 0, programas: [] };

  if (podeHabitacao) {
    try {
      resumo = await apiFetch<ResumoNavegacao>('/painel');
    } catch (erro) {
      // Só 401 é sessão morta. Tratar 403 como expiração mandava para o login quem apenas não
      // tinha a capacidade — e o servidor via tela de login sem entender por quê.
      if (erro instanceof ApiError && erro.status === 401) redirect('/entrar?sessao=expirada');
      throw erro;
    }
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto bg-institucional px-5 py-6 text-surface lg:flex">
        <LogoHabita tamanho={34} escuro />

        {podeHabitacao && (
          <div className="mt-5">
            <BuscaGlobal />
          </div>
        )}

        <nav className="mt-8 space-y-6 text-sm">
          {podeHabitacao && (
            <>
              <Grupo titulo="Atendimento">
                <ItemNavegacao href="/painel" rotulo="Painel" />
                <ItemNavegacao href="/familias" rotulo="Famílias" contador={resumo.familias} />
                <ItemNavegacao href="/pendencias" rotulo="Pendências" />
              </Grupo>

              <Grupo titulo="Filas">
                {resumo.programas.map((programa) => (
                  <ItemNavegacao
                    key={programa.id}
                    href={`/fila/${programa.slug}`}
                    rotulo={programa.nome}
                    contador={resumo.aptas}
                  />
                ))}
                <ItemNavegacao href="/programas" rotulo="Programas e critérios" />
              </Grupo>

              <Grupo titulo="Produção">
                <ItemNavegacao href="/producao" rotulo="Empreendimentos e obras" />
                <ItemNavegacao
                  href="/acompanhamento"
                  rotulo="Pós-entrega"
                  contador={resumo.visitasVencidas}
                />
                <ItemNavegacao href="/retomada" rotulo="Retomada" />
              </Grupo>

              <Grupo titulo="Gestão">
                <ItemNavegacao href="/indicadores" rotulo="Indicadores" />
                {podeEncaminhar && (
                  <ItemNavegacao href="/encaminhamentos" rotulo="Encaminhamentos" />
                )}
                {podeAuditar && <ItemNavegacao href="/auditoria" rotulo="Trilha de auditoria" />}
              </Grupo>
            </>
          )}

          {!podeHabitacao && podeEncaminhar && (
            <Grupo titulo="Meu setor">
              <ItemNavegacao href="/encaminhamentos" rotulo="Encaminhamentos recebidos" />
            </Grupo>
          )}

          {(podeAdministrar || podeParametros) && (
            <Grupo titulo="Administração">
              {podeAdministrar && <ItemNavegacao href="/administracao/usuarios" rotulo="Usuários" />}
              {podeParametros && (
                <>
                  <ItemNavegacao href="/administracao/setores" rotulo="Setores" />
                  <ItemNavegacao href="/administracao/parametros" rotulo="Parâmetros" />
                </>
              )}
            </Grupo>
          )}
        </nav>

        <div className="mt-auto border-t border-surface/15 pt-4">
          <p className="text-sm font-semibold">{sessao.nome}</p>
          <p className="text-xs text-institucional-claro">
            {sessao.perfil ? (PERFIS[sessao.perfil] ?? sessao.perfil) : 'Servidor'}
          </p>
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

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 text-xs font-bold uppercase tracking-wider text-institucional-claro">
        {titulo}
      </p>
      <ul className="mt-2 space-y-0.5">{children}</ul>
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
        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition hover:bg-surface/10"
      >
        <span className="truncate">{rotulo}</span>
        {contador !== undefined && (
          <span className="tabular shrink-0 text-xs text-institucional-claro">
            {contador.toLocaleString('pt-BR')}
          </span>
        )}
      </Link>
    </li>
  );
}
