import { Module } from '@nestjs/common';
import { AtualizarFichaUseCase } from './application/atualizar-ficha.use-case';
import { CadastrarFamiliaUseCase } from './application/cadastrar-familia.use-case';
import { RegistrarMembroVisitaUseCase } from './application/registrar-membro-visita.use-case';
import { FAMILIAS_REPOSITORY } from './domain/ports';
import { FamiliasController } from './familias.controller';
import { FamiliasPrismaRepository } from './infra/familias.prisma-repository';
import { FamiliasQueryService } from './infra/familias.query-service';

@Module({
  controllers: [FamiliasController],
  providers: [
    FamiliasQueryService,
    CadastrarFamiliaUseCase,
    AtualizarFichaUseCase,
    RegistrarMembroVisitaUseCase,
    { provide: FAMILIAS_REPOSITORY, useClass: FamiliasPrismaRepository },
  ],
})
export class FamiliasModule {}
