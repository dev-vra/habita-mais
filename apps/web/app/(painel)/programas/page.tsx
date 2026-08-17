import Link from 'next/link';
import { ListOrdered } from 'lucide-react';
import { AcaoPrimaria, CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import { situacaoPrograma } from '@/lib/status';
import type { TomStatus } from '@/lib/status';

interface ProgramaLista {
  id: string;
  nome: string;
  slug: string;
  fonteRecurso: string;
  vagas: number;
  situacao: string;
  inscricaoInicio: string;
  inscricaoFim: string;
  inscricoes: number;
}

const TOM: Record<string, TomStatus> = {
  RASCUNHO: 'neutro',
  INSCRICOES_ABERTAS: 'sucesso',
  INSCRICOES_ENCERRADAS: 'atencao',
  EM_EXECUCAO: 'institucional',
  ENCERRADO: 'neutro',
};

const CHIPS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'INSCRICOES_ABERTAS', rotulo: 'Inscrições abertas' },
  { valor: 'EM_EXECUCAO', rotulo: 'Em execução' },
  { valor: 'ENCERRADO', rotulo: 'Encerrado' },
];

const COLUNAS = [
  { chave: 'programa', rotulo: 'Programa' },
  { chave: 'inscricoes', rotulo: 'Inscrições', largura: 'minmax(0,120px)' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,150px)' },
  { chave: 'vagas', rotulo: 'Vagas', largura: 'minmax(80px,auto)', direita: true },
];

export default async function PaginaProgramas({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; busca?: string }>;
}) {
  const { situacao, busca } = await searchParams;
  const programas = await apiFetch<ProgramaLista[]>('/programas');

  const filtrados = programas
    .filter((programa) => !situacao || programa.situacao === situacao)
    .filter((programa) =>
      !busca ? true : `${programa.nome} ${programa.fonteRecurso}`.toLowerCase().includes(busca.toLowerCase()),
    );

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Programas e critérios' }]}
        titulo="Programas"
        subtitulo={`${programas.length} ${programas.length === 1 ? 'programa cadastrado' : 'programas cadastrados'} · cada um com sua versão de critérios publicada.`}
        acoes={<AcaoPrimaria href="/programas/novo">Novo programa</AcaoPrimaria>}
      />

      <CorpoTela>
        <BarraFiltros placeholder="Buscar por nome ou fonte de recurso" chips={CHIPS} />

        <div className="mt-3.5">
          <Tabela
            rotulo="Programas habitacionais"
            colunas={COLUNAS}
            linhas={filtrados.map((programa) => ({
              id: programa.id,
              href: `/programas/${programa.slug}`,
              celulas: [
                <CelulaPrincipal
                  key="programa"
                  titulo={programa.nome}
                  apoio={`${programa.fonteRecurso} · inscrições até ${new Date(programa.inscricaoFim).toLocaleDateString('pt-BR')}`}
                  href={`/programas/${programa.slug}`}
                />,
                <span key="inscricoes" className="tabular text-[13px] text-texto-suave">
                  {programa.inscricoes.toLocaleString('pt-BR')}
                  <Link
                    href={`/fila/${programa.slug}`}
                    className="block text-[11.5px] font-bold text-primary hover:underline"
                  >
                    Ver a fila
                  </Link>
                </span>,
                <EtiquetaStatus
                  key="situacao"
                  rotulo={situacaoPrograma(programa.situacao)}
                  tom={TOM[programa.situacao] ?? 'neutro'}
                />,
                <span key="vagas" className="tabular text-[13px] font-bold text-institucional">
                  {programa.vagas.toLocaleString('pt-BR')}
                </span>,
              ],
            }))}
            vazio={
              <EstadoVazio
                icone={<ListOrdered size={20} strokeWidth={1.7} />}
                titulo="Nenhum programa nesta lista"
                descricao="O programa é o que abre inscrição, publica critério e gera fila."
              />
            }
          />
        </div>
      </CorpoTela>
    </>
  );
}
