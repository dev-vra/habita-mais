import { Global, Module } from '@nestjs/common';
import { OficioService } from './oficio.service';
import { PdfService } from './pdf.service';
import { ValidacaoController } from './validacao.controller';

@Global()
@Module({
  controllers: [ValidacaoController],
  providers: [PdfService, OficioService],
  exports: [OficioService],
})
export class PdfModule {}
