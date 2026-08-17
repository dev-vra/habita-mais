'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { juntarDocumento } from '@/app/actions/documentos';
import { DialogoUpload, type ArquivoEnviado } from '@/components/ui/dialogo-upload';
import { useToast } from '@/components/ui/toast';

/**
 * Anexar documento sem sair da ficha.
 *
 * O tipo é escolhido antes do arquivo porque é ele que diz o que o documento prova — juntar um PDF
 * sem tipo produz uma pasta digital tão inútil quanto a de papel. A conferência continua sendo
 * outro ato, de quem tem a capacidade para isso.
 */
export function AnexarDocumento({
  familiaId,
  tipos,
}: {
  familiaId: string;
  tipos: { id: string; codigo: string; nome: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState(tipos[0]?.id ?? '');
  const { avisar } = useToast();
  const router = useRouter();

  async function juntar(arquivos: ArquivoEnviado[]) {
    for (const arquivo of arquivos) {
      const resultado = await juntarDocumento(
        {
          tipoDocumentoId: tipo,
          escopo: 'FAMILIA',
          referenciaId: familiaId,
          arquivoKey: arquivo.chave,
          nomeArquivo: arquivo.nome,
          mimeType: arquivo.mimeType,
          tamanho: arquivo.tamanho,
        },
        `/familias/${familiaId}`,
      );

      if (resultado.erro) {
        avisar({ tom: 'perigo', titulo: 'Documento não juntado', corpo: resultado.erro });
        return;
      }
    }

    avisar({
      tom: 'sucesso',
      titulo: arquivos.length === 1 ? 'Documento juntado' : 'Documentos juntados',
      corpo: 'Aguardando conferência de quem tem a capacidade para isso.',
    });
    router.refresh();
  }

  if (tipos.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-borda bg-surface px-3.5 text-[12.5px] font-bold text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
      >
        <Paperclip size={15} strokeWidth={1.7} aria-hidden />
        Anexar documento
      </button>

      <DialogoUpload
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        categoria="pendencias"
        aoConcluir={(arquivos) => void juntar(arquivos)}
        cabecalho={
          <>
            <label htmlFor="tipo-documento" className="block text-[13px] font-semibold text-texto">
              Tipo de documento
            </label>
            <select
              id="tipo-documento"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border border-borda bg-surface px-2.5 text-[13px] outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
            >
              {tipos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </>
        }
      />
    </>
  );
}
