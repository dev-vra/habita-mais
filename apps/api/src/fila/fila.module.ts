import { Module } from '@nestjs/common';
import { ConvocarFamiliaUseCase } from './application/convocar-familia.use-case';
import { InscreverFamiliaUseCase } from './application/inscrever-familia.use-case';
import { PendenciasUseCase } from './application/pendencias.use-case';
import { RecadastramentoUseCase } from './application/recadastramento.use-case';
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
import { DecisoesQueryService } from './infra/decisoes.query-service';
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
    RecadastramentoUseCase,
    DecisoesQueryService,
    { provide: PROGRAMAS_REPOSITORY, useClass: ProgramasPrismaRepository },
    { provide: INSCRICOES_REPOSITORY, useClass: InscricoesPrismaRepository },
    { provide: CONVOCACOES_REPOSITORY, useClass: ConvocacoesPrismaRepository },
    { provide: RECURSOS_REPOSITORY, useClass: RecursosPrismaRepository },
    { provide: PENDENCIAS_REPOSITORY, useClass: PendenciasPrismaRepository },
  ],
  // RecursosUseCase é reusado pela central do munícipe: o recurso interposto pela família é o
  // mesmo ato do interposto no balcão, com a mesma regra de prazo e situação.
  exports: [RecursosUseCase],
})
export class FilaModule {}
