import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

/**
 * HTML → PDF. O navegador é reaproveitado entre requisições: subir um Chrome por ofício custa
 * segundos e memória, e a Habitação emite convocação em lote.
 *
 * Usa o Chrome do sistema (PUPPETEER_EXECUTABLE_PATH), não um baixado pelo pacote — em container
 * de produção, aponte para o chromium instalado na imagem.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private navegador?: Browser;

  async gerar(html: string): Promise<Buffer> {
    const navegador = await this.obterNavegador();
    const pagina = await navegador.newPage();

    try {
      await pagina.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await pagina.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await pagina.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.navegador?.close();
  }

  private async obterNavegador(): Promise<Browser> {
    if (this.navegador?.connected) return this.navegador;

    this.navegador = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? '/opt/google/chrome/chrome',
      // --no-sandbox é necessário em container; em desktop o Chrome do sistema já roda isolado.
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    this.logger.log('Navegador de PDF iniciado.');
    return this.navegador;
  }
}
