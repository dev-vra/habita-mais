import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { habitacao } from '@habita/shared';
import { AcaoPrimaria, CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import { moeda } from '@/lib/formato';
import type { TomStatus } from '@/lib/status';

interface EmpreendimentoLista {
  id: string;
  protocolo: string;
  nome: string;
  slug: string;
  bairro: string;
  situacao: string;
  unidadesPrevistas: number;
  unidadesCadastradas: number;
  unidadesEntregues: number;
  previsaoEntrega: string | null;
  programa: { id: string; nome: string; slug: string } | null;
  convenio: { id: string; protocolo: string; objeto: string } | null;
  percentualObras: number;
  obrasParalisadas: number;
}

interface ConvenioLista {
  id: string;
  protocolo: string;
  numeroExterno: string | null;
  objeto: string;
  origem: string;
  orgaoRepassador: string;
  valorRepasse: number;
  valorContrapartida: number;
  vigenciaFim: string;
  situacao: string;
  empreendimentos: number;
  vigenciaVencida: boolean;
}

const TOM_EMPREENDIMENTO: Record<string, TomStatus> = {
  PLANEJAMENTO: 'neutro',
  EM_OBRA: 'institucional',
  CONCLUIDO: 'sucesso',
  ENTREGUE: 'sucesso',
  CANCELADO: 'perigo',
};

const CHIPS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'EM_OBRA', rotulo: 'Em obra' },
  { valor: 'PLANEJAMENTO', rotulo: 'Planejamento' },
  { valor: 'ENTREGUE', rotulo: 'Entregue' },
];

const COLUNAS = [
  { chave: 'empreendimento', rotulo: 'Empreendimento' },
  { chave: 'unidades', rotulo: 'Unidades', largura: 'minmax(0,140px)' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,132px)' },
  { chave: 'fisico', rotulo: 'Físico', largura: 'minmax(90px,auto)', direita: true },
];

const COLUNAS_CONVENIO = [
  { chave: 'convenio', rotulo: 'Convênio' },
  { chave: 'origem', rotulo: 'Origem', largura: 'minmax(0,160px)' },
  { chave: 'vigencia', rotulo: 'Vigência', largura: 'minmax(0,132px)' },
  { chave: 'repasse', rotulo: 'Repasse', largura: 'minmax(130px,auto)', direita: true },
];

/**
 * Produção habitacional.
 *
 * A ordem da página é a da pergunta que o gestor faz: *o que está sendo construído e em que pé
 * está?* O convênio vem depois porque é meio, não fim — mas vem, porque é dele que sai o prazo que
 * ninguém pode perder.
 */
