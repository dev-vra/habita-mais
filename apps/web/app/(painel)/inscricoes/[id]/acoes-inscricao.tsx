'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  abrirPendencia,
  convocar,
  recalcularInscricao,
  registrarDesfecho,
  resolverPendencia,
} from '@/app/actions/inscricoes';
import { Aviso } from '@/components/ui/formulario';

interface Pendencia {
  id: string;
  tipo: string;
  descricao: string;
  prazoAte: string;
  situacao: string;
  vencida: boolean;
}

const DESFECHOS = [
  { valor: 'COMPARECEU', rotulo: 'Compareceu e segue elegível' },
  { valor: 'NAO_COMPARECEU', rotulo: 'Não compareceu' },
  { valor: 'RECUSOU', rotulo: 'Recusou a unidade' },
  { valor: 'INELEGIVEL', rotulo: 'Deixou de ser elegível' },
];

/**
 * Ações do caso. A convocação fora de ordem fica atrás de um marcador e exige motivo — a UI
 * reflete a regra: é exceção, não um botão a mais.
 */
export function AcoesInscricao({
  inscricaoId,
  programaId,
  situacao,
  pendencias,
  convocacaoAberta,
}: {
  inscricaoId: string;
  programaId: string;
  situacao: string;
  pendencias: Pendencia[];
  convocacaoAberta?: string;
}) {
  const [erro, setErro] = useState<string | undefined>();
  const [foraDeOrdem, setForaDeOrdem] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  const abertas = pendencias.filter((p) => p.situacao === 'ABERTA' || p.situacao === 'VENCIDA');

  return (
    <div className="space-y-6">
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <section className="rounded-lg border border-borda bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-institucional">Pendências</h2>

        {abertas.length === 0 && (
          <p className="mt-2 text-sm text-texto-suave">
            Nada pendente. A inscrição concorre normalmente.
          </p>
        )}

        <ul className="mt-3 space-y-2">
          {abertas.map((pendencia) => (
            <li key={pendencia.id} className="rounded-md bg-background p-3">
              <p className="font-semibold text-texto">{pendencia.tipo}</p>
              <p className="text-sm text-texto-suave">{pendencia.descricao}</p>
              <p className={`text-xs ${pendencia.vencida ? 'text-danger' : 'text-texto-suave'}`}>
                Prazo até {new Date(pendencia.prazoAte).toLocaleDateString('pt-BR')}
                {pendencia.vencida && ' · vencido'}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => rodar(() => resolverPendencia(pendencia.id, inscricaoId, 'RESOLVIDA'))}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
                >
                  Documento entregue
                </button>
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => rodar(() => resolverPendencia(pendencia.id, inscricaoId, 'DISPENSADA'))}
                  className="rounded-md border border-borda px-3 py-1 text-xs font-semibold text-institucional hover:bg-background disabled:opacity-60"
                >
                  Dispensar
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form
          className="mt-4 space-y-3 border-t border-borda pt-4"
          action={(form) =>
            rodar(() =>
              abrirPendencia(inscricaoId, {
                tipo: String(form.get('tipo') ?? ''),
                descricao: String(form.get('descricao') ?? ''),
                prazoAte: String(form.get('prazoAte') ?? ''),
              }),
            )
          }
        >
          <p className="text-sm font-semibold text-texto">Registrar pendência</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="tipo"
              required
              placeholder="Tipo (ex.: comprovante de renda)"
              className="rounded-md border border-borda px-2.5 py-1.5 text-sm"
            />
            <input
              name="prazoAte"
              type="date"
              required
              className="rounded-md border border-borda px-2.5 py-1.5 text-sm"
            />
          </div>
          <input
            name="descricao"
            required
            placeholder="O que falta — este texto é o que a família lê"
            className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={pendente}
            className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional hover:bg-background disabled:opacity-60"
          >
            Suspender inscrição com pendência
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-borda bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-institucional">Fila</h2>

        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => recalcularInscricao(programaId, inscricaoId))}
          className="mt-3 rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional hover:bg-background disabled:opacity-60"
        >
          Recalcular pontuação
        </button>

        {situacao === 'APTA' && (
          <form
            className="mt-4 space-y-3 border-t border-borda pt-4"
            action={(form) =>
              rodar(() =>
                convocar(inscricaoId, {
                  prazoComparecimentoAte: String(form.get('prazo') ?? ''),
                  foraDeOrdem,
                  motivoExcecao: String(form.get('motivo') ?? '') || undefined,
                }),
              )
            }
          >
            <p className="text-sm font-semibold text-texto">Convocar</p>
            <input
              name="prazo"
              type="date"
              required
              aria-label="Prazo de comparecimento"
              className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-texto">
              <input
                type="checkbox"
                checked={foraDeOrdem}
                onChange={(e) => setForaDeOrdem(e.target.checked)}
                className="size-4 rounded border-borda text-primary"
              />
              Convocar fora de ordem
            </label>
            {foraDeOrdem && (
              <>
                <textarea
                  name="motivo"
                  required
                  rows={3}
                  placeholder="Motivo fundamentado — publicado junto ao ranking e contado no painel"
                  className="w-full rounded-md border border-warning/50 bg-warning/5 px-2.5 py-1.5 text-sm"
                />
                <p className="text-xs text-warning-text">
                  A exceção não reordena a fila: o ranking publicado permanece o que foi publicado.
                </p>
              </>
            )}
            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
            >
              Emitir convocação
            </button>
          </form>
        )}

        {convocacaoAberta && (
          <form
            className="mt-4 space-y-3 border-t border-borda pt-4"
            action={(form) =>
              rodar(() =>
                registrarDesfecho(convocacaoAberta, inscricaoId, {
                  desfecho: String(form.get('desfecho') ?? ''),
                  motivo: String(form.get('motivoDesfecho') ?? '') || undefined,
                }),
              )
            }
          >
            <p className="text-sm font-semibold text-texto">Registrar comparecimento</p>
            <select
              name="desfecho"
              className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
            >
              {DESFECHOS.map((desfecho) => (
                <option key={desfecho.valor} value={desfecho.valor}>
                  {desfecho.rotulo}
                </option>
              ))}
            </select>
            <input
              name="motivoDesfecho"
              placeholder="Motivo (obrigatório se não compareceu, recusou ou ficou inelegível)"
              className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
            >
              Registrar desfecho
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
