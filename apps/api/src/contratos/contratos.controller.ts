import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import type { habitacao } from '@habita/shared';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { ContratosUseCase } from './application/contratos.use-case';
import {
  BaixaDto,
  CriarContratoDto,
  EstornoDto,
  RenegociarDto,
  SituacaoContratoDto,
  TransferirDto,
} from './dto/contratos.dto';
import { ContratosQueryService } from './infra/contratos.query-service';

/**
 * Contratos de mutuário.
 *
 * A leitura exige VER_DADO_FINANCEIRO: saldo devedor e histórico de pagamento não são dado de
 * atendimento comum. Transferir titularidade é capacidade sensível — concedida pessoa a pessoa,
 * nunca herdada do cargo (§5).
 */
@Controller('contratos')
export class ContratosController {
  constructor(
    private readonly consulta: ContratosQueryService,
    private readonly contratos: ContratosUseCase,
  ) {}

  @RequerCapacidade('VER_DADO_FINANCEIRO')
  @Get()
  listar(
    @Query('situacao') situacao?: habitacao.SituacaoContrato,
    @Query('inadimplentes') inadimplentes?: string,
  ) {
    return this.consulta.listar({ situacao, inadimplentes: inadimplentes === 'true' });
  }

  @RequerCapacidade('VER_DADO_FINANCEIRO')
  @Get(':contratoId')
  detalhe(@Param('contratoId') contratoId: string) {
    return this.consulta.detalhe(contratoId);
  }

  @RequerCapacidade('GERIR_CONTRATO')
  @Post()
  criar(@Body() dto: CriarContratoDto) {
    return this.contratos.criar({
      ...dto,
      valorSubsidio: dto.valorSubsidio ?? 0,
      valorEntrada: dto.valorEntrada ?? 0,
    });
  }

  @RequerCapacidade('GERIR_CONTRATO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':contratoId/situacao')
  situacao(@Param('contratoId') contratoId: string, @Body() dto: SituacaoContratoDto) {
    return this.contratos.definirSituacao(contratoId, dto.situacao, dto.motivo);
  }

  @RequerCapacidade('BAIXAR_PAGAMENTO')
  @Post('parcelas/:parcelaId/baixa')
  baixa(@Param('parcelaId') parcelaId: string, @Body() dto: BaixaDto) {
    return this.contratos.darBaixa({ ...dto, parcelaId });
  }

  @RequerCapacidade('BAIXAR_PAGAMENTO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('pagamentos/:pagamentoId/estorno')
  estorno(@Param('pagamentoId') pagamentoId: string, @Body() dto: EstornoDto) {
    return this.contratos.estornar(pagamentoId, dto.motivo);
  }

  @RequerCapacidade('RENEGOCIAR_CONTRATO')
  @Post(':contratoId/renegociacao')
  renegociar(@Param('contratoId') contratoId: string, @Body() dto: RenegociarDto) {
    return this.contratos.renegociar(contratoId, dto);
  }

  @RequerCapacidade('TRANSFERIR_TITULARIDADE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':contratoId/transferencia')
  transferir(@Param('contratoId') contratoId: string, @Body() dto: TransferirDto) {
    return this.contratos.transferir(contratoId, dto);
  }
}
