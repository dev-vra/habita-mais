import { LogoHabita } from '@/components/brand/logo';
import { buscarNaCentral, sairMunicipe } from '@/app/actions/municipe';
import { tokenMunicipe } from '@/lib/auth/municipe';
import { formatarNota } from '@/lib/status';
import { FormularioAcesso } from './formulario-acesso';
import { FormularioRecurso } from './formulario-recurso';

interface SituacaoDoMunicipe {
  protocolo: string;
  programa: string;
  inscritaEm: string;
  situacao: string;
  posicao: number | null;
  totalClassificadas: number | null;
  pontuacao: { total: number; totalMaximo: number; calculadaEm: string } | null;
  comoAnotaEFeita: { rotulo: string; pontos: number; peso: number; observacao?: string }[];
  documentos: { tipo: string; descricao: string; prazoAte: string; situacao: string }[];
  linhaDoTempo: { quando: string; titulo: string; detalhe: string }[];
  recursoEmAnalise: { protocolo: string; prazoRespostaAte: string } | null;
  podeRecorrer: boolean;
}

interface Municipio {
  id: string;
  nome: string;
  municipio: string;
  uf: string;
}

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/**
 * Central do munícipe. Entra com protocolo e CPF, vê a própria posição e a própria pontuação —
 * nunca a de terceiro, nem por inferência.
 */
export default async function PaginaMinhaInscricao() {
  const token = await tokenMunicipe();

  if (!token) {
    const municipios = (await fetch(`${BASE}/municipios`, { cache: 'no-store' }).then((r) =>
      r.json(),
    )) as Municipio[];
    return <Acesso municipios={municipios} />;
  }

  const situacao = await buscarNaCentral<SituacaoDoMunicipe>('/minha-inscricao');

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between">
        <LogoHabita tamanho={36} />
        <form action={sairMunicipe}>
          <button type="submit" className="text-sm text-texto-suave underline underline-offset-4">
            Sair
          </button>
        </form>
      </header>

      <h1 className="mt-8 font-display text-3xl font-extrabold text-institucional">
        Sua inscrição
      </h1>
      <p className="tabular mt-1 text-texto-suave">
        {situacao.programa} · protocolo {situacao.protocolo} · inscrita em{' '}
        {new Date(situacao.inscritaEm).toLocaleDateString('pt-BR')}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-borda bg-surface p-6">
          <p className="text-sm text-texto-suave">Sua posição hoje</p>
          <p className="tabular mt-1 font-display text-4xl font-extrabold text-institucional">
            {situacao.posicao ? `${situacao.posicao}º` : '—'}
          </p>
          <p className="mt-1 text-xs text-texto-suave">
            {situacao.totalClassificadas
              ? `entre ${situacao.totalClassificadas.toLocaleString('pt-BR')} famílias aptas`
              : 'a classificação ainda não foi publicada'}
          </p>
        </div>

        <div className="rounded-lg border border-borda bg-surface p-6">
          <p className="text-sm text-texto-suave">Sua pontuação</p>
          <p className="tabular mt-1 font-display text-4xl font-extrabold text-institucional">
            {situacao.pontuacao ? formatarNota(situacao.pontuacao.total) : '—'}
          </p>
          <p className="mt-1 text-xs text-texto-suave">
            {situacao.pontuacao
              ? `calculada em ${new Date(situacao.pontuacao.calculadaEm).toLocaleDateString('pt-BR')}`
              : 'aguardando cálculo'}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">O que já aconteceu</h2>
        <ol className="mt-3 space-y-3">
          {situacao.linhaDoTempo.map((evento, indice) => (
            <li key={`${evento.quando}-${indice}`} className="border-l-2 border-borda pl-3">
              <p className="font-semibold text-texto">{evento.titulo}</p>
              <p className="text-sm text-texto-suave">
                {new Date(evento.quando).toLocaleDateString('pt-BR')} · {evento.detalhe}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Documentos</h2>
        {situacao.documentos.filter((d) => d.situacao === 'ABERTA' || d.situacao === 'VENCIDA')
          .length === 0 ? (
          <p className="mt-2 rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
            Está tudo entregue. Nada pendente do seu lado.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {situacao.documentos
              .filter((documento) => documento.situacao === 'ABERTA' || documento.situacao === 'VENCIDA')
              .map((documento) => (
                <li
                  key={documento.tipo}
                  className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-text"
                >
                  <p className="font-semibold">{documento.tipo}</p>
                  <p>{documento.descricao}</p>
                  <p className="text-xs">
                    Entregar até {new Date(documento.prazoAte).toLocaleDateString('pt-BR')} na
                    Secretaria de Habitação.
                  </p>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Como a nota é feita</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Os critérios e pesos deste programa são públicos. Esta é a sua nota, item a item.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {situacao.comoAnotaEFeita.map((item) => (
            <li key={item.rotulo} className="flex justify-between gap-3 border-b border-borda py-1.5">
              <span className={item.pontos === 0 ? 'text-texto-suave' : 'text-texto'}>
                {item.rotulo}
                {item.observacao && (
                  <span className="block text-xs text-warning-text">{item.observacao}</span>
                )}
              </span>
              <span className="tabular font-semibold">
                {formatarNota(item.pontos)}
                <span className="text-texto-suave"> / {item.peso}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-institucional">Não concorda?</h2>
        {situacao.recursoEmAnalise ? (
          <p className="mt-2 rounded-md border border-vinculo-reurb/30 bg-vinculo-reurb/5 px-4 py-3 text-sm text-vinculo-reurb">
            Seu recurso {situacao.recursoEmAnalise.protocolo} está em análise. A resposta sai até{' '}
            {new Date(situacao.recursoEmAnalise.prazoRespostaAte).toLocaleDateString('pt-BR')}.
          </p>
        ) : situacao.podeRecorrer ? (
          <FormularioRecurso />
        ) : (
          <p className="mt-2 text-sm text-texto-suave">
            O prazo de recurso abre quando a classificação é publicada.
          </p>
        )}
      </section>

      <p className="mt-10 rounded-md bg-background px-4 py-3 text-sm text-texto-suave">
        Estar em primeiro lugar não garante a casa: a convocação depende de unidade disponível e da
        reconferência dos seus dados no dia do atendimento.
      </p>
    </main>
  );
}

function Acesso({ municipios }: { municipios: Municipio[] }) {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <LogoHabita tamanho={40} />
      <h1 className="mt-8 font-display text-2xl font-bold text-institucional">Sua inscrição</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Entre com o número do protocolo e o CPF do responsável familiar.
      </p>

      <FormularioAcesso municipios={municipios} />

      <p className="mt-10 text-xs text-texto-suave">
        Você vê apenas a sua própria situação. Nome, CPF e pontuação de outras famílias não são
        exibidos aqui.
      </p>
    </main>
  );
}
