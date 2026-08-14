import { Module } from '@nestjs/common';
import { ConvocarFamiliaUseCase } from './application/convocar-familia.use-case';
import { InscreverFamiliaUseCase } from './application/inscrever-familia.use-case';
import { PendenciasUseCase } from './application/pendencias.use-case';
import { PublicarRankingUseCase } from './application/publicar-ranking.use-case';
import { RecalcularPontuacaoUseCase } from './application/recalcular-pontuacao.use-case';
import { RecursosUseCase } from './application/recursos.use-case';
import { RegistrarDesfechoUseCase } from './application/registrar-desfecho.use-case';
import {
  CONVOCACOES_REPOSITORY,
  INSCRICOES_REPOSITORY,
  PROGRAMAS_REPOSITORY,
  PENDENCIAS_REPOSITORY,
  RECURSOS_REPOSITORY,
} from './domain/ports';
import { FilaController } from './fila.controller';
import { ConvocacoesPrismaRepository } from './infra/convocacoes.prisma-repository';
import { FilaQueryService } from './infra/fila.query-service';
import { PendenciasPrismaRepository } from './infra/pendencias.prisma-repository';
import { InscricoesPrismaRepository } from './infra/inscricoes.prisma-repository';
import { ProgramasPrismaRepository } from './infra/programas.prisma-repository';
import { RecursosPrismaRepository } from './infra/recursos.prisma-repository';

@Module({
  controllers: [FilaController],
  providers: [
    FilaQueryService,
    InscreverFamiliaUseCase,
    RecalcularPontuacaoUseCase,
    PublicarRankingUseCase,
    ConvocarFamiliaUseCase,
    RegistrarDesfechoUseCase,
    RecursosUseCase,
    PendenciasUseCase,
    { provide: PROGRAMAS_REPOSITORY, useClass: ProgramasPrismaRepository },
    { provide: INSCRICOES_REPOSITORY, useClass: InscricoesPrismaRepository },
    { provide: CONVOCACOES_REPOSITORY, useClass: ConvocacoesPrismaRepository },
    { provide: RECURSOS_REPOSITORY, useClass: RecursosPrismaRepository },
    { provide: PENDENCIAS_REPOSITORY, useClass: PendenciasPrismaRepository },
  ],
})
export class FilaModule {}
