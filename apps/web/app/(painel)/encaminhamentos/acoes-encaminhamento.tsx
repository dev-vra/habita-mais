'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { devolverEncaminhamento, responderEncaminhamento } from '@/app/actions/encaminhamentos';
import { CampoArquivo } from '@/components/ui/campo-arquivo';
import { Aviso } from '@/components/ui/formulario';

/**
 * Resposta do setor. Quando o pedido é laudo de risco, o documento anexado passa a valer na ficha
 * da família na mesma transação — por isso o campo aparece em destaque, e não como opcional
 * escondido.
 */
export function AcoesEncaminhamento({
  encaminhamentoId,
  pedeDocumento,
}: {
  encaminhamentoId: string;
  pedeDocumento: boolean;
}) {
  const [erro, setErro] = useState<string>();
  const [devolvendo, setDevolvendo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  return (
    <div className="mt-4 border-t border-borda pt-4">
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      {devolvendo ? (
        <form
          className="mt-2 space-y-2"
          action={(form) =>
            rodar(() =>
              devolverEncaminhamento(encaminhamentoId, String(form.get('motivo') ?? '')),
            )
          }
        >
          <textarea
            name="motivo"
            required
            minLength={20}
            rows={2}
            placeholder="Por que o pedido não é da competência deste setor?"
            className="w-full rounded-md border border-borda px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-surface disabled:opacity-60"
            >
              Devolver
            </button>
            <button
              type="button"
              onClick={() => setDevolvendo(false)}
              className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <form
          className="space-y-3"
          action={(form) =>
            rodar(() =>
              responderEncaminhamento(encaminhamentoId, {
                resposta: String(form.get('resposta') ?? ''),
                anexoKey: String(form.get('anexoKey') ?? '') || undefined,
              }),
            )
          }
        >
          <textarea
            name="resposta"
            required
            minLength={20}
            rows={3}
            placeholder="O que foi apurado? Este texto volta para a Habitação."
            className="w-full rounded-md border border-borda px-3 py-2 text-sm"
          />

          {pedeDocumento && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
              <CampoArquivo
                nome="anexoKey"
                rotulo="Laudo técnico"
                categoria="laudos"
                ajuda="Ao anexar, o laudo passa a valer na ficha da família — é o que faz o critério de risco pontuar."
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
            >
              Responder
            </button>
            <button
              type="button"
              onClick={() => setDevolvendo(true)}
              className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-institucional hover:bg-background"
            >
              Não é do meu setor
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
