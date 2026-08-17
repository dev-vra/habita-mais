import { Module } from '@nestjs/common';
import { RetomadaUseCase } from './application/retomada.use-case';
import { RETOMADA_REPOSITORY } from './domain/ports';
import { RetomadaPrismaRepository } from './infra/retomada.prisma-repository';
import { RetomadaQueryService } from './infra/retomada.query-service';
import { RetomadaController } from './retomada.controller';

@Module({
  controllers: [RetomadaController],
  providers: [
    RetomadaQueryService,
    RetomadaUseCase,
    { provide: RETOMADA_REPOSITORY, useClass: RetomadaPrismaRepository },
  ],
})
export class RetomadaModule {}
