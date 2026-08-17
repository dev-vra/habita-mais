import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import { cn } from '@/lib/cn';

interface PendenciaAberta {
  id: string;
  tipo: string;
  descricao: string;
  prazoAte: string;
  vencida: boolean;
  inscricaoId: string;
  protocolo: string;
  responsavel: string;
  programa: string;
}

const CHIPS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'DOCUMENTO', rotulo: 'Documento' },
  { valor: 'VISITA', rotulo: 'Visita' },
  { valor: 'RENDA', rotulo: 'Renda' },
];

const COLUNAS = [
  { chave: 'pendencia', rotulo: 'Pendência' },
  { chave: 'responsavel', rotulo: 'Responsável' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,132px)' },
  { chave: 'prazo', rotulo: 'Prazo', largura: 'minmax(120px,auto)', direita: true },
];

/** Fila de trabalho do balcão: quem está suspensa da fila e por quê, ordenada pelo prazo. */
export default async function PaginaPendencias({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string }>;
}) {
  const { busca, situacao } = await searchParams;
  const pendencias = await apiFetch<PendenciaAberta[]>('/pendencias');

  const filtradas = pendencias
    .filter((pendencia) => !situacao || pendencia.tipo.toUpperCase().includes(situacao))
    .filter((pendencia) =>
      !busca
        ? true
        : `${pendencia.responsavel} ${pendencia.protocolo} ${pendencia.descricao}`
            .toLowerCase()
            .includes(busca.toLowerCase()),
    );

  const vencidas = pendencias.filter((pendencia) => pendencia.vencida).length;

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Pendências' }]}
        titulo="Pendências documentais"
        subtitulo={`${pendencias.length} em aberto${vencidas > 0 ? ` · ${vencidas} com prazo vencido` : ''}`}
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi
            rotulo="Em aberto"
            valor={pendencias.length}
            nota="suspendem a família na fila"
            indice={0}
          />
          <CartaoKpi
            rotulo="Com prazo vencido"
            valor={vencidas}
            nota="passaram do prazo dado ao munícipe"
            alerta={vencidas > 0}
            proporcao={pendencias.length > 0 ? vencidas / pendencias.length : 0}
            indice={1}
          />
        </GradeKpi>

        <div className="mt-7">
          <BarraFiltros placeholder="Buscar por nome, protocolo ou descrição" chips={CHIPS} />
        </div>

        <div className="mt-3.5">
          <Tabela
            rotulo="Pendências em aberto"
            colunas={COLUNAS}
            linhas={filtradas.map((pendencia) => ({
              id: pendencia.id,
              href: `/inscricoes/${pendencia.inscricaoId}`,
              celulas: [
                <CelulaPrincipal
                  key="pendencia"
                  titulo={`${pendencia.tipo} — ${pendencia.descricao}`}
                  apoio={`${pendencia.responsavel} · ${pendencia.protocolo}`}
                  href={`/inscricoes/${pendencia.inscricaoId}`}
                />,
                <span key="responsavel" className="block truncate text-[13px] text-texto-suave">
                  {pendencia.programa}
                </span>,
                <EtiquetaStatus
                  key="situacao"
                  rotulo={pendencia.vencida ? 'Vencida' : 'Em aberto'}
                  tom={pendencia.vencida ? 'perigo' : 'atencao'}
                />,
                <span
                  key="prazo"
                  className={cn(
                    'tabular text-[13px]',
                    pendencia.vencida ? 'font-semibold text-danger' : 'text-texto-suave',
                  )}
                >
                  {pendencia.vencida ? 'Vencida em ' : 'Prazo · '}
                  {new Date(pendencia.prazoAte).toLocaleDateString('pt-BR')}
                </span>,
              ],
            }))}
            vazio={
              <EstadoVazio
                titulo={
                  pendencias.length === 0
                    ? 'Nenhuma pendência em aberto'
                    : 'Nenhuma pendência para este recorte'
                }
                descricao={
                  pendencias.length === 0
                    ? 'Nada segurando a fila neste momento.'
                    : 'Tente outro tipo de pendência ou limpe a busca.'
                }
              />
            }
          />
        </div>
      </CorpoTela>
    </>
  );
}
