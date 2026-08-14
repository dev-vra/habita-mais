import Link from 'next/link';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { EncaminharFamilia } from '@/components/domain/encaminhar-familia';
import { PainelDiagnostico, type ItemDiagnostico } from '@/components/domain/painel-diagnostico';
import { InscreverEmPrograma } from '@/components/domain/inscrever-em-programa';
import { apiFetch } from '@/lib/api/server';
import { formatarNota, formatarReais, statusInscricao } from '@/lib/status';

interface Familia360 {
  id: string;
  codigo: string;
  responsavel: { nome: string; cpfMascarado: string; nis: string | null };
  ficha: {
    rendaFamiliar: number;
    rendaPerCapita: number;
    quantidadePessoas: number;
    quantidadeMenores: number;
    mulherChefeFamilia: boolean;
    temPessoaComDeficiencia: boolean;
    temIdoso: boolean;
    situacaoRisco: boolean;
    temLaudoRisco: boolean;
    moradiaInadequada: boolean;
    tipoMoradia: string;
    saneamento: string;
    mesesResidenciaMunicipio: number;
    apuradaEm: string;
    validaAte: string;
    vencida: boolean;
    origem: string;
  } | null;
  membros: { id: string; nome: string; parentesco: string; contribuiRenda: boolean }[];
  inscricoes: {
    id: string;
    protocolo: string;
    programa: string;
    programaSlug: string;
    situacao: string;
    pontuacao: number | null;
    itensPontuacao: { rotulo: string; pontos: number; peso: number; observacao?: string }[];
  }[];
  linhaDoTempo: { quando: string; titulo: string; detalhe: string }[];
  diagnostico: ItemDiagnostico[];
}

/**
 * Visão 360°: onde a família está em todos os módulos ao mesmo tempo. É a tela que impede
 * benefício duplicado por falta de visão cruzada (spec §4).
 */
