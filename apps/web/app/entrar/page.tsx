import { LogoHabita } from '@/components/brand/logo';
import { Aviso } from '@/components/ui/formulario';
import { FormularioEntrada } from './formulario-entrada';

/**
 * Entrada do servidor: formulário à esquerda, contexto à direita.
 *
 * O painel de promessa deixou de ser um bloco escuro de página inteira — ele competia com o campo
 * de senha, que é a única coisa que se faz aqui. Abaixo de 1024 px o painel some: quem cadastra em
 * campo entra pelo celular.
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
    <main className="grid min-h-screen bg-surface lg:[grid-template-columns:repeat(2,minmax(390px,1fr))]">
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <LogoHabita tamanho={32} />

          <h1 className="mt-8 font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-institucional">
            Gestão Habitacional de Interesse Social
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-texto-suave">
            Acesso restrito a servidores do município. Todo acesso fica na trilha de auditoria, com
            nome, data e endereço de origem.
          </p>

          {sessao === 'expirada' && (
            <div className="mt-5">
              <Aviso tom="warning">
                Sua sessão expirou por inatividade. Entre de novo para continuar de onde parou.
              </Aviso>
            </div>
          )}

          <FormularioEntrada />

          <p className="mt-10 text-[11.5px] text-texto-suave">
            Padrão Digital de Governo · dados tratados conforme a LGPD (Lei 13.709/2018).
          </p>
        </div>
      </section>

      <section className="hidden flex-col overflow-hidden lg:flex">
        {/* Foto sem filtro por cima — o rosto da família é o que vende, não o texto. */}
        <div className="relative flex-1 overflow-hidden">
          <img
            src="/assets/familia-habita.jpg"
            alt="Família sorridente em frente à casa própria, segurando o certificado de conquista do Habita+"
            className="absolute inset-0 size-full object-cover object-[center_20%]"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-institucional-escuro to-transparent" />
        </div>

        <div className="animate-subir bg-institucional-escuro px-12 py-8">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-surface/60">
            O que este sistema garante
          </p>

          <ul className="mt-4 grid grid-cols-3 gap-5">
            <ItemGarantia
              titulo="Critério publicado antes da inscrição"
              texto="A regra da fila é versionada e publicada. Quem se inscreve sabe por qual régua vai ser medido."
            />
            <ItemGarantia
              titulo="Pontuação congelada no cálculo"
              texto="O snapshot guarda os fatos e a versão de critério. Recalcular depois não reordena quem já foi convocada."
            />
            <ItemGarantia
              titulo="Cada convocação com ofício"
              texto="Convocar fora de ordem exige motivo escrito, que vai nominal para a trilha e é publicado junto ao ranking."
            />
          </ul>
        </div>
      </section>
    </main>
  );
}

function ItemGarantia({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <li>
      <p className="text-[13px] font-bold text-surface">{titulo}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-surface/70">{texto}</p>
    </li>
  );
}
