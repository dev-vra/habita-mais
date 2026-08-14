import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { BarraProgresso } from '@/components/domain/barra-progresso';
import { NovaObra } from '@/components/domain/nova-obra';
import { PainelObra } from '@/components/domain/painel-obra';
import { PainelUnidades } from '@/components/domain/painel-unidades';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { data, moeda } from '@/lib/formato';

export interface EtapaDetalhe {
  id: string;
  codigo: string;
  nome: string;
  peso: number;
  executado: number;
  previstaAte: string;
  concluidaEm?: string;
  situacao: 'CONCLUIDA' | 'NO_PRAZO' | 'PROXIMA_DO_PRAZO' | 'ATRASADA';
  diasParaPrazo: number;
}

export interface MedicaoDetalhe {
  id: string;
  protocolo: string;
  numero: number;
  periodoInicio: string;
  periodoFim: string;
  percentualAcumulado: number;
  valor: number;
  situacao: string;
  fiscalNome: string;
  aprovadaEm: string | null;
  aprovadaPor: string | null;
  motivo: string | null;
}

export interface ObraDetalhe {
  id: string;
  descricao: string;
  executoraNome: string;
  executoraCnpj: string;
  numeroContrato: string;
  artRrt: string | null;
  valorContrato: number;
  valorMedido: number;
  situacao: string;
  motivoParalisacao: string | null;
  inicioPrevisto: string;
  terminoPrevisto: string;
  resumo: {
    percentualFisico: number;
    percentualFinanceiro: number;
    descompasso: number;
    pagamentoAdiantado: boolean;
    etapasAtrasadas: number;
    saldoAMedir: number;
  };
  etapas: EtapaDetalhe[];
  medicoes: MedicaoDetalhe[];
  medicoesPendentes: number;
}

export interface UnidadeDetalhe {
  id: string;
  protocolo: string;
  identificacao: string;
  quadra: string | null;
  lote: string | null;
  endereco: string;
  tipologia: string | null;
  areaConstruida: number | null;
  matricula: string | null;
  valorAvaliado: number | null;
  situacao: habitacao.SituacaoUnidade;
  entregueEm: string | null;
  motivoSituacao: string | null;
  familia: { id: string; codigo: string; responsavel: string } | null;
  transicoes: habitacao.SituacaoUnidade[];
  exigeAcompanhamento: boolean;
}

interface Detalhe {
  id: string;
  protocolo: string;
  nome: string;
  slug: string;
  endereco: string;
  bairro: string;
  cep: string | null;
  situacao: string;
  unidadesPrevistas: number;
  previsaoEntrega: string | null;
  entregueEm: string | null;
  observacao: string | null;
  programa: { id: string; nome: string; slug: string } | null;
  convenio: {
    id: string;
    protocolo: string;
    objeto: string;
    orgaoRepassador: string;
    valorRepasse: number;
    vigenciaFim: string;
    situacao: string;
  } | null;
  obras: ObraDetalhe[];
  unidades: UnidadeDetalhe[];
  candidatas: CandidataEntrega[];
  resumoUnidades: Record<habitacao.SituacaoUnidade, number>;
}

export interface CandidataEntrega {
  familiaId: string;
  codigo: string;
  responsavel: string;
  protocolo: string;
  situacao: string;
}

/**
 * Um empreendimento por inteiro: contrato, cronograma, medição e casa.
 *
 * O que fica no topo é o que decide a próxima ação — descompasso entre pago e executado, etapa
 * atrasada, medição esperando aprovação. O resto é consulta.
 */
