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
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { RetomadaUseCase } from './application/retomada.use-case';
import {
  AbrirCasoDto,
  DecidirDto,
  DefesaDto,
  EncerrarCasoDto,
  NotificarDto,
  TentativaDto,
} from './dto/retomada.dto';
import { RetomadaQueryService } from './infra/retomada.query-service';

/**
 * Processo de retomada.
 *
 * Instruir e decidir são capacidades diferentes: quem monta o processo não é quem tira a casa.
 * DECIDIR_OCORRENCIA instrui; a decisão exige EMITIR_PARECER_JURIDICO — o passo que, na prefeitura,
 * é do procurador.
 */
@Controller('retomada')
export class RetomadaController {
  constructor(
    private readonly consulta: RetomadaQueryService,
    private readonly retomada: RetomadaUseCase,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('casos')
  listar(@Query('encerrados') encerrados?: string) {
    return this.consulta.listar(encerrados === 'true');
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('casos/:casoId')
  async detalhe(@Param('casoId') casoId: string) {
    const caso = await this.consulta.detalhe(casoId);
    if (!caso) throw new NotFoundException('Processo não encontrado.');
    return caso;
  }

  @RequerCapacidade('DECIDIR_OCORRENCIA')
  @Post('casos')
  abrir(@Body() dto: AbrirCasoDto) {
    return this.retomada.abrir(dto);
  }

  @RequerCapacidade('DECIDIR_OCORRENCIA')
  @Post('casos/:casoId/tentativas')
  tentativa(@Param('casoId') casoId: string, @Body() dto: TentativaDto) {
    return this.retomada.registrarTentativaFrustrada(casoId, dto.detalhe);
  }

  @RequerCapacidade('DECIDIR_OCORRENCIA')
  @Post('casos/:casoId/notificar')
  notificar(@Param('casoId') casoId: string, @Body() dto: NotificarDto) {
    return this.retomada.notificar(casoId, dto);
  }

  // A defesa é da família; quem registra é o balcão. Atendente pode protocolar.
  @RequerCapacidade('ACESSAR_HABITACAO')
  @Post('casos/:casoId/defesa')
  defesa(@Param('casoId') casoId: string, @Body() dto: DefesaDto) {
    return this.retomada.registrarDefesa(casoId, dto);
  }

  @RequerCapacidade('DECIDIR_OCORRENCIA')
  @Post('casos/:casoId/analise')
  analise(@Param('casoId') casoId: string) {
    return this.retomada.enviarParaAnalise(casoId);
  }

  @RequerCapacidade('EMITIR_PARECER_JURIDICO')
  @Post('casos/:casoId/decisao')
  decidir(@Param('casoId') casoId: string, @Body() dto: DecidirDto) {
    return this.retomada.decidir(casoId, dto);
  }

  @RequerCapacidade('DECIDIR_OCORRENCIA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('casos/:casoId/encerrar')
  encerrar(@Param('casoId') casoId: string, @Body() dto: EncerrarCasoDto) {
    return this.retomada.encerrar(casoId, dto.motivo);
  }
}
