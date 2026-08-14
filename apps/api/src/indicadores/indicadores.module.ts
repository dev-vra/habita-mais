import { Module } from '@nestjs/common';
import { IndicadoresController, IndicadoresService } from './indicadores.controller';

@Module({
  controllers: [IndicadoresController],
  providers: [IndicadoresService],
})
export class IndicadoresModule {}