export default async function PaginaProducao({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string }>;
}) {
  const { busca, situacao } = await searchParams;
  const [empreendimentos, convenios] = await Promise.all([
    apiFetch<EmpreendimentoLista[]>('/producao/empreendimentos'),
    apiFetch<ConvenioLista[]>('/producao/convenios'),
  ]);

  const filtrados = empreendimentos
    .filter((item) => !situacao || item.situacao === situacao)
    .filter((item) =>
      !busca ? true : `${item.nome} ${item.protocolo} ${item.bairro}`.toLowerCase().includes(busca.toLowerCase()),
    );

  const previstas = empreendimentos.reduce((soma, item) => soma + item.unidadesPrevistas, 0);
  const entregues = empreendimentos.reduce((soma, item) => soma + item.unidadesEntregues, 0);
  const paralisadas = empreendimentos.reduce((soma, item) => soma + item.obrasParalisadas, 0);

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Produção' }]}
        titulo="Produção habitacional"
        subtitulo="Convênio, obra, medição e unidade — do repasse à entrega da chave."
        acoes={<AcaoPrimaria href="/producao/novo">Novo empreendimento</AcaoPrimaria>}
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi
            rotulo="Empreendimentos"
            valor={empreendimentos.length}
            nota="em carteira"
            indice={0}
          />
          <CartaoKpi rotulo="Unidades previstas" valor={previstas} nota="somadas na carteira" indice={1} />
          <CartaoKpi
            rotulo="Unidades entregues"
            valor={entregues}
            nota="chave na mão do mutuário"
            proporcao={previstas > 0 ? entregues / previstas : 0}
            indice={2}
          />
          <CartaoKpi
            rotulo="Obras paralisadas"
            valor={paralisadas}
            nota="param o cronograma do convênio"
            alerta={paralisadas > 0}
            indice={3}
          />
        </GradeKpi>

        <div className="mt-7">
          <BarraFiltros placeholder="Buscar por nome, protocolo ou bairro" chips={CHIPS} />
        </div>

        <div className="mt-3.5">
          <Tabela
            rotulo="Empreendimentos e obras"
            colunas={COLUNAS}
            linhas={filtrados.map((item) => ({
              id: item.id,
              href: `/producao/${item.slug}`,
              celulas: [
                <CelulaPrincipal
                  key="empreendimento"
                  titulo={item.nome}
                  apoio={[
                    item.protocolo,
                    item.bairro,
                    item.convenio ? `convênio ${item.convenio.protocolo}` : null,
                    item.previsaoEntrega
                      ? `entrega ${new Date(item.previsaoEntrega).toLocaleDateString('pt-BR')}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  href={`/producao/${item.slug}`}
                />,
                <span key="unidades" className="tabular text-[13px] text-texto-suave">
                  {item.unidadesEntregues}/{item.unidadesPrevistas} entregues
                  {item.obrasParalisadas > 0 && (
                    <span className="block text-[11.5px] font-semibold text-danger">
                      {item.obrasParalisadas} obra(s) paralisada(s)
                    </span>
                  )}
                </span>,
                <EtiquetaStatus
                  key="situacao"
                  rotulo={habitacao.rotuloSituacaoEmpreendimento(item.situacao)}
                  tom={TOM_EMPREENDIMENTO[item.situacao] ?? 'neutro'}
                />,
                <span key="fisico" className="tabular text-[13px] font-bold text-institucional">
                  {item.percentualObras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                </span>,
              ],
            }))}
            vazio={
              <EstadoVazio
                icone={<Building2 size={20} strokeWidth={1.7} />}
                titulo="Nenhum empreendimento nesta lista"
                descricao="Comece pelo convênio que financia a obra — ou cadastre o conjunto direto, se o recurso for próprio."
              />
            }
          />
        </div>

        <section className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-[15.5px] font-bold text-institucional">
              Convênios e recursos
            </h2>
            <Link
              href="/producao/convenios/novo"
              className="text-[12.5px] font-bold text-primary hover:underline"
            >
              Registrar convênio
            </Link>
          </div>

          <div className="mt-3">
            <Tabela
              rotulo="Convênios"
              colunas={COLUNAS_CONVENIO}
              linhas={convenios.map((convenio) => ({
                id: convenio.id,
                celulas: [
                  <CelulaPrincipal
                    key="convenio"
                    titulo={convenio.objeto}
                    apoio={`${convenio.protocolo}${convenio.numeroExterno ? ` · ${convenio.numeroExterno}` : ''} · ${convenio.empreendimentos} empreendimento(s)`}
                  />,
                  <span key="origem" className="block truncate text-[13px] text-texto-suave">
                    {habitacao.rotuloOrigemRecurso(convenio.origem)}
                    <span className="block truncate text-[11.5px]">{convenio.orgaoRepassador}</span>
                  </span>,
                  <span key="vigencia" className="tabular text-[13px] text-texto-suave">
                    {new Date(convenio.vigenciaFim).toLocaleDateString('pt-BR')}
                    {convenio.vigenciaVencida && (
                      <span className="block text-[11.5px] font-semibold text-danger">Vencida</span>
                    )}
                  </span>,
                  <span key="repasse" className="tabular text-[13px] font-semibold text-texto">
                    {moeda(convenio.valorRepasse)}
                    {convenio.valorContrapartida > 0 && (
                      <span className="block text-[11.5px] font-normal text-texto-suave">
                        + {moeda(convenio.valorContrapartida)} de contrapartida
                      </span>
                    )}
                  </span>,
                ],
              }))}
              vazio={<EstadoVazio titulo="Nenhum convênio registrado" />}
            />
          </div>
        </section>
      </CorpoTela>
    </>
  );
}
