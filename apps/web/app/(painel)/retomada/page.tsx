import { Gavel } from 'lucide-react';
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

interface CasoLista {
  id: string;
  protocolo: string;
  fase: habitacao.FaseRetomada;
  descricao: string;
  abertoEm: string;
  notificadoEm: string | null;
  formaNotificacao: string | null;
  prazoDefesaAte: string | null;
  defesaApresentadaEm: string | null;
  decisao: string | null;
  unidade: {
    id: string;
    identificacao: string;
    situacao: string;
    empreendimento: { nome: string; slug: string };
    familia: { id: string; codigo: string; responsavel: string } | null;
  };
  ocorrencia: { id: string; protocolo: string; tipo: string; gravidade: string } | null;
  podeDecidir: boolean;
  revelia: boolean;
  diasParaDefesa: number | null;
  impedimentos: string[];
}

const TOM_FASE: Record<habitacao.FaseRetomada, TomStatus> = {
  ABERTO: 'neutro',
  NOTIFICADO: 'institucional',
  EM_DEFESA: 'atencao',
  EM_ANALISE: 'atencao',
  DECIDIDO: 'sucesso',
  ENCERRADO: 'neutro',
};

const CHIPS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'NOTIFICADO', rotulo: 'Notificado' },
  { valor: 'EM_DEFESA', rotulo: 'Em defesa' },
  { valor: 'DECIDIDO', rotulo: 'Decidido' },
];

const COLUNAS = [
  { chave: 'caso', rotulo: 'Caso' },
  { chave: 'unidade', rotulo: 'Unidade' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,140px)' },
  { chave: 'etapa', rotulo: 'Etapa desde', largura: 'minmax(130px,auto)', direita: true },
];

/**
 * Processos de retomada.
 *
 * A ordem é o prazo de defesa: decidir com prazo em curso anula o processo, e deixar o prazo
 * vencer sem seguir engaveta a família. As duas coisas dão errado do mesmo jeito — em silêncio.
 */
export default async function PaginaRetomada({
  searchParams,
}: {
  searchParams: Promise<{ encerrados?: string; situacao?: string; busca?: string }>;
}) {
  const { encerrados, situacao, busca } = await searchParams;
  const mostrarEncerrados = encerrados === 'true';

  const casos = await apiFetch<CasoLista[]>(
    `/retomada/casos${mostrarEncerrados ? '?encerrados=true' : ''}`,
  );

  const filtrados = casos
    .filter((caso) => !situacao || caso.fase === situacao)
    .filter((caso) =>
      !busca
        ? true
        : `${caso.protocolo} ${caso.unidade.identificacao} ${caso.unidade.familia?.responsavel ?? ''} ${caso.descricao}`
            .toLowerCase()
            .includes(busca.toLowerCase()),
    );

  const emDefesa = casos.filter((caso) => caso.fase === 'EM_DEFESA').length;
  const aDecidir = casos.filter((caso) => caso.podeDecidir).length;

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Retomada' }]}
        titulo="Processos de retomada"
        subtitulo="O ato mais grave do sistema. Nenhuma decisão sai sem notificação válida, prazo de defesa cumprido e fundamentação — é o contraditório do art. 5º LV da Constituição."
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi rotulo="Em andamento" valor={casos.length} nota="processos abertos" indice={0} />
          <CartaoKpi
            rotulo="Em prazo de defesa"
            valor={emDefesa}
            nota="decidir agora anula o processo"
            alerta={emDefesa > 0}
            indice={1}
          />
          <CartaoKpi
            rotulo="Prontos para decisão"
            valor={aDecidir}
            nota="contraditório cumprido"
            proporcao={casos.length > 0 ? aDecidir / casos.length : 0}
            indice={2}
          />
        </GradeKpi>

        <div className="mt-7">
          <BarraFiltros
            placeholder="Buscar por protocolo, unidade ou mutuário"
            chips={CHIPS}
            acessorio={
              <a
                href={mostrarEncerrados ? '/retomada' : '/retomada?encerrados=true'}
                className="flex h-9 items-center rounded-md border border-borda bg-surface px-3.5 text-[12.5px] font-bold text-institucional transition hover:bg-background"
              >
                {mostrarEncerrados ? 'Ver só em andamento' : 'Incluir encerrados'}
              </a>
            }
          />
        </div>

        <div className="mt-3.5">
          <Tabela
            rotulo="Processos de retomada"
            colunas={COLUNAS}
            linhas={filtrados.map((caso) => ({
              id: caso.id,
              href: `/retomada/${caso.id}`,
              celulas: [
                <CelulaPrincipal
                  key="caso"
                  titulo={caso.protocolo}
                  apoio={
                    caso.ocorrencia
                      ? `${caso.descricao} · origem ${caso.ocorrencia.protocolo}`
                      : caso.descricao
                  }
                  href={`/retomada/${caso.id}`}
                />,
                <span key="unidade" className="block truncate text-[13px] text-texto-suave">
                  {caso.unidade.identificacao}
                  <span className="block truncate text-[11.5px]">
                    {caso.unidade.empreendimento.nome}
                    {caso.unidade.familia && ` · ${caso.unidade.familia.responsavel}`}
                  </span>
                </span>,
                <span key="situacao">
                  <EtiquetaStatus
                    rotulo={habitacao.rotuloFaseRetomada(caso.fase)}
                    tom={TOM_FASE[caso.fase]}
                  />
                  {caso.revelia && (
                    <span className="mt-1 block text-[11px] font-semibold text-warning-text">
                      Revelia registrada
                    </span>
                  )}
                </span>,
                <span key="etapa" className="tabular text-[13px] text-texto-suave">
                  {data(caso.notificadoEm ?? caso.abertoEm)}
                  {caso.prazoDefesaAte && caso.diasParaDefesa !== null && caso.diasParaDefesa >= 0 && (
                    <span className="block text-[11.5px] font-semibold text-warning-text">
                      defesa até {data(caso.prazoDefesaAte)}
                    </span>
                  )}
                </span>,
              ],
            }))}
            vazio={
              <EstadoVazio
                icone={<Gavel size={20} strokeWidth={1.7} />}
                titulo="Nenhum processo de retomada"
                descricao="Eles nascem de uma ocorrência apurada e notificada, na página da unidade — nunca do nada."
              />
            }
          />
        </div>

        {filtrados.some((caso) => caso.fase !== 'ENCERRADO' && caso.impedimentos.length > 0) && (
          <section className="mt-6">
            <h2 className="font-display text-[15.5px] font-bold text-institucional">Próximo passo</h2>
            <ul className="mt-3 divide-y divide-borda overflow-hidden rounded-lg border border-borda bg-surface">
              {filtrados
                .filter((caso) => caso.fase !== 'ENCERRADO' && caso.impedimentos.length > 0)
                .map((caso) => (
                  <li key={caso.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="tabular text-[13px] font-semibold text-texto">{caso.protocolo}</span>
                    <span className="text-[12.5px] text-texto-suave">
                      {habitacao.MOTIVOS_IMPEDIMENTO[
                        caso.impedimentos[0] as keyof typeof habitacao.MOTIVOS_IMPEDIMENTO
                      ] ?? 'Aguardando andamento.'}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </CorpoTela>
    </>
  );
}
