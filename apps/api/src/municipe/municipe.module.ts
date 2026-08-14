import { Module } from '@nestjs/common';
import { FilaModule } from '../fila/fila.module';
import { MunicipeController } from './municipe.controller';
import { MunicipeQueryService } from './municipe.query-service';
import { MunicipiosController, MunicipiosService } from './municipios.controller';

@Module({
  imports: [FilaModule],
  controllers: [MunicipeController, MunicipiosController],
  providers: [MunicipeQueryService, MunicipiosService],
})
export class MunicipeModule {}
