import { Module } from '@nestjs/common';
import { ConvocarFamiliaUseCase } from './application/convocar-familia.use-case';
import { InscreverFamiliaUseCase } from './application/inscrever-familia.use-case';
import { PublicarRankingUseCase } from './application/publicar-ranking.use-case';
import { RecalcularPontuacaoUseCase } from './application/recalcular-pontuacao.use-case';
import { RecursosUseCase } from './application/recursos.use-case';
import { RegistrarDesfechoUseCase } from './application/registrar-desfecho.use-case';
import {
  CONVOCACOES_REPOSITORY,
  GERADOR_PROTOCOLO,
  INSCRICOES_REPOSITORY,
  PROGRAMAS_REPOSITORY,
  RECURSOS_REPOSITORY,
  TRILHA_AUDITORIA,
} from './domain/ports';
import { FilaController } from './fila.controller';
import { ConvocacoesPrismaRepository } from './infra/convocacoes.prisma-repository';
import { FilaQueryService } from './infra/fila.query-service';
import { GeradorProtocoloAdapter } from './infra/gerador-protocolo.adapter';
import { InscricoesPrismaRepository } from './infra/inscricoes.prisma-repository';
import { ProgramasPrismaRepository } from './infra/programas.prisma-repository';
import { RecursosPrismaRepository } from './infra/recursos.prisma-repository';
import { TrilhaAuditoriaAdapter } from './infra/trilha-auditoria.adapter';

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
    { provide: PROGRAMAS_REPOSITORY, useClass: ProgramasPrismaRepository },
    { provide: INSCRICOES_REPOSITORY, useClass: InscricoesPrismaRepository },
    { provide: CONVOCACOES_REPOSITORY, useClass: ConvocacoesPrismaRepository },
    { provide: RECURSOS_REPOSITORY, useClass: RecursosPrismaRepository },
    { provide: TRILHA_AUDITORIA, useClass: TrilhaAuditoriaAdapter },
    { provide: GERADOR_PROTOCOLO, useClass: GeradorProtocoloAdapter },
  ],
})
export class FilaModule {}
