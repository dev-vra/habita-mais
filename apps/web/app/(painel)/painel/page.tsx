import Link from 'next/link';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { situacaoPrograma } from '@/lib/status';

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
  vencido: { rotulo: 'Vencido', classe: 'bg-danger/10 text-danger' },
  hoje: { rotulo: 'Último dia', classe: 'bg-warning/20 text-warning-text' },
  proximo: { rotulo: 'Prazo correndo', classe: 'bg-background text-texto-suave' },
} as const;

interface Resumo {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  convocacoesForaDeOrdem: number;
  programas: { id: string; nome: string; slug: string; vagas: number; situacao: string }[];
}

export default async function PaginaPainel() {
  const [sessao, resumo, decisoes] = await Promise.all([
    sessaoAtual(),
    apiFetch<Resumo>('/painel'),
    apiFetch<ItemDecisao[]>('/painel/decisoes'),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Painel</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        {saudacao()}, {primeiroNome(sessao?.nome)}.
      </h1>
      <p className="mt-1 text-texto-suave">
        {dataPorExtenso()}
        {decisoes.length > 0 &&
          ` · ${decisoes.length} ${decisoes.length === 1 ? 'decisão espera' : 'decisões esperam'} por você.`}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Contador rotulo="Famílias cadastradas" valor={resumo.familias} />
        <Contador rotulo="Na fila, aptas" valor={resumo.aptas} nota="em programas ativos" />
        <Contador
          rotulo="Aguardam comparecimento"
          valor={resumo.aguardandoConvocacao}
          nota="convocadas com prazo aberto"
        />
        <Contador
          rotulo="Convocações fora de ordem"
          valor={resumo.convocacoesForaDeOrdem}
          nota="exceções publicadas"
          destaque={resumo.convocacoesForaDeOrdem > 0}
        />
      </div>

      {decisoes.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-institucional">Precisa de decisão</h2>
          <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-surface">
            {decisoes.slice(0, 8).map((decisao) => {
              const urgencia = URGENCIAS[decisao.urgencia];
              return (
                <li key={`${decisao.tipo}-${decisao.referencia}`}>
                  <Link
                    href={decisao.link}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-background"
                  >
                    <span>
                      <span className="font-semibold text-texto">{decisao.assunto}</span>
                      <span className="tabular block text-xs text-texto-suave">
                        {decisao.familia} · {decisao.referencia} · {decisao.tipo}
                      </span>
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${urgencia.classe}`}>
                      {urgencia.rotulo} ·{' '}
                      {new Date(decisao.prazo).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {decisoes.length > 8 && (
            <p className="mt-2 text-sm text-texto-suave">
              e mais {decisoes.length - 8} com prazo correndo.
            </p>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-institucional">Programas</h2>
        <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-surface">
          {resumo.programas.map((programa) => (
            <li key={programa.id}>
              <Link
                href={`/fila/${programa.slug}`}
                className="flex items-center justify-between px-5 py-4 transition hover:bg-background"
              >
                <span>
                  <span className="font-semibold text-texto">{programa.nome}</span>
                  <span className="ml-2 text-sm text-texto-suave">
                    {programa.vagas} unidades · {situacaoPrograma(programa.situacao)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-primary">Ver a fila</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Contador({
  rotulo,
  valor,
  nota,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-lg border border-borda bg-surface p-5">
      <p className="text-sm text-texto-suave">{rotulo}</p>
      <p
        className={`tabular mt-1 font-display text-3xl font-extrabold ${
          destaque ? 'text-warning-text' : 'text-institucional'
        }`}
      >
        {valor.toLocaleString('pt-BR')}
      </p>
      {nota && <p className="mt-1 text-xs text-texto-suave">{nota}</p>}
    </div>
  );
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
