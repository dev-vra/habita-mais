import { LogoHabita } from '@/components/brand/logo';
import { FormularioEntrada } from './formulario-entrada';

/**
 * Mesma arquitetura do Regulariza+: painel de promessa à esquerda, formulário à direita. Abaixo
 * de 1024 px o painel some — quem cadastra em campo entra pelo celular.
 *
 * A frase do painel não vende software, vende defesa: o que o gestor de Habitação teme não é
 * perder planilha, é não conseguir justificar a fila.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ sessao?: string }>;
}) {
  const { sessao } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-institucional p-12 text-surface lg:flex">
        <LogoHabita tamanho={44} escuro />

        <div className="max-w-xl">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Cada família, uma vez só
          </h1>
          <p className="mt-3 text-xl text-institucional-claro">
            A fila da casa própria, com nome, nota e data.
          </p>
          <p className="mt-6 text-base leading-relaxed text-surface/85">
            Critério publicado antes da inscrição, pontuação congelada no cálculo e cada convocação
            com ofício. É assim que a prefeitura consegue explicar a escolha — inclusive anos depois.
          </p>
        </div>

        <p className="max-w-lg text-sm leading-relaxed text-surface/70">
          Ambiente protegido. Dados tratados conforme a LGPD (Lei 13.709/2018); todo acesso e
          alteração são registrados e auditados, com rastreabilidade por usuário.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <LogoHabita tamanho={40} />
          </div>

          <h2 className="mt-8 font-display text-2xl font-bold text-institucional">
            Gestão Habitacional de Interesse Social
          </h2>
          <p className="mt-1 text-sm text-texto-suave">Acesso do servidor municipal.</p>

          {sessao === 'expirada' && (
            <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-text">
              Sua sessão expirou por inatividade. Entre de novo para continuar de onde parou.
            </p>
          )}

          <FormularioEntrada />

          <p className="mt-10 text-xs text-texto-suave">
            Padrão Digital de Governo · acesso auditado
          </p>
        </div>
      </section>
    </main>
  );
}
