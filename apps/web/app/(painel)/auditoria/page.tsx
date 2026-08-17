import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, RodapeTabela, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import type { TomStatus } from '@/lib/status';

interface Evento {
  id: string;
  quando: string;
  operacao: string;
  entidade: string;
  entidadeId: string | null;
  ator: string;
  tipoAtor: string;
  ip: string | null;
  diff: Record<string, unknown> | null;
}

interface Trilha {
  total: number;
  pagina: number;
  paginas: number;
  entidades: { entidade: string; eventos: number }[];
  eventos: Evento[];
}

const OPERACOES: Record<string, { rotulo: string; tom: TomStatus }> = {
  INSERT: { rotulo: 'Criou', tom: 'sucesso' },
  UPDATE: { rotulo: 'Alterou', tom: 'institucional' },
  DELETE: { rotulo: 'Removeu', tom: 'perigo' },
  READ: { rotulo: 'Consultou', tom: 'neutro' },
};

const CHIPS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'INSERT', rotulo: 'Criação' },
  { valor: 'UPDATE', rotulo: 'Alteração' },
  { valor: 'READ', rotulo: 'Leitura' },
];

const COLUNAS = [
  { chave: 'acao', rotulo: 'Ação' },
  { chave: 'ator', rotulo: 'Ator' },
  { chave: 'tipo', rotulo: 'Tipo', largura: 'minmax(0,132px)' },
  { chave: 'quando', rotulo: 'Quando', largura: 'minmax(150px,auto)', direita: true },
];

/**
 * Trilha de auditoria. O que aparece aqui é o que a prefeitura mostra ao controle externo — por
 * isso o diff vem mascarado da origem, e não há ação nenhuma nesta tela: ler é tudo que se faz.
 */
export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtro = await searchParams;
  const query = new URLSearchParams(
    Object.entries(filtro).filter(([, valor]) => Boolean(valor)) as [string, string][],
  );
  const trilha = await apiFetch<Trilha>(`/auditoria?${query.toString()}`);

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Trilha de auditoria' }]}
        titulo="Trilha de auditoria"
        subtitulo={`${trilha.total.toLocaleString('pt-BR')} eventos registrados · append-only: nada aqui pode ser editado ou apagado, nem pelo sistema.`}
      />

      <CorpoTela>
        <BarraFiltros
          placeholder="Buscar"
          comBusca={false}
          chips={CHIPS}
          parametroChip="operacao"
          acessorio={
            <form className="flex flex-wrap items-center gap-2.5" action="/auditoria">
              {/* O recorte por operação vive nos chips; o formulário precisa carregá-lo adiante. */}
              <input type="hidden" name="operacao" value={filtro.operacao ?? ''} />
              <select
                name="entidade"
                defaultValue={filtro.entidade ?? ''}
                aria-label="Entidade"
                className="h-9 rounded-md border border-borda bg-surface px-3 text-[12.5px] outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
              >
                <option value="">Todas as entidades</option>
                {trilha.entidades.map((item) => (
                  <option key={item.entidade} value={item.entidade}>
                    {item.entidade} ({item.eventos})
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="de"
                defaultValue={filtro.de}
                aria-label="De"
                className="tabular h-9 rounded-md border border-borda bg-surface px-3 text-[12.5px] outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
              />
              <input
                type="date"
                name="ate"
                defaultValue={filtro.ate}
                aria-label="Até"
                className="tabular h-9 rounded-md border border-borda bg-surface px-3 text-[12.5px] outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
              />
              <button
                type="submit"
                className="h-9 rounded-md border border-borda bg-surface px-3.5 text-[12.5px] font-bold text-institucional transition hover:bg-background"
              >
                Filtrar
              </button>
            </form>
          }
        />

        <div className="mt-3.5">
          <Tabela
            rotulo="Eventos da trilha"
            colunas={COLUNAS}
            linhas={trilha.eventos.map((evento) => {
              const operacao = OPERACOES[evento.operacao] ?? {
                rotulo: evento.operacao,
                tom: 'neutro' as TomStatus,
              };

              return {
                id: evento.id,
                celulas: [
                  <CelulaPrincipal
                    key="acao"
                    titulo={`${operacao.rotulo} ${evento.entidade}`}
                    apoio={detalhe(evento)}
                  />,
                  <span key="ator" className="block truncate text-[13px] text-texto-suave">
                    {evento.ator}
                    <span className="block text-[11.5px]">{evento.tipoAtor.toLowerCase()}</span>
                  </span>,
                  <EtiquetaStatus key="tipo" rotulo={operacao.rotulo} tom={operacao.tom} />,
                  <span key="quando" className="tabular text-[13px] text-texto-suave">
                    {new Date(evento.quando).toLocaleString('pt-BR')}
                  </span>,
                ],
              };
            })}
            vazio={
              <EstadoVazio
                titulo="Nenhum evento para este filtro"
                descricao="Ajuste a entidade, a operação ou o período para encontrar o registro."
              />
            }
            rodape={
              <RodapeTabela
                total={trilha.total}
                pagina={trilha.pagina}
                porPagina={Math.max(Math.ceil(trilha.total / Math.max(trilha.paginas, 1)), 1)}
              />
            }
          />
        </div>
      </CorpoTela>
    </>
  );
}

/** O diff já chega mascarado da origem; aqui só se lê quantos campos mudaram. */
function detalhe(evento: Evento): string {
  const campos = evento.diff ? Object.keys(evento.diff).length : 0;
  const partes = [evento.entidadeId ?? '—'];
  if (campos > 0) partes.push(`${campos} ${campos === 1 ? 'campo' : 'campos'}`);
  if (evento.ip) partes.push(evento.ip);
  return partes.join(' · ');
}
