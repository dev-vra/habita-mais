import Link from 'next/link';
import { AcaoPrimaria, CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { Aviso } from '@/components/ui/formulario';
import { Stepper } from '@/components/ui/stepper';
import { Tabs } from '@/components/ui/tabs';
import { EncaminharFamilia } from '@/components/domain/encaminhar-familia';
import { PainelConferencia, type ConferenciaFicha } from '@/components/domain/painel-conferencia';
import { PainelDiagnostico, type ItemDiagnostico } from '@/components/domain/painel-diagnostico';
import {
  PainelDocumental,
  type ItemDocumental,
  type ResumoDocumental,
} from '@/components/domain/painel-documental';
import { InscreverEmPrograma } from '@/components/domain/inscrever-em-programa';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { formatarDataHora, formatarNota, formatarReais, statusInscricao } from '@/lib/status';
import { cn } from '@/lib/cn';
import { AnexarDocumento } from './anexar-documento';

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
 * As cinco etapas por onde a inscrição passa. É a leitura que a família faz no balcão ("estou em
 * qual parte?") e a que o servidor confere antes de convocar.
 */
const ETAPAS = [
  { rotulo: 'Cadastro' },
  { rotulo: 'Análise documental' },
  { rotulo: 'Visita domiciliar' },
  { rotulo: 'Classificação' },
  { rotulo: 'Convocação' },
];

/** Deriva a etapa da situação da inscrição — a situação é a fonte, o passo é só a leitura dela. */
const ETAPA_POR_SITUACAO: Record<string, number> = {
  EM_ANALISE: 1,
  PENDENTE: 1,
  APTA: 3,
  EM_RECURSO: 3,
  CONVOCADA: 4,
  CONTEMPLADA: 4,
  INDEFERIDA: 3,
  INELEGIVEL: 3,
  DESISTENTE: 4,
  CANCELADA: 1,
};

/**
 * Visão 360°: onde a família está em todos os módulos ao mesmo tempo. É a tela que impede
 * benefício duplicado por falta de visão cruzada (spec §4).
 *
 * Duas colunas: à esquerda quem é a família e o que se sabe dela, em abas; à direita onde ela está
 * e o que já aconteceu. O que exige decisão (diagnóstico, ficha vencida) fica antes das abas — não
 * pode depender de o servidor lembrar de clicar numa aba para descobrir.
 */
export default async function PaginaFamilia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [familia, programas, setores, conferencia, documental, tipos, sessao] = await Promise.all([
    apiFetch<Familia360>(`/familias/${id}`),
    apiFetch<{ id: string; nome: string; situacao: string }[]>('/programas'),
    apiFetch<{ id: string; nome: string; sigla: string; tipo: string; ativo: boolean }[]>('/setores'),
    apiFetch<ConferenciaFicha>(`/assistente/conferencia/${id}`),
    apiFetch<{ itens: ItemDocumental[]; resumo: ResumoDocumental }>(
      `/documentos/situacao/FAMILIA/${id}`,
    ),
    apiFetch<{ id: string; codigo: string; nome: string }[]>('/tipos-documento'),
    sessaoAtual(),
  ]);

  const { ficha } = familia;
  const jaInscrita = new Set(familia.inscricoes.map((inscricao) => inscricao.programa));
  const abertos = programas
    .filter((programa) => programa.situacao === 'INSCRICOES_ABERTAS')
    .filter((programa) => !jaInscrita.has(programa.nome));

  const principal = familia.inscricoes[0];
  const etapaAtual = principal ? (ETAPA_POR_SITUACAO[principal.situacao] ?? 1) : 0;

  return (
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Famílias', href: '/familias' },
          { rotulo: familia.responsavel.nome },
        ]}
        titulo={familia.responsavel.nome}
        subtitulo={
          <span className="tabular">
            {familia.codigo} · CPF {familia.responsavel.cpfMascarado}
            {familia.responsavel.nis && ` · NIS ${familia.responsavel.nis}`}
            {ficha && ` · ${ficha.quantidadePessoas} pessoas`}
          </span>
        }
        acoes={<AcaoPrimaria href={`/familias/${familia.id}/ficha`}>Nova apuração da ficha</AcaoPrimaria>}
      />

      <CorpoTela>
        <PainelDiagnostico
          itens={familia.diagnostico}
          acoes={{
            SEM_FICHA: `/familias/${familia.id}/ficha`,
            FICHA_VENCIDA: `/familias/${familia.id}/ficha`,
            FICHA_VENCENDO: `/familias/${familia.id}/ficha`,
            SEM_FONTE_RENDA: `/familias/${familia.id}/ficha`,
            ENDERECO_INCOMPLETO: `/familias/${familia.id}/ficha`,
            COMPOSICAO_INCOMPLETA: `/familias/${familia.id}/ficha`,
            PENDENCIA_ABERTA: principal ? `/inscricoes/${principal.id}` : '/pendencias',
            PONTUACAO_DESATUALIZADA: principal ? `/inscricoes/${principal.id}` : '/familias',
            SEM_PONTUACAO: principal ? `/inscricoes/${principal.id}` : '/familias',
          }}
        />

        {ficha?.vencida && (
          <div className="mt-4">
            <Aviso tom="warning">
              Ficha social vencida em {new Date(ficha.validaAte).toLocaleDateString('pt-BR')}. O
              recadastramento revalida quem segue na fila — sem ele, a inscrição é baixada.
            </Aviso>
          </div>
        )}

        <div className="mt-5 grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(330px,1fr))]">
          <section className="animate-subir rounded-lg border border-borda bg-surface p-5">
            <p className="tabular text-xs text-texto-suave">
              {familia.codigo}
              {ficha && ` · ficha apurada em ${new Date(ficha.apuradaEm).toLocaleDateString('pt-BR')}`}
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold text-institucional">
              {familia.responsavel.nome}
            </h2>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {principal && (
                <EtiquetaStatus
                  rotulo={statusInscricao(principal.situacao).rotulo}
                  tom={statusInscricao(principal.situacao).tom}
                />
              )}
              {principal?.pontuacao !== null && principal?.pontuacao !== undefined && (
                <span className="tabular rounded-full bg-institucional/10 px-2.5 py-1 text-xs font-semibold text-institucional">
                  {formatarNota(principal.pontuacao)} pontos
                </span>
              )}
              {ficha?.origem === 'REURB' && (
                <span className="rounded-full bg-vinculo-reurb/10 px-2.5 py-1 text-xs font-semibold text-vinculo-reurb">
                  Ficha vinda do Regulariza+
                </span>
              )}
            </div>

            <div className="mt-4">
              <Tabs
                abas={[
                  {
                    chave: 'resumo',
                    rotulo: 'Resumo',
                    conteudo: (
                      <div className="space-y-4">
                        <PainelConferencia
                          conferencia={conferencia}
                          hrefFicha={`/familias/${familia.id}/ficha`}
                        />
                        {ficha ? (
                          <dl>
                            <Par rotulo="Renda familiar" valor={formatarReais(ficha.rendaFamiliar)} tabular />
                            <Par
                              rotulo="Renda per capita"
                              valor={formatarReais(ficha.rendaPerCapita)}
                              tabular
                              destaque
                            />
                            <Par
                              rotulo="Composição"
                              valor={`${ficha.quantidadePessoas} pessoas · ${ficha.quantidadeMenores} menores`}
                            />
                            <Par rotulo="Tempo no município" valor={anos(ficha.mesesResidenciaMunicipio)} />
                            <Par
                              rotulo="Ficha válida até"
                              valor={new Date(ficha.validaAte).toLocaleDateString('pt-BR')}
                              tabular
                            />
                          </dl>
                        ) : (
                          <p className="text-[13px] text-texto-suave">Sem ficha social vigente.</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    chave: 'ficha',
                    rotulo: 'Ficha social',
                    conteudo: ficha ? (
                      <>
                        <dl>
                          <Par rotulo="Renda familiar" valor={formatarReais(ficha.rendaFamiliar)} tabular />
                          <Par rotulo="Renda per capita" valor={formatarReais(ficha.rendaPerCapita)} tabular />
                          <Par rotulo="Moradia atual" valor={rotuloMoradia(ficha.tipoMoradia)} />
                          <Par rotulo="Saneamento" valor={rotuloSaneamento(ficha.saneamento)} />
                          <Par rotulo="Tempo no município" valor={anos(ficha.mesesResidenciaMunicipio)} />
                          <Par
                            rotulo="Apurada em"
                            valor={new Date(ficha.apuradaEm).toLocaleDateString('pt-BR')}
                            tabular
                          />
                          <Par
                            rotulo="Origem"
                            valor={ficha.origem === 'REURB' ? 'Regulariza+' : 'própria'}
                          />
                        </dl>

                        <ul className="mt-3 flex flex-wrap gap-2">
                          {ficha.mulherChefeFamilia && <Marcador>Mulher chefe de família</Marcador>}
                          {ficha.temPessoaComDeficiencia && <Marcador>PcD no domicílio</Marcador>}
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
                      <p className="text-[13px] text-texto-suave">Sem ficha social vigente.</p>
                    ),
                  },
                  {
                    chave: 'composicao',
                    rotulo: 'Composição',
                    conteudo:
                      familia.membros.length > 0 ? (
                        <ul className="space-y-2">
                          {familia.membros.map((membro) => (
                            <li key={membro.id} className="flex items-center gap-3">
                              <span
                                aria-hidden
                                className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-institucional/10 text-[11px] font-bold text-institucional"
                              >
                                {iniciais(membro.nome)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[13.5px] font-semibold text-texto">
                                  {membro.nome}
                                </span>
                                <span className="block text-[11.5px] text-texto-suave">
                                  {membro.parentesco.toLowerCase().replace('_', ' ')}
                                  {membro.contribuiRenda && ' · contribui com renda'}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[13px] text-texto-suave">
                          Só o responsável no domicílio, segundo a ficha vigente.
                        </p>
                      ),
                  },
                  {
                    chave: 'documentos',
                    rotulo: 'Documentos',
                    conteudo: (
                      <PainelDocumental
                        titulo="Documentos da família"
                        escopo="FAMILIA"
                        referenciaId={familia.id}
                        itens={documental.itens}
                        resumo={documental.resumo}
                        tipos={tipos}
                        caminho={`/familias/${familia.id}`}
                        podeConferir={sessao?.capacidades.includes('VALIDAR_DOCUMENTACAO') ?? false}
                      />
                    ),
                  },
                  {
                    chave: 'inscricoes',
                    rotulo: 'Inscrições',
                    conteudo: (
                      <div>
                        {familia.inscricoes.length === 0 && (
                          <p className="text-[13px] text-texto-suave">Sem inscrição em programa.</p>
                        )}

                        {familia.inscricoes.map((inscricao) => (
                          <article
                            key={inscricao.id}
                            className="border-t border-borda pt-4 first:border-0 first:pt-0"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <Link
                                href={`/inscricoes/${inscricao.id}`}
                                className="text-[13.5px] font-semibold text-texto hover:underline"
                              >
                                {inscricao.programa}
                              </Link>
                              <EtiquetaStatus
                                rotulo={statusInscricao(inscricao.situacao).rotulo}
                                tom={statusInscricao(inscricao.situacao).tom}
                              />
                            </div>
                            <p className="tabular mt-0.5 text-[11.5px] text-texto-suave">
                              {inscricao.protocolo}
                            </p>

                            {inscricao.pontuacao !== null && (
                              <>
                                <p className="tabular mt-2.5 font-display text-[22px] font-extrabold text-institucional">
                                  {formatarNota(inscricao.pontuacao)}
                                  <span className="ml-1 text-xs font-normal text-texto-suave">
                                    pontos
                                  </span>
                                </p>
                                <ul className="mt-2 space-y-1 text-[13px]">
                                  {inscricao.itensPontuacao.map((item) => (
                                    <li key={item.rotulo} className="flex justify-between gap-3">
                                      <span className={item.pontos === 0 ? 'text-texto-suave' : 'text-texto'}>
                                        {item.rotulo}
                                        {item.observacao && (
                                          <span className="block text-[11.5px] text-warning-text">
                                            {item.observacao}
                                          </span>
                                        )}
                                      </span>
                                      <span className="tabular font-semibold">
                                        {formatarNota(item.pontos)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </article>
                        ))}

                        <div className="mt-4 border-t border-borda pt-4">
                          <InscreverEmPrograma familiaId={familia.id} programas={abertos} />
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            <div className="mt-5 border-t border-borda pt-4">
              <AnexarDocumento familiaId={familia.id} tipos={tipos} />
            </div>

            <div className="mt-4 border-t border-borda pt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-texto-suave">
                Encaminhar a setor
              </p>
              <p className="mt-1 text-[11.5px] text-texto-suave">
                Defesa Civil, Jurídico, Obras. O laudo de risco pedido aqui volta valendo na ficha.
              </p>
              <div className="mt-2.5">
                <EncaminharFamilia
                  familiaId={familia.id}
                  resumoSugerido={`${familia.responsavel.nome} · ${familia.codigo}${
                    ficha ? ` · ${ficha.quantidadePessoas} pessoas` : ''
                  }`}
                  setores={setores.filter((setor) => setor.ativo)}
                />
              </div>
            </div>
          </section>

          <div className="space-y-4">
            <section className="animate-subir rounded-lg border border-borda bg-surface p-5">
              <h2 className="font-display text-[15.5px] font-bold text-institucional">
                Etapa da inscrição
              </h2>
              <p className="mt-1 text-[11.5px] text-texto-suave">
                {principal
                  ? `${principal.programa} · ${principal.protocolo}`
                  : 'Sem inscrição em programa — o cadastro está concluído.'}
              </p>
              <div className="mt-4">
                <Stepper etapas={ETAPAS} atual={etapaAtual} />
              </div>
            </section>

            <section className="animate-subir rounded-lg border border-borda bg-surface p-5">
              <h2 className="font-display text-[15.5px] font-bold text-institucional">
                Trilha de auditoria
              </h2>
              <ol className="mt-4 space-y-4">
                {familia.linhaDoTempo.map((evento, indice) => (
                  <li key={`${evento.quando}-${indice}`} className="relative pl-5">
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-0 top-1 size-[9px] rounded-full',
                        indice === 0
                          ? 'bg-primary shadow-[0_0_0_4px_rgba(151,98,15,0.12)]'
                          : 'bg-borda',
                      )}
                    />
                    {indice < familia.linhaDoTempo.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[3.75px] top-[18px] h-[calc(100%+8px)] w-[1.5px] bg-borda"
                      />
                    )}
                    <p className="text-[13.5px] font-semibold text-texto">{evento.titulo}</p>
                    <p className="tabular text-xs text-texto-suave">
                      {formatarDataHora(evento.quando)} · {evento.detalhe}
                    </p>
                  </li>
                ))}

                {familia.linhaDoTempo.length === 0 && (
                  <li className="text-[13px] text-texto-suave">
                    Sem eventos registrados para esta família.
                  </li>
                )}
              </ol>
            </section>
          </div>
        </div>
      </CorpoTela>
    </>
  );
}

function Par({
  rotulo,
  valor,
  tabular = false,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  tabular?: boolean;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-borda py-2.5 last:border-b-0">
      <dt className="w-[152px] shrink-0 text-xs text-texto-suave">{rotulo}</dt>
      <dd
        className={cn(
          'min-w-0 flex-1 text-[13px]',
          tabular && 'tabular',
          destaque ? 'font-bold text-institucional' : 'text-texto',
        )}
      >
        {valor}
      </dd>
    </div>
  );
}

function Marcador({ children, alerta = false }: { children: React.ReactNode; alerta?: boolean }) {
  return (
    <li
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold',
        alerta ? 'bg-warning/15 text-warning-text' : 'bg-institucional/10 text-institucional',
      )}
    >
      {children}
    </li>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase();
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
