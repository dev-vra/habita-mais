import { AcaoPrimaria, CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { apiFetch } from '@/lib/api/server';
import { ListaFamilias, type ItemFamilia } from './lista-familias';

const POR_PAGINA = 25;

export default async function PaginaFamilias({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string; pagina?: string }>;
}) {
  const { busca, situacao, pagina } = await searchParams;
  const paginaAtual = Math.max(Number(pagina ?? 1) || 1, 1);

  const consulta = new URLSearchParams();
  if (busca) consulta.set('busca', busca);
  if (situacao) consulta.set('situacao', situacao);
  if (paginaAtual > 1) consulta.set('pagina', String(paginaAtual));
  const sufixo = consulta.toString() ? `?${consulta.toString()}` : '';

  const [lista, resumo] = await Promise.all([
    apiFetch<{ itens: ItemFamilia[]; total: number }>(`/familias${sufixo}`),
    apiFetch<{ ativas: number; fichaVencida: number; prioridadeLegal: number }>('/familias/resumo'),
  ]);

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Famílias' }]}
        titulo="Famílias"
        subtitulo={`${lista.total.toLocaleString('pt-BR')} ${
          lista.total === 1 ? 'família cadastrada' : 'famílias cadastradas'
        }`}
        acoes={<AcaoPrimaria href="/familias/nova">Cadastrar família</AcaoPrimaria>}
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi rotulo="Cadastros ativos" valor={resumo.ativas} nota="ficha social ativa" indice={0} />
          <CartaoKpi
            rotulo="Ficha vencida"
            valor={resumo.fichaVencida}
            nota="saem da fila no recadastramento"
            alerta={resumo.fichaVencida > 0}
            proporcao={resumo.ativas > 0 ? resumo.fichaVencida / resumo.ativas : 0}
            indice={1}
          />
          <CartaoKpi
            rotulo="Prioridade legal"
            valor={resumo.prioridadeLegal}
            nota="PcD, idoso ou área de risco"
            proporcao={resumo.ativas > 0 ? resumo.prioridadeLegal / resumo.ativas : 0}
            indice={2}
          />
        </GradeKpi>

        <div className="mt-7">
          <ListaFamilias
            itens={lista.itens}
            total={lista.total}
            pagina={paginaAtual}
            porPagina={POR_PAGINA}
            busca={busca}
          />
        </div>
      </CorpoTela>
    </>
  );
}
