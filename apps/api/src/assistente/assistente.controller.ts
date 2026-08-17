import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { AssistenteUseCase } from './application/assistente.use-case';
import {
  DesfechoDto,
  ExtrairDocumentoDto,
  ParecerVisitaDto,
  ResumoEncaminhamentoDto,
} from './dto/assistente.dto';
import { ConferenciaQueryService } from './infra/conferencia.query-service';
import { ExtracaoService } from './infra/extracao.service';

/**
 * Assistente e conferência.
 *
 * As duas coisas moram no mesmo módulo por contraste deliberado: a conferência da ficha é
 * determinística e sempre disponível; o rascunho depende de um modelo externo e pode estar fora do
 * ar. Quando o assistente cai, o trabalho continua — só o atalho some.
 */
@Controller('assistente')
export class AssistenteController {
  constructor(
    private readonly assistente: AssistenteUseCase,
    private readonly conferencia: ConferenciaQueryService,
    private readonly extracao: ExtracaoService,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('estado')
  estado() {
    return {
      disponivel: this.assistente.disponivel(),
      usos: habitacao.USOS_IA.map((uso) => ({ uso, ...habitacao.DESCRICAO_USOS[uso] })),
      proibidos: habitacao.USOS_PROIBIDOS,
      aviso: habitacao.AVISO_PADRAO,
    };
  }

  /** Conferência da ficha: sem IA, sempre disponível. */
  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('conferencia/:familiaId')
  conferir(@Param('familiaId') familiaId: string) {
    return this.conferencia.daFamilia(familiaId);
  }

  @RequerCapacidade('ACOMPANHAR_POS_ENTREGA')
  @Post('parecer-visita')
  parecerVisita(@Body() dto: ParecerVisitaDto) {
    return this.assistente.rascunharParecerVisita(dto);
  }

  @RequerCapacidade('ENCAMINHAR_SETOR')
  @Post('resumo-encaminhamento')
  resumoEncaminhamento(@Body() dto: ResumoEncaminhamentoDto) {
    return this.assistente.rascunharResumoEncaminhamento(dto);
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO')
  @Post('extrair-documento')
  extrair(@Body() dto: ExtrairDocumentoDto) {
    return this.extracao.doDocumento(dto.documentoId, dto.campos);
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('sugestoes/:sugestaoId/desfecho')
  desfecho(@Param('sugestaoId') sugestaoId: string, @Body() dto: DesfechoDto) {
    return this.assistente.registrarDesfecho(sugestaoId, dto.desfecho, dto.textoFinal);
  }
}
