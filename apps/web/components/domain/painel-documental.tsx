'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { conferirDocumento, juntarDocumento } from '@/app/actions/documentos';
import { Aviso } from '@/components/ui/formulario';
import { VisualizadorDocumento } from '@/components/ui/visualizador-documento';

export interface ItemDocumental {
  tipoCodigo: string;
  tipoNome: string;
  obrigatorio: boolean;
  orientacao?: string;
  estado: 'FALTANDO' | 'RECEBIDO' | 'CONFERIDO' | 'VENCIDO' | 'RECUSADO' | 'VENCENDO';
  diasParaVencer: number | null;
  impeditivo: boolean;
  documentoId: string | null;
  documento?: {
    protocolo: string;
    situacao: string;
    validoAte?: string;
    motivoRecusa?: string;
    arquivoKey: string;
    nomeArquivo: string;
    mimeType: string;
  };
}

export interface ResumoDocumental {
  percentualObrigatorios: number;
  impeditivos: number;
  completo: boolean;
  faltando: number;
}

const ESTADOS = {
  FALTANDO: { rotulo: 'Falta', classe: 'bg-danger/10 text-danger', simbolo: '—' },
  VENCIDO: { rotulo: 'Vencido', classe: 'bg-danger/10 text-danger', simbolo: '!' },
  RECUSADO: { rotulo: 'Recusado', classe: 'bg-danger/10 text-danger', simbolo: '×' },
  VENCENDO: { rotulo: 'Vence em breve', classe: 'bg-warning/15 text-warning-text', simbolo: '•' },
  RECEBIDO: { rotulo: 'Aguarda conferência', classe: 'bg-warning/15 text-warning-text', simbolo: '•' },
  CONFERIDO: { rotulo: 'Conferido', classe: 'bg-success/10 text-success', simbolo: '✓' },
} as const;

/**
 * Conferência documental.
 *
 * A barra mostra só o obrigatório, porque é o obrigatório que trava o processo — contar o opcional
 * daria um número mais bonito e menos verdadeiro. Cada linha diz o que fazer: quem não tem, envia;
 * quem enviou, espera conferência; quem foi recusado, lê o motivo e reenvia.
 */
