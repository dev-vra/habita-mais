'use client';

import { FileText, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Modal } from '@/components/ui/modal';

const LIMITE_BYTES = 10 * 1024 * 1024;
const TIPOS = ['application/pdf', 'image/jpeg', 'image/png'];

export interface ArquivoEnviado {
  chave: string;
  nome: string;
  mimeType: string;
  tamanho: number;
}

interface ArquivoNaFila extends Omit<ArquivoEnviado, 'chave'> {
  id: number;
  progresso: number;
  chave?: string;
  erro?: string;
}

/**
 * Envio de documento. Progresso por arquivo em vez de "Enviando…": numa foto de RG tirada no
 * celular, o servidor precisa saber se está subindo ou se travou. O arquivo vai por XHR direto ao
 * BFF — nunca pelo payload de uma server action.
 */
export function DialogoUpload({
  aberto,
  aoFechar,
  categoria,
  aoConcluir,
  cabecalho,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categoria: 'laudos' | 'visitas' | 'pendencias' | 'regulamentos' | 'oficios';
  aoConcluir: (arquivos: ArquivoEnviado[]) => void;
  /** O que precisa ser decidido antes de escolher o arquivo — o tipo do documento, por exemplo. */
  cabecalho?: React.ReactNode;
}) {
  const [fila, setFila] = useState<ArquivoNaFila[]>([]);
  const [sobre, setSobre] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const enviados = fila.filter((item): item is ArquivoNaFila & { chave: string } => !!item.chave);

  function receber(arquivos: FileList | null) {
    if (!arquivos) return;

    for (const arquivo of Array.from(arquivos)) {
      const id = Date.now() + Math.random();
      const recusa = recusar(arquivo);

      setFila((atual) => [
        ...atual,
        {
          id,
          nome: arquivo.name,
          mimeType: arquivo.type,
          tamanho: arquivo.size,
          progresso: recusa ? 0 : 1,
          erro: recusa,
        },
      ]);

      if (!recusa) enviar(arquivo, id);
    }
  }

  function enviar(arquivo: File, id: number) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);

    const requisicao = new XMLHttpRequest();
    requisicao.open('POST', `/api/arquivos?categoria=${categoria}`);

    requisicao.upload.addEventListener('progress', (evento) => {
      if (!evento.lengthComputable) return;
      const progresso = Math.round((evento.loaded / evento.total) * 100);
      setFila((atual) => atual.map((item) => (item.id === id ? { ...item, progresso } : item)));
    });

    requisicao.addEventListener('load', () => {
      const corpo = analisar(requisicao.responseText);
      setFila((atual) =>
        atual.map((item) =>
          item.id === id
            ? requisicao.status < 300 && corpo.key
              ? { ...item, progresso: 100, chave: corpo.key }
              : { ...item, erro: corpo.message ?? 'Não foi possível enviar o arquivo.' }
            : item,
        ),
      );
    });

    requisicao.addEventListener('error', () =>
      setFila((atual) =>
        atual.map((item) => (item.id === id ? { ...item, erro: 'Falha de rede no envio.' } : item)),
      ),
    );

    requisicao.send(dados);
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Anexar documento"
      descricao="PDF, JPG ou PNG, até 10 MB por arquivo."
      acoes={
        <>
          <button
            type="button"
            onClick={aoFechar}
            className="h-[38px] rounded-md border border-borda bg-surface px-4 text-[13px] font-bold text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviados.length === 0}
            onClick={() => {
              aoConcluir(
                enviados.map(({ chave, nome, mimeType, tamanho }) => ({
                  chave,
                  nome,
                  mimeType,
                  tamanho,
                })),
              );
              setFila([]);
              aoFechar();
            }}
            className="h-[38px] rounded-md bg-primary px-4 text-[13px] font-bold text-surface transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2"
          >
            Anexar {enviados.length > 0 && `(${enviados.length})`}
          </button>
        </>
      }
    >
      {cabecalho && <div className="mb-3.5">{cabecalho}</div>}

      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setSobre(false);
          receber(evento.dataTransfer.files);
        }}
        className={cn(
          'rounded-lg border border-dashed px-4 py-7 text-center transition',
          sobre ? 'border-institucional-claro bg-institucional/4' : 'border-borda',
        )}
      >
        <UploadCloud
          size={22}
          strokeWidth={1.7}
          aria-hidden
          className="mx-auto mb-2 text-texto-suave"
        />
        <p className="text-[12.5px] text-texto-suave">
          Arraste o arquivo aqui ou{' '}
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="rounded font-semibold text-primary underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            escolha do computador
          </button>
          .
        </p>
        <input
          ref={entrada}
          type="file"
          multiple
          accept={TIPOS.join(',')}
          onChange={(evento) => receber(evento.target.files)}
          className="sr-only"
        />
      </div>

      {fila.length > 0 && (
        <ul className="mt-3.5 space-y-2">
          {fila.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 rounded-md border border-borda px-3 py-2">
              <FileText size={16} strokeWidth={1.7} aria-hidden className="shrink-0 text-texto-suave" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-texto">{item.nome}</p>
                {item.erro ? (
                  <p className="text-[11px] text-danger">{item.erro}</p>
                ) : (
                  <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full bg-institucional-claro transition-[width] duration-200"
                      style={{ width: `${item.progresso}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="tabular shrink-0 text-[11px] text-texto-suave">
                {item.erro ? '—' : item.chave ? 'Enviado' : `${item.progresso}%`}
              </span>
              <button
                type="button"
                aria-label={`Remover ${item.nome}`}
                onClick={() => setFila((atual) => atual.filter((outro) => outro.id !== item.id))}
                className="shrink-0 rounded text-texto-suave transition hover:text-danger focus:outline-none focus:ring-2 focus:ring-institucional/30"
              >
                <X size={14} strokeWidth={1.7} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function recusar(arquivo: File): string | undefined {
  if (!TIPOS.includes(arquivo.type)) return 'Formato não aceito — envie PDF, JPG ou PNG.';
  if (arquivo.size > LIMITE_BYTES) return 'Arquivo acima de 10 MB.';
  return undefined;
}

function analisar(texto: string): { key?: string; message?: string } {
  try {
    return JSON.parse(texto) as { key?: string; message?: string };
  } catch {
    return {};
  }
}