export default async function PaginaFamilia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [familia, programas, setores] = await Promise.all([
    apiFetch<Familia360>(`/familias/${id}`),
    apiFetch<{ id: string; nome: string; situacao: string }[]>('/programas'),
    apiFetch<{ id: string; nome: string; sigla: string; tipo: string; ativo: boolean }[]>('/setores'),
  ]);
  const { ficha } = familia;
  const jaInscrita = new Set(familia.inscricoes.map((inscricao) => inscricao.programa));
  const abertos = programas
    .filter((programa) => programa.situacao === 'INSCRICOES_ABERTAS')
    .filter((programa) => !jaInscrita.has(programa.nome));

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-texto-suave">
        <Link href="/familias" className="hover:underline">
          Início › Famílias
        </Link>{' '}
        › {familia.responsavel.nome}
      </p>

      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-institucional">
            {familia.responsavel.nome}
          </h1>
          <p className="tabular mt-1 text-texto-suave">
            {familia.codigo} · CPF {familia.responsavel.cpfMascarado}
            {familia.responsavel.nis && ` · NIS ${familia.responsavel.nis}`}
            {ficha && ` · ${ficha.quantidadePessoas} pessoas`}
          </p>
        </div>
        <Link
          href={`/familias/${familia.id}/ficha`}
          className="rounded-md bg-primary px-4 py-2.5 font-semibold text-surface transition hover:bg-primary/90"
        >
          Nova apuração da ficha
        </Link>
      </div>

      <div className="mt-6">
        <PainelDiagnostico
          itens={familia.diagnostico}
          acoes={{
            SEM_FICHA: `/familias/${familia.id}/ficha`,
            FICHA_VENCIDA: `/familias/${familia.id}/ficha`,
            FICHA_VENCENDO: `/familias/${familia.id}/ficha`,
            SEM_FONTE_RENDA: `/familias/${familia.id}/ficha`,
            ENDERECO_INCOMPLETO: `/familias/${familia.id}/ficha`,
            COMPOSICAO_INCOMPLETA: `/familias/${familia.id}/ficha`,
            PENDENCIA_ABERTA: familia.inscricoes[0] ? `/inscricoes/${familia.inscricoes[0].id}` : '/pendencias',
            PONTUACAO_DESATUALIZADA: familia.inscricoes[0] ? `/inscricoes/${familia.inscricoes[0].id}` : '/familias',
            SEM_PONTUACAO: familia.inscricoes[0] ? `/inscricoes/${familia.inscricoes[0].id}` : '/familias',
          }}
        />
      </div>

      {ficha?.vencida && (
        <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-text">
          Ficha social vencida em {new Date(ficha.validaAte).toLocaleDateString('pt-BR')}. O
          recadastramento revalida quem segue na fila — sem ele, a inscrição é baixada.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-lg border border-borda bg-surface p-6">
          <h2 className="font-display text-lg font-bold text-institucional">Ficha social</h2>
          {ficha ? (
            <>
              <p className="mt-1 text-xs text-texto-suave">
                Apurada em {new Date(ficha.apuradaEm).toLocaleDateString('pt-BR')} · válida até{' '}
                {new Date(ficha.validaAte).toLocaleDateString('pt-BR')} · origem{' '}
                {ficha.origem === 'REURB' ? 'Regulariza+' : 'própria'}
              </p>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Dado rotulo="Renda familiar" valor={formatarReais(ficha.rendaFamiliar)} />
                <Dado rotulo="Renda per capita" valor={formatarReais(ficha.rendaPerCapita)} destaque />
                <Dado
                  rotulo="Composição"
                  valor={`${ficha.quantidadePessoas} pessoas · ${ficha.quantidadeMenores} menores`}
                />
                <Dado rotulo="Tempo no município" valor={`${anos(ficha.mesesResidenciaMunicipio)}`} />
                <Dado rotulo="Moradia atual" valor={rotuloMoradia(ficha.tipoMoradia)} />
                <Dado rotulo="Saneamento" valor={rotuloSaneamento(ficha.saneamento)} />
              </dl>

              <ul className="mt-4 flex flex-wrap gap-2">
                {ficha.mulherChefeFamilia && <Marcador>Mulher chefe de família</Marcador>}
                {ficha.temPessoaComDeficiencia && <Marcador>PCD no domicílio</Marcador>}
                {ficha.temIdoso && <Marcador>Idoso no domicílio</Marcador>}
                {ficha.moradiaInadequada && <Marcador>Moradia inadequada</Marcador>}
                {ficha.situacaoRisco && (
                  <Marcador alerta={!ficha.temLaudoRisco}>
                    {ficha.temLaudoRisco ? 'Risco com laudo' : 'Risco sem laudo — não pontua'}
                  </Marcador>
                )}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-texto-suave">Sem ficha social vigente.</p>
          )}

          {familia.membros.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-texto">Composição nominal</h3>
              <ul className="mt-2 space-y-1 text-sm text-texto-suave">
                {familia.membros.map((membro) => (
                  <li key={membro.id}>
                    {membro.nome} — {membro.parentesco.toLowerCase().replace('_', ' ')}
                    {membro.contribuiRenda && ' · contribui com renda'}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-borda bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-institucional">Na fila</h2>
            {familia.inscricoes.length === 0 && (
              <p className="mt-2 text-sm text-texto-suave">Sem inscrição em programa.</p>
            )}

            {familia.inscricoes.map((inscricao) => {
              const status = statusInscricao(inscricao.situacao);
              return (
                <article key={inscricao.id} className="mt-4 border-t border-borda pt-4 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/inscricoes/${inscricao.id}`}
                      className="font-semibold text-texto hover:underline"
                    >
                      {inscricao.programa}
                    </Link>
                    <EtiquetaStatus rotulo={status.rotulo} tom={status.tom} />
                  </div>
                  <p className="tabular mt-1 text-xs text-texto-suave">{inscricao.protocolo}</p>

                  {inscricao.pontuacao !== null && (
                    <>
                      <p className="tabular mt-3 font-display text-2xl font-extrabold text-institucional">
                        {formatarNota(inscricao.pontuacao)}
                        <span className="ml-1 text-sm font-normal text-texto-suave">pontos</span>
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {inscricao.itensPontuacao.map((item) => (
                          <li key={item.rotulo} className="flex justify-between gap-3">
                            <span className={item.pontos === 0 ? 'text-texto-suave' : 'text-texto'}>
                              {item.rotulo}
                              {item.observacao && (
                                <span className="block text-xs text-warning-text">{item.observacao}</span>
                              )}
                            </span>
                            <span className="tabular font-semibold">{formatarNota(item.pontos)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              );
            })}

            <div className="mt-4 border-t border-borda pt-4">
              <InscreverEmPrograma familiaId={familia.id} programas={abertos} />
            </div>
          </section>

          <section className="rounded-lg border border-borda bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-institucional">Outros setores</h2>
            <p className="mt-1 text-xs text-texto-suave">
              Defesa Civil, Jurídico, Obras. O laudo de risco pedido aqui volta valendo na ficha.
            </p>
            <div className="mt-3">
              <EncaminharFamilia
                familiaId={familia.id}
                resumoSugerido={`${familia.responsavel.nome} · ${familia.codigo}${
                  ficha ? ` · ${ficha.quantidadePessoas} pessoas` : ''
                }`}
                setores={setores.filter((setor) => setor.ativo)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-borda bg-surface p-6">
            <h2 className="font-display text-lg font-bold text-institucional">Linha do tempo</h2>
            <ol className="mt-3 space-y-3">
              {familia.linhaDoTempo.map((evento, indice) => (
                <li key={`${evento.quando}-${indice}`} className="border-l-2 border-borda pl-3">
                  <p className="text-sm font-semibold text-texto">{evento.titulo}</p>
                  <p className="text-xs text-texto-suave">
                    {new Date(evento.quando).toLocaleDateString('pt-BR')} · {evento.detalhe}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-texto-suave">{rotulo}</dt>
      <dd className={`tabular ${destaque ? 'font-bold text-institucional' : 'text-texto'}`}>{valor}</dd>
    </div>
  );
}

function Marcador({ children, alerta = false }: { children: React.ReactNode; alerta?: boolean }) {
  return (
    <li
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        alerta ? 'bg-warning/15 text-warning-text' : 'bg-institucional/10 text-institucional'
      }`}
    >
      {children}
    </li>
  );
}

function anos(meses: number): string {
  const total = Math.floor(meses / 12);
  if (total < 1) return `${meses} meses`;
  return `${total} ${total === 1 ? 'ano' : 'anos'}`;
}

const MORADIAS: Record<string, string> = {
  ALUGADA: 'Alugada',
  CEDIDA: 'Cedida',
  OCUPACAO: 'Ocupação',
  PROPRIA_QUITADA: 'Própria quitada',
  PROPRIA_FINANCIADA: 'Própria financiada',
  ABRIGO: 'Abrigo',
  SITUACAO_RUA: 'Situação de rua',
  OUTRO: 'Outro',
};

const SANEAMENTOS: Record<string, string> = {
  REDE_PUBLICA: 'Rede pública',
  FOSSA_SEPTICA: 'Fossa séptica',
  FOSSA_RUDIMENTAR: 'Fossa rudimentar',
  CEU_ABERTO: 'A céu aberto',
  OUTRO: 'Outro',
};

const rotuloMoradia = (valor: string): string => MORADIAS[valor] ?? valor;
const rotuloSaneamento = (valor: string): string => SANEAMENTOS[valor] ?? valor;
