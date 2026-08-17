import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { habitacao } from '@habita/shared';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { PosEntregaUseCase } from './application/pos-entrega.use-case';
import {
  AbrirOcorrenciaDto,
  MoverOcorrenciaDto,
  RegistrarAcompanhamentoDto,
} from './dto/pos-entrega.dto';
import { PosEntregaQueryService } from './infra/pos-entrega.query-service';

/**
 * Pós-entrega. A separação de capacidades segue quem responde pelo ato: o técnico social visita e
 * constata; a decisão sobre a moradia da família é de quem tem DECIDIR_OCORRENCIA.
 */
@Controller('pos-entrega')
export class PosEntregaController {
  constructor(
    private readonly consulta: PosEntregaQueryService,
    private readonly posEntrega: PosEntregaUseCase,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('agenda')
  agenda(@Query('situacao') situacao?: habitacao.SituacaoAcompanhamento) {
    return this.consulta.agenda({ situacao });
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('ocorrencias')
  ocorrencias() {
    return this.consulta.ocorrenciasEmAberto();
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('unidades/:unidadeId')
  async historico(@Param('unidadeId') unidadeId: string) {
    const historico = await this.consulta.historicoDaUnidade(unidadeId);
    if (!historico) throw new NotFoundException('Unidade não encontrada.');
    return historico;
  }

  @RequerCapacidade('ACOMPANHAR_POS_ENTREGA')
  @Post('acompanhamentos')
  registrar(@Body() dto: RegistrarAcompanhamentoDto) {
    return this.posEntrega.registrarAcompanhamento(dto);
  }

  @RequerCapacidade('REGISTRAR_OCORRENCIA')
  @Post('ocorrencias')
  abrir(@Body() dto: AbrirOcorrenciaDto) {
    return this.posEntrega.abrirOcorrencia(dto);
  }

  @RequerCapacidade('DECIDIR_OCORRENCIA')
  @HttpCode(HttpStatus.OK)
  @Post('ocorrencias/:ocorrenciaId/situacao')
  mover(@Param('ocorrenciaId') ocorrenciaId: string, @Body() dto: MoverOcorrenciaDto) {
    return this.posEntrega.moverOcorrencia(ocorrenciaId, dto.situacao, dto.motivo);
  }
}
