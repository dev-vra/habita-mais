'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minus,
  Plus,
  RotateCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PdfCanvas } from './pdf-canvas';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const ZOOM_PASSO = 0.25;

export interface ArquivoVisualizavel {
  /** Chave do objeto no storage — vira a URL do BFF. */
  arquivoKey: string;
  nome: string;
  mimeType: string;
}

/** Monta a URL de leitura pelo BFF (o Bearer é anexado lá; o browser nunca vê o token). */
export function urlArquivo(arquivoKey: string): string {
  return `/api/arquivos/${arquivoKey.split('/').map(encodeURIComponent).join('/')}`;
}

interface MioloProps {
  url: string;
  nome: string;
  mimeType: string;
  /** Conteúdo à esquerda da barra (padrão: nome truncado). */
  titulo?: ReactNode;
  /** Ações extras no fim da barra (ex.: fechar). */
  acoesFim?: ReactNode;
  className?: string;
}

/**
 * Miolo do visualizador: barra (páginas, zoom, rotação, baixar) + área com pan.
 *
 * Existe porque conferir documento em aba nova é conferir de memória — o servidor perde os campos
 * de vista, volta, e decide pelo que lembra. Aqui o papel fica ao lado do formulário.
 *
 * Encaixe previsto para IA (ver docs/PLANO-DOCUMENTAL-E-POS-ENTREGA.md): extrair texto do que está
 * na tela para pré-preencher campos — entra como ação nesta mesma barra, sempre com o servidor
 * validando antes de gravar.
 */
