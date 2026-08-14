import { Module } from '@nestjs/common';
import { EncaminhamentosUseCase } from './application/encaminhamentos.use-case';
import { SETORES_REPOSITORY } from './domain/ports';
import { SetoresPrismaRepository } from './infra/setores.prisma-repository';
import { SetoresQueryService } from './infra/setores.query-service';
import { SetoresController } from './setores.controller';

@Module({
  controllers: [SetoresController],
  providers: [
    SetoresQueryService,
    EncaminhamentosUseCase,
    { provide: SETORES_REPOSITORY, useClass: SetoresPrismaRepository },
  ],
})
export class SetoresModule {}
