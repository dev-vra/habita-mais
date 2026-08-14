'use client';

import { useState } from 'react';

/**
 * Upload que devolve a chave do arquivo num campo oculto — o formulário continua sendo um
 * formulário comum, e a server action recebe só a chave. O arquivo em si nunca passa pelo estado
 * do React nem por um payload de action.
 */
export function CampoArquivo({
  nome,
  rotulo,
  categoria,
  ajuda,
}: {
  nome: string;
  rotulo: string;
  categoria: 'laudos' | 'visitas' | 'pendencias' | 'regulamentos';
  ajuda?: string;
}) {
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(arquivo: File) {
    setEnviando(true);
    setErro(undefined);

    const dados = new FormData();
    dados.append('arquivo', arquivo);

    const resposta = await fetch(`/api/arquivos?categoria=${categoria}`, {
      method: 'POST',
      body: dados,
    });
    const corpo = (await resposta.json()) as { key?: string; message?: string };

    setEnviando(false);
    if (!resposta.ok || !corpo.key) {
      setErro(corpo.message ?? 'Não foi possível enviar o arquivo.');
      return;
    }
    setChave(corpo.key);
  }

  return (
    <div>
      <label htmlFor={`${nome}-arquivo`} className="block text-sm font-semibold text-texto">
        {rotulo}
      </label>
      <input
        id={`${nome}-arquivo`}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) void enviar(arquivo);
        }}
        className="mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-institucional"
      />
      <input type="hidden" name={nome} value={chave} />

      {enviando && <p className="mt-1.5 text-xs text-texto-suave">Enviando…</p>}
      {chave && !enviando && <p className="mt-1.5 text-xs text-success">Arquivo anexado.</p>}
      {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
      {ajuda && !erro && <p className="mt-1.5 text-xs text-texto-suave">{ajuda}</p>}
    </div>
  );
}
