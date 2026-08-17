import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { Aviso } from '@/components/ui/formulario';
import { PainelOcorrencias } from '@/components/domain/painel-ocorrencias';
import { RegistrarVisita } from '@/components/domain/registrar-visita';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { data } from '@/lib/formato';
import type { TomStatus } from '@/lib/status';

export interface VisitaRegistrada {
  id: string;
  protocolo: string;
  visitadaEm: string;
  tipo: string;
  tecnicoNome: string;
  residenciaConfirmada: boolean;
  quemReside: string | null;
  moradoresEncontrados: number | null;
  parecer: string;
  proximaVisitaEm: string | null;
  eixos: { eixo: string; situacao: string; observacao: string | null }[];
}

export interface OcorrenciaRegistrada {
  id: string;
  protocolo: string;
  tipo: string;
  gravidade: string;
  origem: string;
  situacao: habitacao.SituacaoOcorrencia;
  descricao: string;
  constatadaEm: string;
  notificadaEm: string | null;
  prazoRegularizacaoAte: string | null;
  encerradaEm: string | null;
  motivoEncerramento: string | null;
  transicoes: habitacao.SituacaoOcorrencia[];
  prazoVencido: boolean;
  encaminhamentoSugerido: string;
}

interface Historico {
  unidade: {
    id: string;
    protocolo: string;
    identificacao: string;
    endereco: string;
    situacao: habitacao.SituacaoUnidade;
    entregueEm: string | null;
    empreendimento: { id: string; nome: string; slug: string };
    familia: { id: string; codigo: string; responsavel: string } | null;
  };
  acompanhamento: {
    situacao: habitacao.SituacaoAcompanhamento;
    proximaVisitaEm: string | null;
    diasParaProxima: number | null;
  };
  visitas: VisitaRegistrada[];
  ocorrencias: OcorrenciaRegistrada[];
}

const TOM_SITUACAO: Record<habitacao.SituacaoAcompanhamento, TomStatus> = {
  SEM_ACOMPANHAMENTO: 'neutro',
  AGUARDANDO_PRIMEIRA: 'institucional',
  EM_DIA: 'sucesso',
  VENCENDO: 'atencao',
  VENCIDA: 'perigo',
};

const TOM_EIXO: Record<string, TomStatus> = {
  ADEQUADA: 'sucesso',
  ATENCAO: 'atencao',
  CRITICA: 'perigo',
  NAO_AVALIADA: 'neutro',
};

/**
 * A vida da unidade depois da chave: quem mora, quem visitou, o que foi encontrado e o que virou
 * ocorrência. É esta página que a prefeitura mostra quando alguém pergunta se acompanhou a família.
 */
