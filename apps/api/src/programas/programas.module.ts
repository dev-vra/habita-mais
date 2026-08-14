import { Module } from '@nestjs/common';
import { CriteriosUseCase } from './application/criterios.use-case';
import { ProgramasUseCase } from './application/programas.use-case';
import { PROGRAMAS_ESCRITA_REPOSITORY } from './domain/ports';
import { ProgramasEscritaPrismaRepository } from './infra/programas-escrita.prisma-repository';
import { ProgramasQueryService } from './infra/programas.query-service';
import { CriteriosController, ProgramasController } from './programas.controller';

@Module({
  controllers: [ProgramasController, CriteriosController],
  providers: [
    ProgramasQueryService,
    ProgramasUseCase,
    CriteriosUseCase,
    { provide: PROGRAMAS_ESCRITA_REPOSITORY, useClass: ProgramasEscritaPrismaRepository },
  ],
})
export class ProgramasModule {}
