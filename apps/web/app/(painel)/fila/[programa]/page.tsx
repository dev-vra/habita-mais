import { AcaoPrimaria, CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { CartaoKpi, GradeKpi } from '@/components/ui/cartao-kpi';
import { Aviso } from '@/components/ui/formulario';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { formatarDataHora, situacaoPrograma } from '@/lib/status';
import { FilaPrograma, type LinhaDaFila } from './fila-programa';

interface FilaDoPrograma {
  programa: { id: string; nome: string; slug: string; vagas: number; situacao: string };
  versaoVigente: number | null;
  convocacoesForaDeOrdem: number;
  rankingPublicadoEm: string | null;
  prazoRecursoAte: string | null;
  linhas: (LinhaDaFila & { calculadaEm: string | null; versaoCriterio: number | null })[];
}

/**
 * A tela-âncora do produto. A faixa de contexto no topo é a tela inteira em uma frase — sem ela, a
 * mesma tabela vira exatamente a planilha que o produto veio substituir: bonita, mas indefensável.
 */
export default async function PaginaFila({ params }: { params: Promise<{ programa: string }> }) {
  const { programa: slug } = await params;
  const [fila, sessao] = await Promise.all([
    apiFetch<FilaDoPrograma>(`/programas/${slug}/fila`),
    sessaoAtual(),
  ]);

  const capacidades = sessao?.capacidades ?? [];
  const podeConvocar = capacidades.includes('EMITIR_CONVOCACAO');
  const podePublicar = capacidades.includes('PUBLICAR_RANKING');
  const ultimoCalculo = fila.linhas.find((linha) => linha.calculadaEm);

  const classificadas = fila.linhas.filter((linha) => linha.situacao === 'APTA').length;
  const convocadas = fila.linhas.filter((linha) => linha.situacao === 'CONVOCADA').length;
  const emRecurso = fila.linhas.filter((linha) => linha.situacao === 'EM_RECURSO').length;

  const temRanking = fila.rankingPublicadoEm !== null;

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Filas', href: '/programas' },
          { rotulo: fila.programa.nome },
        ]}
        titulo={fila.programa.nome}
        subtitulo={
          <>
            {fila.programa.vagas} unidades · {situacaoPrograma(fila.programa.situacao)}
            {temRanking
              ? ` · ranking publicado em ${new Date(fila.rankingPublicadoEm ?? '').toLocaleDateString('pt-BR')}`
              : ' · ranking ainda não publicado'}
            {fila.versaoVigente !== null && ` · critério v${fila.versaoVigente}`}
          </>
        }
        acoes={
          temRanking
            ? undefined
            : podePublicar && (
                <AcaoPrimaria href={`/programas/${fila.programa.slug}`}>
                  Publicar ranking
                </AcaoPrimaria>
              )
        }
      />

      <CorpoTela>
        <GradeKpi>
          <CartaoKpi
            rotulo="Classificadas"
            valor={classificadas}
            nota="aptas com pontuação calculada"
            indice={0}
          />
          <CartaoKpi
            rotulo="Convocadas"
            valor={convocadas}
            nota={`${convocadas} de ${fila.programa.vagas} vagas`}
            proporcao={fila.programa.vagas > 0 ? convocadas / fila.programa.vagas : 0}
            indice={1}
          />
          <CartaoKpi
            rotulo="Em recurso"
            valor={emRecurso}
            nota={
              fila.prazoRecursoAte
                ? `prazo até ${new Date(fila.prazoRecursoAte).toLocaleDateString('pt-BR')}`
                : 'sem prazo de recurso aberto'
            }
            alerta={emRecurso > 0}
            indice={2}
          />
        </GradeKpi>

        {ultimoCalculo?.calculadaEm && (
          <div className="mt-5">
            <Aviso tom="reurb">
              Pontuação calculada em {formatarDataHora(ultimoCalculo.calculadaEm)}, sob o critério v
              {ultimoCalculo.versaoCriterio}. Recálculo não reordena quem já foi convocada — a nota
              que fundamentou a chamada continua valendo.
            </Aviso>
          </div>
        )}

        {fila.convocacoesForaDeOrdem > 0 && (
          <div className="mt-3">
            <Aviso tom="warning">
              {fila.convocacoesForaDeOrdem}{' '}
              {fila.convocacoesForaDeOrdem === 1
                ? 'convocação fora de ordem foi emitida'
                : 'convocações fora de ordem foram emitidas'}{' '}
              neste programa. Cada uma tem motivo registrado e é publicada junto ao ranking.
            </Aviso>
          </div>
        )}

        <div className="mt-6">
          <FilaPrograma
            linhas={fila.linhas}
            podeConvocar={podeConvocar}
            podeForaDeOrdem={capacidades.includes('CONVOCAR_FORA_DE_ORDEM')}
          />
        </div>

        <p className="mt-3 text-[12.5px] text-texto-suave">
          Mostrando {fila.linhas.length}{' '}
          {fila.linhas.length === 1 ? 'família classificada' : 'famílias classificadas'}. Inscrição
          com pendência ou indeferida não ocupa posição.
        </p>
      </CorpoTela>
    </>
  );
}
