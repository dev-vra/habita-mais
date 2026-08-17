import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { ListaEncaminhamentos, type Encaminhamento } from './lista-encaminhamentos';

/**
 * A Habitação vê o que pediu; o setor externo vê o que recebeu. Quem decide o que aparece é a RLS,
 * não um filtro desta página — o recorte da tela é só de leitura.
 */
export default async function PaginaEncaminhamentos({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; busca?: string }>;
}) {
  const { situacao, busca } = await searchParams;
  const [sessao, encaminhamentos] = await Promise.all([
    sessaoAtual(),
    apiFetch<Encaminhamento[]>('/encaminhamentos'),
  ]);

  const podeResponder = sessao?.capacidades.includes('RESPONDER_ENCAMINHAMENTO') ?? false;
  const abertos = encaminhamentos.filter((item) => item.situacao === 'ABERTO');
  const vencidos = encaminhamentos.filter((item) => item.vencido && item.situacao === 'ABERTO');

  const filtrados = encaminhamentos
    .filter((item) => !situacao || item.situacao === situacao)
    .filter((item) =>
      !busca
        ? true
        : `${item.assunto} ${item.numero} ${item.origem.sigla} ${item.destino.sigla} ${item.referenciaResumo}`
            .toLowerCase()
            .includes(busca.toLowerCase()),
    );

  return (
    <>
      <CabecalhoTela
        trilha={[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Encaminhamentos' }]}
        titulo="Encaminhamentos entre setores"
        subtitulo={`${abertos.length} em aberto de ${encaminhamentos.length} no total · cada pedido carrega prazo — encaminhar sem prazo é arquivar.`}
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi rotulo="Em aberto" valor={abertos.length} nota="aguardam o setor" indice={0} />
          <CartaoKpi
            rotulo="Com prazo vencido"
            valor={vencidos.length}
            nota="passaram do prazo combinado"
            alerta={vencidos.length > 0}
            proporcao={abertos.length > 0 ? vencidos.length / abertos.length : 0}
            indice={1}
          />
          <CartaoKpi
            rotulo="Respondidos"
            valor={encaminhamentos.filter((item) => item.situacao === 'RESPONDIDO').length}
            nota="voltaram com resposta"
            indice={2}
          />
        </GradeKpi>

        <div className="mt-7">
          <ListaEncaminhamentos
            encaminhamentos={filtrados}
            podeResponder={podeResponder}
            situacao={situacao}
            busca={busca}
          />
        </div>
      </CorpoTela>
    </>
  );
}
