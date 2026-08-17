import Link from 'next/link';
import { HomeIcon } from 'lucide-react';
import { habitacao } from '@habita/shared';
import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import { data } from '@/lib/formato';
import type { TomStatus } from '@/lib/status';

interface LinhaAgenda {
  unidadeId: string;
  protocolo: string;
  identificacao: string;
  endereco: string;
  situacaoUnidade: string;
  entregueEm: string | null;
  empreendimento: { id: string; nome: string; slug: string };
  familia: { id: string; codigo: string; responsavel: string } | null;
  ultimaVisita: { protocolo: string; visitadaEm: string; residenciaConfirmada: boolean } | null;
  situacao: habitacao.SituacaoAcompanhamento;
  proximaVisitaEm: string | null;
  diasParaProxima: number | null;
  ocorrenciasAbertas: number;
  ocorrenciaMaisGrave: string | null;
}

interface Agenda {
  itens: LinhaAgenda[];
  resumo: {
    total: number;
    vencidas: number;
    vencendo: number;
    aguardandoPrimeira: number;
    emDia: number;
    comOcorrenciaAberta: number;
  };
  periodicidade: { prazoPrimeiraVisitaDias: number; periodicidadeMeses: number };
}

interface OcorrenciaAberta {
  id: string;
  protocolo: string;
  tipo: string;
  gravidade: string;
  origem: string;
  situacao: string;
  descricao: string;
  constatadaEm: string;
  prazoRegularizacaoAte: string | null;
  prazoVencido: boolean;
  unidade: {
    id: string;
    identificacao: string;
    empreendimento: { nome: string; slug: string };
    familia: { codigo: string; responsavel: string } | null;
  };
}

const TOM_SITUACAO: Record<habitacao.SituacaoAcompanhamento, TomStatus> = {
  SEM_ACOMPANHAMENTO: 'neutro',
  AGUARDANDO_PRIMEIRA: 'institucional',
  EM_DIA: 'sucesso',
  VENCENDO: 'atencao',
  VENCIDA: 'perigo',
};

const TOM_GRAVIDADE: Record<string, TomStatus> = {
  ADMINISTRATIVA: 'neutro',
  LEVE: 'atencao',
  GRAVE: 'perigo',
  GRAVISSIMA: 'perigo',
};

const CHIPS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'VENCIDA', rotulo: 'Vencida' },
  { valor: 'VENCENDO', rotulo: 'Vence em breve' },
  { valor: 'EM_DIA', rotulo: 'Em dia' },
];

const COLUNAS = [
  { chave: 'unidade', rotulo: 'Unidade' },
  { chave: 'mutuario', rotulo: 'Mutuário' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,140px)' },
  { chave: 'proxima', rotulo: 'Próxima visita', largura: 'minmax(130px,auto)', direita: true },
];

/**
 * Pós-entrega.
 *
 * A ordem da lista é o atraso, não o nome: quem sai a campo monta a rota da semana por aqui, e a
 * primeira linha precisa ser a família há mais tempo sem visita. Entregar a chave não encerra a
 * responsabilidade — é o que o Trabalho Social cobra na prestação de contas do convênio.
 */
