import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { PainelOcorrencias } from '@/components/domain/painel-ocorrencias';
import { RegistrarVisita } from '@/components/domain/registrar-visita';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { data } from '@/lib/formato';

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

const TOM_EIXO: Record<string, string> = {
  ADEQUADA: 'bg-success/10 text-success',
  ATENCAO: 'bg-warning/15 text-warning-text',
  CRITICA: 'bg-danger/10 text-danger',
  NAO_AVALIADA: 'bg-background text-texto-suave',
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
  const [historico, sessao] = await Promise.all([
    apiFetch<Historico>(`/pos-entrega/unidades/${unidadeId}`),
    sessaoAtual(),
  ]);

  const caminho = `/acompanhamento/${unidadeId}`;
  const podeVisitar = sessao?.capacidades.includes('ACOMPANHAR_POS_ENTREGA') ?? false;
  const podeRegistrarOcorrencia = sessao?.capacidades.includes('REGISTRAR_OCORRENCIA') ?? false;
  const podeDecidir = sessao?.capacidades.includes('DECIDIR_OCORRENCIA') ?? false;

  const emAcompanhamento = habitacao.exigeAcompanhamento(historico.unidade.situacao);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">
        <Link href="/acompanhamento" className="hover:underline">
          Pós-entrega
        </Link>{' '}
        › {historico.unidade.identificacao}
      </p>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            {historico.unidade.identificacao}
          </h1>
          <p className="tabular mt-1 text-sm text-texto-suave">
            {historico.unidade.protocolo} · {historico.unidade.endereco} ·{' '}
            <Link
              href={`/producao/${historico.unidade.empreendimento.slug}`}
              className="font-semibold text-primary hover:underline"
            >
              {historico.unidade.empreendimento.nome}
            </Link>
          </p>
          {historico.unidade.familia && (
            <p className="mt-1 text-sm text-texto">
              <Link
                href={`/familias/${historico.unidade.familia.id}`}
                className="font-semibold text-primary hover:underline"
              >
                {historico.unidade.familia.responsavel}
              </Link>
              <span className="tabular text-texto-suave">
                {' '}
                · {historico.unidade.familia.codigo} · entregue em{' '}
                {data(historico.unidade.entregueEm)}
              </span>
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold text-texto-suave">Próxima visita</p>
          <p className="tabular text-lg font-bold text-institucional">
            {data(historico.acompanhamento.proximaVisitaEm)}
          </p>
          <p className="text-xs text-texto-suave">
            {habitacao.rotuloSituacaoAcompanhamento(historico.acompanhamento.situacao)}
          </p>
        </div>
      </div>

      {!emAcompanhamento && (
        <p className="mt-4 rounded-md bg-background px-4 py-3 text-sm text-texto-suave">
          Unidade {habitacao.rotuloSituacaoUnidade(historico.unidade.situacao).toLowerCase()} — fora
          do acompanhamento pós-entrega. O histórico abaixo permanece.
        </p>
      )}

      {podeVisitar && emAcompanhamento && (
        <section className="mt-6">
          <RegistrarVisita
            unidadeId={unidadeId}
            caminho={caminho}
            tecnicoPadrao={sessao?.nome ?? ''}
            primeiraVisita={historico.visitas.length === 0}
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
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      visita.residenciaConfirmada
                        ? 'bg-success/10 text-success'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {visita.residenciaConfirmada
                      ? 'Titular na unidade'
                      : 'Titular não encontrado'}
                  </span>
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
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TOM_EIXO[eixo.situacao]}`}
                          >
                            {habitacao.rotuloSituacaoEixo(eixo.situacao)}
                          </span>
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
    </div>
  );
}
