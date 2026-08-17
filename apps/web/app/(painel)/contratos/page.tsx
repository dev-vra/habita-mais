import { Receipt } from 'lucide-react';
import { habitacao } from '@habita/shared';
import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { apiFetch } from '@/lib/api/server';
import { data, moeda, percentual } from '@/lib/formato';
import type { TomStatus } from '@/lib/status';

interface LinhaContrato {
  id: string;
  protocolo: string;
  situacao: string;
  valorFinanciado: number;
  quantidadeParcelas: number;
  assinadoEm: string;
  titular: { id: string; nome: string };
  familia: { id: string; codigo: string };
  unidade: {
    id: string;
    identificacao: string;
    empreendimento: { nome: string; slug: string };
  };
  resumo: habitacao.ResumoContrato;
  inadimplencia: habitacao.AvaliacaoInadimplencia;
}

interface Carteira {
  itens: LinhaContrato[];
  resumo: {
    total: number;
    vigentes: number;
    quitados: number;
    inadimplentes: number;
    aNotificar: number;
    valorEmAtraso: number;
    saldoTotal: number;
  };
}

const TOM_FASE: Record<habitacao.FaseInadimplencia, TomStatus> = {
  EM_DIA: 'sucesso',
  ATRASO_RECENTE: 'neutro',
  COBRANCA: 'atencao',
  NOTIFICACAO: 'perigo',
  PASSIVEL_RESCISAO: 'perigo',
};

const CHIPS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'EM_DIA', rotulo: 'Em dia' },
  { valor: 'ATRASADO', rotulo: 'Atrasado' },
  { valor: 'QUITADO', rotulo: 'Quitado' },
];

const COLUNAS = [
  { chave: 'mutuario', rotulo: 'Mutuário' },
  { chave: 'unidade', rotulo: 'Unidade' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,150px)' },
  { chave: 'parcela', rotulo: 'Parcela', largura: 'minmax(140px,auto)', direita: true },
];

/**
 * Carteira de mutuários.
 *
 * Ordena pelo maior atraso porque a lista é de quem cobra: a primeira linha precisa ser a família
 * há mais tempo sem pagar, não a que assinou primeiro. Cobrar cedo costuma resolver; cobrar tarde
 * vira processo.
 */
export default async function PaginaContratos({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; busca?: string }>;
}) {
  const { situacao, busca } = await searchParams;
  // "Atrasado" é recorte de cobrança, não situação de contrato — quem responde é a API, que sabe
  // olhar parcela vencida em todas as páginas, e não só nas que já vieram para a tela.
  const carteira = await apiFetch<Carteira>(
    `/contratos${situacao === 'ATRASADO' ? '?inadimplentes=true' : ''}`,
  );

  const itens = carteira.itens
    .filter((linha) => {
      if (situacao === 'EM_DIA') return linha.inadimplencia.fase === 'EM_DIA';
      if (situacao === 'QUITADO') return linha.situacao === 'QUITADO';
      return true;
    })
    .filter((linha) =>
      !busca
        ? true
        : `${linha.titular.nome} ${linha.protocolo} ${linha.familia.codigo} ${linha.unidade.identificacao}`
            .toLowerCase()
            .includes(busca.toLowerCase()),
    );

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Contratos e carnês' }]}
        titulo="Contratos de mutuário"
        subtitulo="Carnê, pagamento e cobrança das unidades entregues com contrapartida."
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi rotulo="Vigentes" valor={carteira.resumo.vigentes} nota="carnê em curso" indice={0} />
          <CartaoKpi
            rotulo="Quitados"
            valor={carteira.resumo.quitados}
            nota="sem saldo devedor"
            proporcao={carteira.resumo.total > 0 ? carteira.resumo.quitados / carteira.resumo.total : 0}
            indice={1}
          />
          <CartaoKpi
            rotulo="Em atraso"
            valor={carteira.resumo.inadimplentes}
            nota={`${carteira.resumo.aNotificar} a notificar`}
            alerta={carteira.resumo.inadimplentes > 0}
            indice={2}
          />
          <CartaoKpi
            rotulo="Valor em atraso"
            valor={moeda(carteira.resumo.valorEmAtraso)}
            nota={`saldo total ${moeda(carteira.resumo.saldoTotal)}`}
            alerta={carteira.resumo.valorEmAtraso > 0}
            indice={3}
          />
        </GradeKpi>

        <div className="mt-7">
          <BarraFiltros placeholder="Buscar por mutuário, contrato ou unidade" chips={CHIPS} />
        </div>

        <div className="mt-3.5">
          <Tabela
            rotulo="Contratos de mutuário"
            colunas={COLUNAS}
            linhas={itens.map((linha) => ({
              id: linha.id,
              href: `/contratos/${linha.id}`,
              celulas: [
                <CelulaPrincipal
                  key="mutuario"
                  titulo={linha.titular.nome}
                  apoio={`${linha.protocolo} · ${linha.familia.codigo} · assinado em ${data(linha.assinadoEm)}`}
                  href={`/contratos/${linha.id}`}
                />,
                <span key="unidade" className="block truncate text-[13px] text-texto-suave">
                  {linha.unidade.identificacao}
                  <span className="block truncate text-[11.5px]">
                    {linha.unidade.empreendimento.nome}
                  </span>
                </span>,
                <span key="situacao">
                  <EtiquetaStatus
                    rotulo={habitacao.rotuloFaseInadimplencia(linha.inadimplencia.fase)}
                    tom={TOM_FASE[linha.inadimplencia.fase]}
                  />
                  <span className="mt-1 block text-[11px] text-texto-suave">
                    {habitacao.rotuloSituacaoContrato(linha.situacao)}
                    {linha.inadimplencia.maiorAtrasoDias > 0 &&
                      ` · ${linha.inadimplencia.maiorAtrasoDias} dia(s) de atraso`}
                  </span>
                </span>,
                <span key="parcela" className="tabular text-[13px] text-texto">
                  <span className="font-semibold">{moeda(linha.resumo.saldoDevedor)}</span>
                  <span className="block text-[11.5px] text-texto-suave">
                    {linha.resumo.pagas} de {linha.resumo.totalParcelas} ·{' '}
                    {percentual(linha.resumo.percentualQuitado)}
                  </span>
                  {linha.resumo.valorEmAtraso > 0 && (
                    <span className="block text-[11.5px] font-semibold text-danger">
                      {moeda(linha.resumo.valorEmAtraso)} vencido
                    </span>
                  )}
                </span>,
              ],
            }))}
            vazio={
              <EstadoVazio
                icone={<Receipt size={20} strokeWidth={1.7} />}
                titulo={situacao ? 'Nenhum contrato neste recorte' : 'Nenhum contrato assinado'}
                descricao={
                  situacao
                    ? 'Troque o recorte para ver o resto da carteira.'
                    : 'O contrato nasce na entrega da unidade, quando há contrapartida da família.'
                }
              />
            }
          />
        </div>
      </CorpoTela>
    </>
  );
}
