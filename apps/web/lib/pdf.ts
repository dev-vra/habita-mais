import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Carregamento client-only do pdf.js para render de PDF em <canvas>.
 *
 * Import dinâmico porque a lib toca APIs de browser (DOMMatrix, canvas) e não sobrevive ao SSR.
 * O worker é resolvido pelo bundler (`new URL(..., import.meta.url)`), então acompanha a versão do
 * pacote — sem binário commitado que envelhece sozinho.
 */

let libPromise: Promise<typeof import('pdfjs-dist')> | null = null;
const cacheDocumentos = new Map<string, Promise<PDFDocumentProxy>>();

async function obterLib(): Promise<typeof import('pdfjs-dist')> {
  if (!libPromise) {
    libPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return libPromise;
}

/** Carrega (e memoiza por URL) um PDF. Trocar de página não baixa o arquivo de novo. */
export async function carregarPdf(url: string): Promise<PDFDocumentProxy> {
  let documento = cacheDocumentos.get(url);
  if (!documento) {
    documento = obterLib().then((pdfjs) => pdfjs.getDocument({ url }).promise);
    cacheDocumentos.set(url, documento);
  }
  return documento;
}