export default async function PaginaUnidadeAcompanhamento({
  params,
}: {
  params: Promise<{ unidadeId: string }>;
}) {
  const { unidadeId } = await params;
  const [historico, sessao, assistente] = await Promise.all([
    apiFetch<Historico>(`/pos-entrega/unidades/${unidadeId}`),
    sessaoAtual(),
    apiFetch<{ disponivel: boolean }>('/assistente/estado'),
  ]);

  const caminho = `/acompanhamento/${unidadeId}`;
  const podeVisitar = sessao?.capacidades.includes('ACOMPANHAR_POS_ENTREGA') ?? false;
  const podeRegistrarOcorrencia = sessao?.capacidades.includes('REGISTRAR_OCORRENCIA') ?? false;
  const podeDecidir = sessao?.capacidades.includes('DECIDIR_OCORRENCIA') ?? false;

  const emAcompanhamento = habitacao.exigeAcompanhamento(historico.unidade.situacao);

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Acompanhamento', href: '/acompanhamento' },
          { rotulo: historico.unidade.identificacao },
        ]}
        titulo={historico.unidade.identificacao}
        subtitulo={
          <span className="tabular">
            {historico.unidade.protocolo} · {historico.unidade.endereco} ·{' '}
            <Link
              href={`/producao/${historico.unidade.empreendimento.slug}`}
              className="font-semibold hover:underline"
            >
              {historico.unidade.empreendimento.nome}
            </Link>
            {historico.unidade.familia && (
              <>
                {' '}
                ·{' '}
                <Link
                  href={`/familias/${historico.unidade.familia.id}`}
                  className="font-semibold hover:underline"
                >
                  {historico.unidade.familia.responsavel}
                </Link>{' '}
                · {historico.unidade.familia.codigo} · entregue em{' '}
                {data(historico.unidade.entregueEm)}
              </>
            )}
          </span>
        }
      />

      <CorpoTela className="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <EtiquetaStatus
            rotulo={habitacao.rotuloSituacaoAcompanhamento(historico.acompanhamento.situacao)}
            tom={TOM_SITUACAO[historico.acompanhamento.situacao]}
          />
          <p className="tabular text-xs text-texto-suave">
            Próxima visita: {data(historico.acompanhamento.proximaVisitaEm)}
          </p>
        </div>

        {!emAcompanhamento && (
          <div className="mt-4">
            <Aviso tom="info">
              Unidade {habitacao.rotuloSituacaoUnidade(historico.unidade.situacao).toLowerCase()} —
              fora do acompanhamento pós-entrega. O histórico abaixo permanece.
            </Aviso>
          </div>
        )}

        {podeVisitar && emAcompanhamento && (
          <section className="mt-6">
            <RegistrarVisita
              unidadeId={unidadeId}
              caminho={caminho}
              tecnicoPadrao={sessao?.nome ?? ''}
              primeiraVisita={historico.visitas.length === 0}
              unidade={historico.unidade.identificacao}
              familia={historico.unidade.familia?.responsavel ?? 'não informada'}
              assistenteDisponivel={assistente.disponivel}
            />
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-institucional">Ocorrências de uso</h2>
          <div className="mt-3">
            <PainelOcorrencias
              unidadeId={unidadeId}
              ocorrencias={historico.ocorrencias}
              caminho={caminho}
              podeRegistrar={podeRegistrarOcorrencia}
              podeDecidir={podeDecidir}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-institucional">
            Visitas de acompanhamento
          </h2>

          {historico.visitas.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-borda bg-surface p-6 text-center text-sm text-texto-suave">
              Nenhuma visita registrada. A primeira é a que confirma que a família está morando na
              unidade que recebeu.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {historico.visitas.map((visita) => (
                <li key={visita.id} className="rounded-lg border border-borda bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-texto">
                        {habitacao.rotuloTipoAcompanhamento(visita.tipo)} ·{' '}
                        {data(visita.visitadaEm)}
                      </p>
                      <p className="tabular text-xs text-texto-suave">
                        {visita.protocolo} · {visita.tecnicoNome}
                      </p>
                    </div>
                    <EtiquetaStatus
                      rotulo={
                        visita.residenciaConfirmada
                          ? 'Titular na unidade'
                          : 'Titular não encontrado'
                      }
                      tom={visita.residenciaConfirmada ? 'sucesso' : 'perigo'}
                    />
                  </div>

                  {!visita.residenciaConfirmada && visita.quemReside && (
                    <p className="mt-2 text-sm text-danger">
                      Encontrado na unidade: {visita.quemReside}
                    </p>
                  )}
                  {visita.moradoresEncontrados !== null && (
                    <p className="tabular mt-1 text-xs text-texto-suave">
                      {visita.moradoresEncontrados} morador(es) encontrado(s)
                    </p>
                  )}

                  <p className="mt-3 whitespace-pre-line text-sm text-texto">{visita.parecer}</p>

                  {visita.eixos.length > 0 && (
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {visita.eixos.map((eixo) => (
                        <li key={eixo.eixo} className="rounded-md border border-borda p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-texto">
                              {habitacao.rotuloEixo(eixo.eixo)}
                            </p>
                            <EtiquetaStatus
                              rotulo={habitacao.rotuloSituacaoEixo(eixo.situacao)}
                              tom={TOM_EIXO[eixo.situacao] ?? 'neutro'}
                            />
                          </div>
                          {eixo.observacao && (
                            <p className="mt-1 text-xs text-texto-suave">{eixo.observacao}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CorpoTela>
    </>
  );
}