export function PainelDocumental({
  titulo,
  escopo,
  referenciaId,
  itens,
  resumo,
  tipos,
  caminho,
  podeConferir,
}: {
  titulo: string;
  escopo: string;
  referenciaId: string;
  itens: ItemDocumental[];
  resumo: ResumoDocumental;
  tipos: { id: string; codigo: string; nome: string }[];
  caminho: string;
  podeConferir: boolean;
}) {
  const [erro, setErro] = useState<string>();
  const [recusando, setRecusando] = useState<string>();
  const [abertoEm, setAbertoEm] = useState<number>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  // Só o que tem papel anexado entra na navegação do visualizador — assim o servidor percorre a
  // documentação inteira sem voltar à lista a cada peça.
  const anexados = useMemo(() => itens.filter((item) => item.documento), [itens]);
  const emFoco = abertoEm === undefined ? undefined : anexados[abertoEm];

  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  async function enviar(tipoCodigo: string, arquivo: File, emitidoEm: string) {
    const tipo = tipos.find((item) => item.codigo === tipoCodigo);
    if (!tipo) {
      setErro('Tipo de documento não encontrado no catálogo.');
      return;
    }

    const dados = new FormData();
    dados.append('arquivo', arquivo);
    const upload = await fetch('/api/arquivos?categoria=pendencias', { method: 'POST', body: dados });
    const corpo = (await upload.json()) as { key?: string; message?: string };

    if (!corpo.key) {
      setErro(corpo.message ?? 'Não foi possível enviar o arquivo.');
      return;
    }

    rodar(() =>
      juntarDocumento(
        {
          tipoDocumentoId: tipo.id,
          escopo,
          referenciaId,
          arquivoKey: corpo.key as string,
          nomeArquivo: arquivo.name,
          mimeType: arquivo.type,
          tamanho: arquivo.size,
          emitidoEm: emitidoEm || undefined,
        },
        caminho,
      ),
    );
  }

  return (
    <section className="rounded-lg border border-borda bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-institucional">{titulo}</h2>
        <p className="text-sm text-texto-suave">
          {resumo.completo
            ? 'Documentação obrigatória completa'
            : `${resumo.percentualObrigatorios}% do obrigatório · ${resumo.impeditivos} pendente(s)`}
        </p>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-background">
        <div
          className={`h-full rounded ${resumo.completo ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${resumo.percentualObrigatorios}%` }}
        />
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso tom="danger">{erro}</Aviso>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {itens.map((item) => {
          const estado = ESTADOS[item.estado];

          return (
            <li key={item.tipoCodigo} className="rounded-md border border-borda p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-texto">
                    {item.tipoNome}
                    {!item.obrigatorio && (
                      <span className="ml-2 text-xs font-normal text-texto-suave">opcional</span>
                    )}
                  </p>
                  {item.orientacao && item.estado === 'FALTANDO' && (
                    <p className="mt-0.5 text-xs text-texto-suave">{item.orientacao}</p>
                  )}
                  {item.documento && (
                    <p className="tabular mt-0.5 text-xs text-texto-suave">
                      <button
                        type="button"
                        onClick={() => setAbertoEm(anexados.indexOf(item))}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {item.documento.protocolo}
                      </button>
                      {item.documento.validoAte &&
                        ` · válido até ${new Date(item.documento.validoAte).toLocaleDateString('pt-BR')}`}
                    </p>
                  )}
                  {item.documento?.motivoRecusa && (
                    <p className="mt-0.5 text-xs text-danger">
                      Recusado: {item.documento.motivoRecusa}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estado.classe}`}
                >
                  <span aria-hidden className="mr-1">
                    {estado.simbolo}
                  </span>
                  {estado.rotulo}
                </span>
              </div>

              {(item.estado === 'FALTANDO' ||
                item.estado === 'VENCIDO' ||
                item.estado === 'RECUSADO') && (
                <form
                  className="mt-3 flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    const arquivo = form.get('arquivo');
                    if (arquivo instanceof File && arquivo.size > 0) {
                      void enviar(item.tipoCodigo, arquivo, String(form.get('emitidoEm') ?? ''));
                    }
                  }}
                >
                  <input
                    type="file"
                    name="arquivo"
                    required
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="text-xs file:mr-2 file:rounded file:border-0 file:bg-background file:px-2 file:py-1 file:text-xs file:font-semibold file:text-institucional"
                  />
                  <label className="text-xs text-texto-suave">
                    Emitido em
                    <input
                      type="date"
                      name="emitidoEm"
                      className="ml-1 rounded border border-borda px-2 py-1 text-xs"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={pendente}
                    className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                  >
                    Anexar
                  </button>
                </form>
              )}

              {podeConferir && item.estado === 'RECEBIDO' && item.documentoId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Abrir vem antes de aceitar: conferir sem olhar o papel é o erro que a
                      conferência existe para impedir. */}
                  <button
                    type="button"
                    onClick={() => setAbertoEm(anexados.indexOf(item))}
                    className="rounded-md border border-borda px-3 py-1 text-xs font-semibold text-institucional"
                  >
                    Abrir documento
                  </button>
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() =>
                      rodar(() =>
                        conferirDocumento(item.documentoId as string, 'CONFERIDO', undefined, caminho),
                      )
                    }
                    className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                  >
                    Conferir e aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecusando(item.documentoId ?? undefined)}
                    className="rounded-md border border-borda px-3 py-1 text-xs font-semibold text-danger"
                  >
                    Recusar
                  </button>
                </div>
              )}

              {recusando === item.documentoId && item.documentoId && (
                <form
                  className="mt-2 flex flex-wrap gap-2"
                  action={(form) =>
                    rodar(async () => {
                      const resultado = await conferirDocumento(
                        item.documentoId as string,
                        'RECUSADO',
                        String(form.get('motivo') ?? ''),
                        caminho,
                      );
                      if (!resultado.erro) setRecusando(undefined);
                      return resultado;
                    })
                  }
                >
                  <input
                    name="motivo"
                    required
                    placeholder="Motivo — é o que a família recebe para corrigir"
                    className="flex-1 rounded-md border border-borda px-2.5 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={pendente}
                    className="rounded-md bg-danger px-3 py-1 text-xs font-semibold text-surface disabled:opacity-60"
                  >
                    Confirmar recusa
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {itens.length === 0 && (
        <p className="mt-3 text-sm text-texto-suave">
          Nenhuma exigência definida. Configure a lista no programa.
        </p>
      )}

      <VisualizadorDocumento
        aberto={emFoco !== undefined}
        aoFechar={() => setAbertoEm(undefined)}
        arquivo={
          emFoco?.documento
            ? {
                arquivoKey: emFoco.documento.arquivoKey,
                nome: emFoco.documento.nomeArquivo,
                mimeType: emFoco.documento.mimeType,
              }
            : null
        }
        titulo={
          emFoco && abertoEm !== undefined ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                aria-label="Documento anterior"
                disabled={abertoEm === 0}
                onClick={() => setAbertoEm(abertoEm - 1)}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-texto-suave hover:bg-background disabled:opacity-30"
              >
                Anterior
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-texto">{emFoco.tipoNome}</p>
                <p className="tabular truncate text-xs text-texto-suave">
                  {emFoco.documento?.protocolo} · documento {abertoEm + 1} de {anexados.length}
                </p>
              </div>
              <button
                type="button"
                aria-label="Próximo documento"
                disabled={abertoEm >= anexados.length - 1}
                onClick={() => setAbertoEm(abertoEm + 1)}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold text-texto-suave hover:bg-background disabled:opacity-30"
              >
                Próximo
              </button>
            </div>
          ) : undefined
        }
      />
    </section>
  );
}
