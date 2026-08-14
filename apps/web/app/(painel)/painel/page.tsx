import Link from 'next/link';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { situacaoPrograma } from '@/lib/status';

interface Resumo {
  familias: number;
  aptas: number;
  aguardandoConvocacao: number;
  convocacoesForaDeOrdem: number;
  programas: { id: string; nome: string; slug: string; vagas: number; situacao: string }[];
}

export default async function PaginaPainel() {
  const [sessao, resumo] = await Promise.all([sessaoAtual(), apiFetch<Resumo>('/painel')]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">Início › Painel</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        {saudacao()}, {primeiroNome(sessao?.nome)}.
      </h1>
      <p className="mt-1 text-texto-suave">{dataPorExtenso()}</p>

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
