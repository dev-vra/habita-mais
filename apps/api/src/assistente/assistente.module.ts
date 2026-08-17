import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AssistenteUseCase } from './application/assistente.use-case';
import { AssistenteController } from './assistente.controller';
import { MOTOR_IA } from './domain/ports';
import { AnthropicAdapter } from './infra/anthropic.adapter';
import { ConferenciaQueryService } from './infra/conferencia.query-service';
import { ExtracaoService } from './infra/extracao.service';

@Module({
  imports: [StorageModule],
  controllers: [AssistenteController],
  providers: [
    AssistenteUseCase,
    ConferenciaQueryService,
    ExtracaoService,
    { provide: MOTOR_IA, useClass: AnthropicAdapter },
  ],
  exports: [ConferenciaQueryService],
})
export class AssistenteModule {}
