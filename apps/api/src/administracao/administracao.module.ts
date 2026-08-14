import { Module } from '@nestjs/common';
import { AdministracaoController } from './administracao.controller';
import { ConfiguracaoUseCase } from './application/configuracao.use-case';
import { UsuariosUseCase } from './application/usuarios.use-case';
import { ADMINISTRACAO_REPOSITORY } from './domain/ports';
import { AdministracaoPrismaRepository } from './infra/administracao.prisma-repository';

@Module({
  controllers: [AdministracaoController],
  providers: [
    UsuariosUseCase,
    ConfiguracaoUseCase,
    { provide: ADMINISTRACAO_REPOSITORY, useClass: AdministracaoPrismaRepository },
  ],
})
export class AdministracaoModule {}
