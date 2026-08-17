import { Module } from '@nestjs/common';
import { ContratosUseCase } from './application/contratos.use-case';
import { ContratosController } from './contratos.controller';
import { CONTRATOS_REPOSITORY } from './domain/ports';
import { ContratosPrismaRepository } from './infra/contratos.prisma-repository';
import { ContratosQueryService } from './infra/contratos.query-service';

@Module({
  controllers: [ContratosController],
  providers: [
    ContratosQueryService,
    ContratosUseCase,
    { provide: CONTRATOS_REPOSITORY, useClass: ContratosPrismaRepository },
  ],
})
export class ContratosModule {}
