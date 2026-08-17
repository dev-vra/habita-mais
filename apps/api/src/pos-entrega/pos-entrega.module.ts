import { Module } from '@nestjs/common';
import { PosEntregaUseCase } from './application/pos-entrega.use-case';
import { POS_ENTREGA_REPOSITORY } from './domain/ports';
import { PosEntregaPrismaRepository } from './infra/pos-entrega.prisma-repository';
import { PosEntregaQueryService } from './infra/pos-entrega.query-service';
import { PosEntregaController } from './pos-entrega.controller';

@Module({
  controllers: [PosEntregaController],
  providers: [
    PosEntregaQueryService,
    PosEntregaUseCase,
    { provide: POS_ENTREGA_REPOSITORY, useClass: PosEntregaPrismaRepository },
  ],
  // O painel do gestor mostra quantas visitas venceram. O cálculo do vencimento mora no domínio
  // compartilhado e é feito aqui — recontar por SQL na fila duplicaria a regra e as duas contas
  // divergiriam na primeira mudança de periodicidade.
  exports: [PosEntregaQueryService],
})
export class PosEntregaModule {}