export default async function PaginaAcompanhamento({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; busca?: string }>;
}) {
  const { situacao, busca } = await searchParams;
  const consulta = situacao ? `?situacao=${encodeURIComponent(situacao)}` : '';

  const [agenda, ocorrencias] = await Promise.all([
    apiFetch<Agenda>(`/pos-entrega/agenda${consulta}`),
    apiFetch<OcorrenciaAberta[]>('/pos-entrega/ocorrencias'),
  ]);

  const itens = agenda.itens.filter((linha) =>
    !busca
      ? true
      : `${linha.identificacao} ${linha.empreendimento.nome} ${linha.familia?.responsavel ?? ''}`
          .toLowerCase()
          .includes(busca.toLowerCase()),
  );

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Pós-entrega' }]}
        titulo="Acompanhamento pós-entrega"
        subtitulo={`Primeira visita em até ${agenda.periodicidade.prazoPrimeiraVisitaDias} dias da entrega, depois a cada ${agenda.periodicidade.periodicidadeMeses} meses.`}
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi
            rotulo="Visitas vencidas"
            valor={agenda.resumo.vencidas}
            nota="passaram da periodicidade"
            alerta={agenda.resumo.vencidas > 0}
            proporcao={agenda.resumo.total > 0 ? agenda.resumo.vencidas / agenda.resumo.total : 0}
            indice={0}
          />
          <CartaoKpi
            rotulo="Vencem em breve"
            valor={agenda.resumo.vencendo}
            nota="entram na rota da semana"
            indice={1}
          />
          <CartaoKpi
            rotulo="Aguardando 1ª visita"
            valor={agenda.resumo.aguardandoPrimeira}
            nota="entregues, ainda sem visita"
            indice={2}
          />
          <CartaoKpi
            rotulo="Com ocorrência aberta"
            valor={agenda.resumo.comOcorrenciaAberta}
            nota="aguardam decisão"
            alerta={agenda.resumo.comOcorrenciaAberta > 0}
            indice={3}
          />
        </GradeKpi>

        {ocorrencias.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-[15.5px] font-bold text-institucional">
              Ocorrências aguardando decisão
            </h2>
            <ul className="animate-subir mt-3 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-surface">
              {ocorrencias.map((ocorrencia) => (
                <li key={ocorrencia.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-texto">
                        {habitacao.rotuloTipoOcorrencia(ocorrencia.tipo)}
                        <span className="ml-2 text-[12.5px] font-normal text-texto-suave">
                          {ocorrencia.unidade.empreendimento.nome} · unidade{' '}
                          {ocorrencia.unidade.identificacao}
                        </span>
                      </p>
                      <p className="tabular text-[11.5px] text-texto-suave">
                        {ocorrencia.protocolo} ·{' '}
                        {habitacao.rotuloOrigemOcorrencia(ocorrencia.origem)} · constatada em{' '}
                        {data(ocorrencia.constatadaEm)}
                        {ocorrencia.unidade.familia && ` · ${ocorrencia.unidade.familia.responsavel}`}
                      </p>
                      <p className="mt-1 text-[12.5px] text-texto-suave">{ocorrencia.descricao}</p>
                      {ocorrencia.prazoRegularizacaoAte && (
                        <p
                          className={`tabular mt-1 text-[11.5px] font-semibold ${
                            ocorrencia.prazoVencido ? 'text-danger' : 'text-texto-suave'
                          }`}
                        >
                          Prazo para regularizar: {data(ocorrencia.prazoRegularizacaoAte)}
                          {ocorrencia.prazoVencido && ' — vencido'}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <EtiquetaStatus
                        rotulo={habitacao.rotuloGravidade(ocorrencia.gravidade)}
                        tom={TOM_GRAVIDADE[ocorrencia.gravidade] ?? 'neutro'}
                      />
                      <span className="text-[11.5px] text-texto-suave">
                        {habitacao.rotuloSituacaoOcorrencia(ocorrencia.situacao)}
                      </span>
                      <Link
                        href={`/acompanhamento/${ocorrencia.unidade.id}`}
                        className="text-[11.5px] font-bold text-primary hover:underline"
                      >
                        Abrir unidade
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8">
          <BarraFiltros placeholder="Buscar por unidade, empreendimento ou mutuário" chips={CHIPS} />
        </div>

        <div className="mt-3.5">
          <Tabela
            rotulo="Unidades em acompanhamento"
            colunas={COLUNAS}
            linhas={itens.map((linha) => ({
              id: linha.unidadeId,
              href: `/acompanhamento/${linha.unidadeId}`,
              celulas: [
                <CelulaPrincipal
                  key="unidade"
                  titulo={linha.identificacao}
                  apoio={[
                    linha.empreendimento.nome,
                    linha.entregueEm ? `entregue em ${data(linha.entregueEm)}` : null,
                    linha.ocorrenciasAbertas > 0
                      ? `${linha.ocorrenciasAbertas} ocorrência(s) em aberto`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  href={`/acompanhamento/${linha.unidadeId}`}
                />,
                <span key="mutuario" className="block truncate text-[13px] text-texto-suave">
                  {linha.familia ? (
                    <>
                      {linha.familia.responsavel}
                      <span className="tabular block text-[11.5px]">{linha.familia.codigo}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>,
                <EtiquetaStatus
                  key="situacao"
                  rotulo={habitacao.rotuloSituacaoAcompanhamento(linha.situacao)}
                  tom={TOM_SITUACAO[linha.situacao]}
                />,
                <span key="proxima" className="tabular text-[13px] text-texto-suave">
                  {data(linha.proximaVisitaEm)}
                  {linha.diasParaProxima !== null && (
                    <span
                      className={`block text-[11.5px] ${
                        linha.diasParaProxima < 0 ? 'font-semibold text-danger' : ''
                      }`}
                    >
                      {linha.diasParaProxima < 0
                        ? `${Math.abs(linha.diasParaProxima)} dia(s) de atraso`
                        : `em ${linha.diasParaProxima} dia(s)`}
                    </span>
                  )}
                </span>,
              ],
            }))}
            vazio={
              <EstadoVazio
                icone={<HomeIcon size={20} strokeWidth={1.7} />}
                titulo={situacao ? 'Nenhuma unidade nesta situação' : 'Nenhuma unidade entregue ainda'}
                descricao={
                  situacao
                    ? 'Troque o recorte para ver as outras unidades da carteira.'
                    : 'O acompanhamento começa quando a primeira chave é entregue.'
                }
              />
            }
          />
        </div>
      </CorpoTela>
    </>
  );
}
