import Link from 'next/link';
import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { situacaoPrograma } from '@/lib/status';
import { cn } from '@/lib/cn';

interface ItemDecisao {
  tipo: string;
  assunto: string;
  familia: string;
  referencia: string;
  prazo: string;
  urgencia: 'vencido' | 'hoje' | 'proximo';
  link: string;
}

const URGENCIAS = {
  vencido: { rotulo: 'Vencido', classe: 'text-danger font-semibold' },
  hoje: { rotulo: 'Último dia', classe: 'text-warning-text font-semibold' },
  proximo: { rotulo: 'Prazo', classe: 'text-texto-suave' },
} as const;

interface Resumo {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  convocacoesForaDeOrdem: number;
  programas: { id: string; nome: string; slug: string; vagas: number; situacao: string }[];
}

const COLUNAS = [
  { chave: 'assunto', rotulo: 'Assunto' },
  { chave: 'familia', rotulo: 'Família' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,132px)' },
  { chave: 'prazo', rotulo: 'Prazo', largura: 'minmax(110px,auto)', direita: true },
];

/** Abrir o dia sabendo o que exige decisão — e nada além disso na primeira dobra. */
export default async function PaginaPainel() {
  const [sessao, resumo, decisoes] = await Promise.all([
    sessaoAtual(),
    apiFetch<Resumo>('/painel'),
    apiFetch<ItemDecisao[]>('/painel/decisoes'),
  ]);

  const visiveis = decisoes.slice(0, 8);

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Painel' }]}
        titulo={`${saudacao()}, ${primeiroNome(sessao?.nome)}.`}
        subtitulo={
          <>
            {dataPorExtenso()}
            {decisoes.length > 0 &&
              ` · ${decisoes.length} ${decisoes.length === 1 ? 'decisão espera' : 'decisões esperam'} por você.`}
          </>
        }
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi
            rotulo="Famílias cadastradas"
            valor={resumo.familias}
            nota="ficha social ativa"
            indice={0}
          />
          <CartaoKpi
            rotulo="Na fila, aptas"
            valor={resumo.aptas}
            nota="em programas ativos"
            proporcao={proporcao(resumo.aptas, resumo.familias)}
            indice={1}
          />
          <CartaoKpi
            rotulo="Aguardam comparecimento"
            valor={resumo.aguardandoConvocacao}
            nota="convocadas com prazo aberto"
            proporcao={proporcao(resumo.aguardandoConvocacao, resumo.aptas)}
            indice={2}
          />
          <CartaoKpi
            rotulo="Convocações fora de ordem"
            valor={resumo.convocacoesForaDeOrdem}
            nota="exceções publicadas"
            alerta={resumo.convocacoesForaDeOrdem > 0}
            proporcao={proporcao(resumo.convocacoesForaDeOrdem, resumo.aguardandoConvocacao)}
            indice={3}
          />
        </GradeKpi>

        <section className="mt-8">
          <h2 className="font-display text-[15.5px] font-bold text-institucional">
            Precisa de decisão
          </h2>

          <div className="mt-3">
            <Tabela
              rotulo="Decisões com prazo"
              colunas={COLUNAS}
              linhas={visiveis.map((decisao) => ({
                id: `${decisao.tipo}-${decisao.referencia}`,
                href: decisao.link,
                celulas: [
                  <CelulaPrincipal
                    key="assunto"
                    titulo={decisao.assunto}
                    apoio={`${decisao.familia} · ${decisao.referencia}`}
                    href={decisao.link}
                  />,
                  <span key="familia" className="block truncate text-[13px] text-texto-suave">
                    {decisao.familia}
                  </span>,
                  <EtiquetaStatus key="situacao" rotulo={decisao.tipo} tom="neutro" />,
                  <span key="prazo" className={cn('tabular text-[13px]', URGENCIAS[decisao.urgencia].classe)}>
                    {URGENCIAS[decisao.urgencia].rotulo} · {diaMes(decisao.prazo)}
                  </span>,
                ],
              }))}
              vazio={
                <EstadoVazio
                  titulo="Nenhuma decisão com prazo aberto"
                  descricao="Quando uma pendência, recurso ou convocação vencer, ela aparece aqui antes de doer."
                />
              }
            />
          </div>

          {decisoes.length > visiveis.length && (
            <p className="mt-2 text-[12.5px] text-texto-suave">
              e mais {decisoes.length - visiveis.length} com prazo correndo.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-[15.5px] font-bold text-institucional">Programas</h2>
          <ul className="animate-subir mt-3 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-surface">
            {resumo.programas.map((programa) => (
              <li key={programa.id}>
                <Link
                  href={`/fila/${programa.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-background/60 focus:outline-none focus-visible:bg-background"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-texto">
                      {programa.nome}
                    </span>
                    <span className="tabular block text-[11.5px] text-texto-suave">
                      {programa.vagas} unidades · {situacaoPrograma(programa.situacao)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12.5px] font-bold text-primary">Ver a fila</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </CorpoTela>
    </>
  );
}

function proporcao(parte: number, todo: number): number {
  return todo > 0 ? parte / todo : 0;
}

function diaMes(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  return hora < 18 ? 'Boa tarde' : 'Boa noite';
}

function primeiroNome(nome?: string): string {
  return nome?.split(' ')[0] ?? 'servidor';
}

function dataPorExtenso(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