function Miolo({ url, nome, mimeType, titulo, acoesFim, className }: MioloProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [graus, setGraus] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const tipo = mimeType ?? '';
  const ehImagem = tipo.startsWith('image/');
  const ehPdf = tipo === 'application/pdf' || (!ehImagem && nome.toLowerCase().endsWith('.pdf'));
  const temZoom = ehImagem || ehPdf;
  const podePan = temZoom && zoom > 1;

  // Reseta ao trocar de documento: o painel continua montado enquanto o servidor percorre a lista.
  useEffect(() => {
    setZoom(1);
    setGraus(0);
    setPagina(1);
    setTotalPaginas(1);
  }, [url]);

  // Ctrl + roda. Listener nativo não-passivo para poder preventDefault e não dar zoom na página
  // inteira do navegador junto.
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !temZoom) return;

    const aoRolar = (evento: WheelEvent) => {
      if (!evento.ctrlKey) return;
      evento.preventDefault();
      const delta = evento.deltaY < 0 ? ZOOM_PASSO : -ZOOM_PASSO;
      setZoom((z) => limitarZoom(z + delta));
    };

    area.addEventListener('wheel', aoRolar, { passive: false });
    return () => area.removeEventListener('wheel', aoRolar);
  }, [temZoom]);

  const iniciarPan = (evento: React.PointerEvent<HTMLDivElement>) => {
    const area = areaRef.current;
    if (!area || !podePan || evento.button !== 0) return;

    arrasto.current = {
      x: evento.clientX,
      y: evento.clientY,
      left: area.scrollLeft,
      top: area.scrollTop,
    };
    setArrastando(true);
    try {
      area.setPointerCapture(evento.pointerId);
    } catch {
      /* ponteiro pode não estar ativo — segue sem captura */
    }
  };

  const moverPan = (evento: React.PointerEvent<HTMLDivElement>) => {
    const area = areaRef.current;
    if (!area || !arrasto.current) return;
    area.scrollLeft = arrasto.current.left - (evento.clientX - arrasto.current.x);
    area.scrollTop = arrasto.current.top - (evento.clientY - arrasto.current.y);
  };

  const encerrarPan = (evento: React.PointerEvent<HTMLDivElement>) => {
    if (arrasto.current) {
      try {
        areaRef.current?.releasePointerCapture(evento.pointerId);
      } catch {
        /* captura pode já ter sido liberada */
      }
    }
    arrasto.current = null;
    setArrastando(false);
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <header className="flex items-center gap-2 border-b border-borda bg-surface px-3 py-2">
        {titulo ?? (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-texto" title={nome}>
            {nome}
          </p>
        )}

        {ehPdf && totalPaginas > 1 && (
          <div className="flex shrink-0 items-center gap-0.5">
            <BotaoIcone
              rotulo="Página anterior"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
            >
              <ChevronLeft className="size-4" />
            </BotaoIcone>
            <span className="tabular min-w-16 text-center text-xs text-texto-suave">
              {pagina} / {totalPaginas}
            </span>
            <BotaoIcone
              rotulo="Próxima página"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
            >
              <ChevronRight className="size-4" />
            </BotaoIcone>
            <span aria-hidden className="mx-1 h-5 w-px bg-borda" />
          </div>
        )}

        {temZoom && (
          <div className="flex shrink-0 items-center gap-0.5">
            <BotaoIcone
              rotulo="Diminuir zoom"
              onClick={() => setZoom((z) => limitarZoom(z - ZOOM_PASSO))}
              disabled={zoom <= ZOOM_MIN}
            >
              <Minus className="size-4" />
            </BotaoIcone>
            <span className="tabular w-11 text-center text-xs text-texto-suave">
              {Math.round(zoom * 100)}%
            </span>
            <BotaoIcone
              rotulo="Aumentar zoom"
              onClick={() => setZoom((z) => limitarZoom(z + ZOOM_PASSO))}
              disabled={zoom >= ZOOM_MAX}
            >
              <Plus className="size-4" />
            </BotaoIcone>
            <BotaoIcone
              rotulo="Tamanho original"
              onClick={() => {
                setZoom(1);
                setGraus(0);
              }}
            >
              <Maximize2 className="size-4" />
            </BotaoIcone>
            <BotaoIcone rotulo="Girar 90°" onClick={() => setGraus((g) => (g + 90) % 360)}>
              <RotateCw className="size-4" />
            </BotaoIcone>
          </div>
        )}

        <a
          href={url}
          download={nome}
          aria-label="Baixar documento"
          title="Baixar"
          className="grid size-8 shrink-0 place-items-center rounded-md text-texto-suave transition-colors hover:bg-background hover:text-texto"
        >
          <Download className="size-4" aria-hidden />
        </a>
        {acoesFim}
      </header>

      <div
        ref={areaRef}
        onPointerDown={iniciarPan}
        onPointerMove={moverPan}
        onPointerUp={encerrarPan}
        onPointerCancel={encerrarPan}
        className={cn(
          'min-h-0 flex-1 overflow-auto p-4',
          podePan && 'touch-none',
          podePan && (arrastando ? 'cursor-grabbing' : 'cursor-grab'),
        )}
      >
        {ehImagem ? (
          <div className="flex min-h-full min-w-full [align-items:safe_center] [justify-content:safe_center]">
            {/* <img> cru de propósito: o arquivo é privado e sai do BFF autenticado — otimizar
                pelo Next criaria uma cópia em cache fora do controle de acesso. */}
            <img
              src={url}
              alt={nome}
              draggable={false}
              style={{ transform: `rotate(${graus}deg) scale(${zoom})`, transformOrigin: 'center' }}
              className="pointer-events-none max-w-full rounded-md shadow-sm transition-transform duration-150 select-none"
            />
          </div>
        ) : ehPdf ? (
          <div className="flex min-h-full min-w-full [align-items:safe_center] [justify-content:safe_center]">
            <PdfCanvas
              url={url}
              pagina={pagina}
              escala={1.35 * zoom}
              rotacao={graus}
              onTotalPaginas={setTotalPaginas}
              className="rounded-md bg-surface shadow-sm [&_canvas]:rounded-md"
            />
          </div>
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-texto-suave">
            <p>
              Sem pré-visualização para este tipo de arquivo.
              <br />
              <a href={url} download={nome} className="font-semibold text-primary hover:underline">
                Baixar documento
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Visualizador fixado (preenche o container): o documento fica parado à direita enquanto o
 * servidor percorre os dados do cadastro à esquerda.
 */
export function PainelVisualizador({
  arquivo,
  titulo,
  className,
}: {
  arquivo: ArquivoVisualizavel;
  titulo?: ReactNode;
  className?: string;
}) {
  return (
    <Miolo
      url={urlArquivo(arquivo.arquivoKey)}
      nome={arquivo.nome}
      mimeType={arquivo.mimeType}
      titulo={titulo}
      className={cn('h-full bg-background', className)}
    />
  );
}

/**
 * Visualizador em painel lateral. Não abre aba nova de propósito: o formulário continua visível à
 * esquerda, e a decisão é tomada olhando o papel. Fecha no ESC e no clique fora; recebe foco ao
 * abrir para quem navega por teclado não ficar preso atrás.
 */
export function VisualizadorDocumento({
  arquivo,
  aberto,
  aoFechar,
  titulo,
}: {
  arquivo: ArquivoVisualizavel | null;
  aberto: boolean;
  aoFechar: () => void;
  titulo?: ReactNode;
}) {
  const painelRef = useRef<HTMLDivElement>(null);
  const aoFecharRef = useRef(aoFechar);
  aoFecharRef.current = aoFechar;

  const url = arquivo ? urlArquivo(arquivo.arquivoKey) : '';

  useEffect(() => {
    if (aberto) painelRef.current?.focus();
  }, [aberto, url]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFecharRef.current();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  if (!aberto || !arquivo) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Fechar visualização"
        onClick={aoFechar}
        className="flex-1 animate-surgir bg-institucional-escuro/25"
      />

      <aside
        ref={painelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-label={`Documento: ${arquivo.nome}`}
        className="flex h-full w-full max-w-[760px] animate-entrada-lateral flex-col bg-background shadow-2xl outline-none md:w-[54vw]"
      >
        <Miolo
          url={url}
          nome={arquivo.nome}
          mimeType={arquivo.mimeType}
          titulo={titulo}
          className="min-h-0 flex-1"
          acoesFim={
            <BotaoIcone rotulo="Fechar" onClick={aoFechar}>
              <X className="size-4" />
            </BotaoIcone>
          }
        />
      </aside>
    </div>
  );
}

const limitarZoom = (valor: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(valor * 100) / 100));

function BotaoIcone({
  rotulo,
  onClick,
  disabled,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'grid size-8 place-items-center rounded-md text-base leading-none text-texto-suave transition-colors',
        'hover:bg-background hover:text-texto',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
      )}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
