'use client';

import { useEffect, useRef, useState } from 'react';
import { carregarPdf } from '@/lib/pdf';
import { cn } from '@/lib/cn';

interface PdfCanvasProps {
  /** URL do PDF — a rota do BFF que faz stream inline. */
  url: string;
  /** Página a renderizar (1-based). */
  pagina?: number;
  /** Escala fixa. Ausente, ajusta a página à `larguraAlvo`. */
  escala?: number;
  /** Largura alvo em px CSS no modo fit-width (ignorado quando há `escala`). */
  larguraAlvo?: number;
  /** Rotação em graus (0/90/180/270). Digitalização deitada é regra, não exceção. */
  rotacao?: number;
  className?: string;
  /** Recebe o total de páginas assim que o documento carrega. */
  onTotalPaginas?: (total: number) => void;
}

/**
 * Renderiza uma página de PDF em <canvas> via pdf.js.
 *
 * Multiplica pelo devicePixelRatio para não borrar em tela HiDPI — comprovante fotografado já
 * chega ruim, e o visualizador não pode piorar. Cancela o render em troca rápida de página para
 * não sobrepor frames.
 */
export function PdfCanvas({
  url,
  pagina = 1,
  escala,
  larguraAlvo = 320,
  rotacao = 0,
  className,
  onTotalPaginas,
}: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onTotalRef = useRef(onTotalPaginas);
  onTotalRef.current = onTotalPaginas;
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');

  useEffect(() => {
    let cancelado = false;
    let tarefa: { cancel: () => void; promise: Promise<void> } | null = null;
    setEstado('carregando');

    void (async () => {
      try {
        const documento = await carregarPdf(url);
        if (cancelado) return;
        onTotalRef.current?.(documento.numPages);

        const page = await documento.getPage(Math.min(Math.max(pagina, 1), documento.numPages));
        if (cancelado) return;

        const dpr = window.devicePixelRatio || 1;
        const base = page.getViewport({ scale: 1, rotation: rotacao });
        const escalaCss = escala ?? larguraAlvo / base.width;
        const viewport = page.getViewport({ scale: escalaCss * dpr, rotation: rotacao });

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        tarefa = page.render({ canvas, viewport });
        await tarefa.promise;
        if (!cancelado) setEstado('ok');
      } catch (erro) {
        // Render cancelado (troca rápida de página) não é falha — não vale assustar o usuário.
        const nome = erro instanceof Error ? erro.name : '';
        if (!cancelado && nome !== 'RenderingCancelledException') setEstado('erro');
      }
    })();

    return () => {
      cancelado = true;
      tarefa?.cancel();
    };
  }, [url, pagina, escala, larguraAlvo, rotacao]);

  return (
    <div className={cn('relative grid place-items-center', className)}>
      {estado === 'carregando' && (
        <p className="absolute text-xs text-texto-suave">Carregando documento…</p>
      )}
      {estado === 'erro' ? (
        <p className="p-4 text-center text-xs text-texto-suave">
          Não foi possível renderizar este PDF. Use o botão de baixar.
        </p>
      ) : (
        <canvas
          ref={canvasRef}
          className={cn('max-w-full', estado === 'carregando' && 'opacity-0')}
        />
      )}
    </div>
  );
}
