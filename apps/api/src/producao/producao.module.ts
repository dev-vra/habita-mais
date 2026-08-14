import { Module } from '@nestjs/common';
import { MedicoesUseCase } from './application/medicoes.use-case';
import { ProducaoUseCase } from './application/producao.use-case';
import { UnidadesUseCase } from './application/unidades.use-case';
import { PRODUCAO_REPOSITORY } from './domain/ports';
import { ProducaoPrismaRepository } from './infra/producao.prisma-repository';
import { ProducaoQueryService } from './infra/producao.query-service';
import { ProducaoController } from './producao.controller';

@Module({
  controllers: [ProducaoController],
  providers: [
    ProducaoQueryService,
    ProducaoUseCase,
    MedicoesUseCase,
    UnidadesUseCase,
    { provide: PRODUCAO_REPOSITORY, useClass: ProducaoPrismaRepository },
  ],
})
export class ProducaoModule {}