export default async function PaginaEmpreendimento({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [detalhe, sessao] = await Promise.all([
    apiFetch<Detalhe>(`/producao/empreendimentos/${slug}`),
    sessaoAtual(),
  ]);

  const caminho = `/producao/${slug}`;
  const podeGerirObra = sessao?.capacidades.includes('GERIR_OBRA') ?? false;
  const podeMedir = sessao?.capacidades.includes('REGISTRAR_MEDICAO') ?? false;
  const podeEntregar = sessao?.capacidades.includes('ENTREGAR_UNIDADE') ?? false;

  const entregues = detalhe.resumoUnidades.ENTREGUE ?? 0;
  const cadastradas = detalhe.unidades.length;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">
        <Link href="/producao" className="hover:underline">
          Produção
        </Link>{' '}
        › {detalhe.nome}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            {detalhe.nome}
          </h1>
          <p className="tabular mt-1 text-sm text-texto-suave">
            {detalhe.protocolo} · {detalhe.endereco}, {detalhe.bairro}
          </p>
        </div>
        <span className="rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-texto-suave">
          {habitacao.rotuloSituacaoEmpreendimento(detalhe.situacao)}
        </span>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-borda bg-surface p-4">
          <p className="text-xs font-semibold text-texto-suave">Unidades</p>
          <p className="tabular mt-1 text-2xl font-extrabold text-institucional">
            {entregues} <span className="text-base font-semibold text-texto-suave">de {detalhe.unidadesPrevistas}</span>
          </p>
          <p className="mt-1 text-xs text-texto-suave">
            {cadastradas} cadastrada(s) · {entregues} entregue(s)
          </p>
        </div>

        <div className="rounded-lg border border-borda bg-surface p-4">
          <p className="text-xs font-semibold text-texto-suave">Previsão de entrega</p>
          <p className="tabular mt-1 text-2xl font-extrabold text-institucional">
            {data(detalhe.previsaoEntrega)}
          </p>
          {detalhe.programa && (
            <p className="mt-1 text-xs text-texto-suave">
              Fila:{' '}
              <Link
                href={`/fila/${detalhe.programa.slug}`}
                className="font-semibold text-primary hover:underline"
              >
                {detalhe.programa.nome}
              </Link>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-borda bg-surface p-4">
          <p className="text-xs font-semibold text-texto-suave">Convênio</p>
          {detalhe.convenio ? (
            <>
              <p className="tabular mt-1 text-lg font-bold text-institucional">
                {detalhe.convenio.protocolo}
              </p>
              <p className="text-xs text-texto-suave">
                {detalhe.convenio.orgaoRepassador} · {moeda(detalhe.convenio.valorRepasse)}
              </p>
              <p className="tabular mt-1 text-xs text-texto-suave">
                Vigência até {data(detalhe.convenio.vigenciaFim)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-texto-suave">Recurso próprio</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-institucional">Obras</h2>
          {podeGerirObra && <NovaObra empreendimentoId={detalhe.id} caminho={caminho} />}
        </div>

        {detalhe.obras.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-borda bg-surface p-6 text-center text-sm text-texto-suave">
            Nenhuma obra contratada. Cadastre o contrato de execução para abrir o cronograma.
          </p>
        ) : (
          <div className="mt-3 space-y-6">
            {detalhe.obras.map((obra) => (
              <PainelObra
                key={obra.id}
                obra={obra}
                caminho={caminho}
                podeGerir={podeGerirObra}
                podeMedir={podeMedir}
                fiscalPadrao={sessao?.nome ?? ''}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-institucional">Unidades</h2>
          <div className="flex flex-wrap gap-3 text-xs text-texto-suave">
            {habitacao.SITUACOES_UNIDADE.filter(
              (situacao) => (detalhe.resumoUnidades[situacao] ?? 0) > 0,
            ).map((situacao) => (
              <span key={situacao} className="tabular">
                <strong className="text-texto">{detalhe.resumoUnidades[situacao]}</strong>{' '}
                {habitacao.rotuloSituacaoUnidade(situacao).toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <BarraProgresso
            rotulo="Entregues"
            tom="sucesso"
            percentual={
              detalhe.unidadesPrevistas > 0 ? (entregues / detalhe.unidadesPrevistas) * 100 : 0
            }
            detalhe={`${entregues} de ${detalhe.unidadesPrevistas} unidades previstas`}
          />
        </div>

        <div className="mt-4">
          <PainelUnidades
            empreendimentoId={detalhe.id}
            unidades={detalhe.unidades}
            candidatas={detalhe.candidatas}
            caminho={caminho}
            podeGerir={podeGerirObra}
            podeEntregar={podeEntregar}
          />
        </div>
      </section>
    </div>
  );
}
