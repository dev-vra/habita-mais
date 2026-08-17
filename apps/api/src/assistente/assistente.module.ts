import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AssistenteUseCase } from './application/assistente.use-case';
import { AssistenteController } from './assistente.controller';
import { motorIaProvider } from './infra/motor.factory';
import { ConferenciaQueryService } from './infra/conferencia.query-service';
import { ExtracaoService } from './infra/extracao.service';
import { OcrService } from './infra/ocr.service';

@Module({
  imports: [StorageModule],
  controllers: [AssistenteController],
  providers: [
    AssistenteUseCase,
    ConferenciaQueryService,
    ExtracaoService,
    OcrService,
    motorIaProvider,
  ],
  exports: [ConferenciaQueryService],
})
export class AssistenteModule {}
