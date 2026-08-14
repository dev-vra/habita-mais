import { habitacao } from '@habita/shared';
import { apiFetch } from '@/lib/api/server';
import { sessaoAtual } from '@/lib/auth/session';
import { AcoesEncaminhamento } from './acoes-encaminhamento';

interface Encaminhamento {
  id: string;
  numero: string;
  tipoSolicitacao: string;
  assunto: string;
  descricao: string;
  referenciaResumo: string;
  prazoAte: string;
  vencido: boolean;
  situacao: string;
  origem: { sigla: string; nome: string };
  destino: { sigla: string; nome: string };
  resposta: string | null;
  respondidoEm: string | null;
  anexoKey: string | null;
}

const SITUACOES: Record<string, { rotulo: string; classe: string }> = {
  ABERTO: { rotulo: 'Aberto', classe: 'bg-warning/15 text-warning-text' },
  RESPONDIDO: { rotulo: 'Respondido', classe: 'bg-success/10 text-success' },
  DEVOLVIDO: { rotulo: 'Devolvido', classe: 'bg-danger/10 text-danger' },
  CANCELADO: { rotulo: 'Cancelado', classe: 'bg-background text-texto-suave' },
};

/**
 * Caixa de encaminhamentos — a mesma tela para os dois lados do balcão interno.
 *
 * A Habitação vê o que pediu; o setor externo vê o que recebeu. Quem decide o que aparece é a RLS,
 * não um filtro desta página.
 */
export default async function PaginaEncaminhamentos() {
  const [sessao, encaminhamentos] = await Promise.all([
    sessaoAtual(),
    apiFetch<Encaminhamento[]>('/encaminhamentos'),
  ]);

  const podeResponder = sessao?.capacidades.includes('RESPONDER_ENCAMINHAMENTO') ?? false;
  const abertos = encaminhamentos.filter((item) => item.situacao === 'ABERTO');

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">Início › Encaminhamentos</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Encaminhamentos entre setores
      </h1>
      <p className="mt-1 text-texto-suave">
        {abertos.length} em aberto de {encaminhamentos.length} no total. Cada pedido carrega prazo —
        encaminhar sem prazo é arquivar.
      </p>

      <ul className="mt-6 space-y-3">
        {encaminhamentos.map((encaminhamento) => {
          const situacao = SITUACOES[encaminhamento.situacao] ?? {
            rotulo: encaminhamento.situacao,
            classe: 'bg-background text-texto-suave',
          };

          return (
            <li
              key={encaminhamento.id}
              className={`rounded-lg border bg-surface p-5 ${
                encaminhamento.vencido ? 'border-danger/40' : 'border-borda'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-texto">
                    {encaminhamento.assunto}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${situacao.classe}`}
                    >
                      {situacao.rotulo}
                    </span>
                  </p>
                  <p className="tabular text-xs text-texto-suave">
                    {encaminhamento.numero} ·{' '}
                    {habitacao.rotuloTipoSolicitacao(encaminhamento.tipoSolicitacao)} ·{' '}
                    {encaminhamento.origem.sigla} → {encaminhamento.destino.sigla}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    encaminhamento.vencido ? 'text-danger' : 'text-texto-suave'
                  }`}
                >
                  {encaminhamento.vencido ? 'Vencido em ' : 'Prazo até '}
                  {new Date(encaminhamento.prazoAte).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <p className="mt-3 rounded-md bg-background px-3 py-2 text-sm text-texto">
                {encaminhamento.referenciaResumo}
              </p>
              <p className="mt-2 text-sm text-texto-suave">{encaminhamento.descricao}</p>

              {encaminhamento.resposta && (
                <div className="mt-3 border-l-2 border-success/40 pl-3">
                  <p className="text-xs font-semibold text-texto-suave">
                    Resposta em{' '}
                    {encaminhamento.respondidoEm &&
                      new Date(encaminhamento.respondidoEm).toLocaleDateString('pt-BR')}
                    {encaminhamento.anexoKey && ' · com documento anexado'}
                  </p>
                  <p className="mt-1 text-sm text-texto">{encaminhamento.resposta}</p>
                </div>
              )}

              {encaminhamento.situacao === 'ABERTO' && podeResponder && (
                <AcoesEncaminhamento
                  encaminhamentoId={encaminhamento.id}
                  pedeDocumento={encaminhamento.tipoSolicitacao === 'LAUDO_RISCO'}
                />
              )}
            </li>
          );
        })}
      </ul>

      {encaminhamentos.length === 0 && (
        <p className="mt-8 text-center text-texto-suave">
          Nenhum encaminhamento. Abra um pela ficha da família ou pela inscrição.
        </p>
      )}
    </div>
  );
}
