import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { EncaminhamentosUseCase } from './application/encaminhamentos.use-case';
import { SETORES_REPOSITORY } from './domain/ports';
import { Inject } from '@nestjs/common';
import type { SetoresRepository } from './domain/ports';
import { SetoresQueryService } from './infra/setores.query-service';

const TIPOS_SETOR = [
  'HABITACAO',
  'ASSISTENCIA_SOCIAL',
  'DEFESA_CIVIL',
  'OBRAS',
  'JURIDICO',
  'PLANEJAMENTO_URBANO',
  'MEIO_AMBIENTE',
  'FAZENDA',
  'GABINETE',
  'CONTROLE_INTERNO',
  'OUTRO',
] as const;

const TIPOS_SOLICITACAO = [
  'LAUDO_RISCO',
  'PARECER_JURIDICO',
  'VISTORIA_TECNICA',
  'ANALISE_PROJETO',
  'APOIO_SOCIAL',
  'OUTRO',
] as const;

class CriarSetorDto {
  @IsString() @IsNotEmpty() nome!: string;
  @IsString() @IsNotEmpty() sigla!: string;
  @IsIn(TIPOS_SETOR) tipo!: string;
  @IsOptional() @IsString() secretaria?: string;
  @IsOptional() @IsString() email?: string;
}

class AbrirEncaminhamentoDto {
  @IsString() @IsNotEmpty() setorDestinoId!: string;
  @IsIn(TIPOS_SOLICITACAO) tipoSolicitacao!: string;
  @IsString() @IsNotEmpty() entidade!: string;
  @IsString() @IsNotEmpty() entidadeId!: string;
  @IsString() @IsNotEmpty() referenciaResumo!: string;
  @IsString() @IsNotEmpty() assunto!: string;
  @IsString() @IsNotEmpty() descricao!: string;

  @Type(() => Date)
  @IsDate()
  prazoAte!: Date;
}

class ResponderDto {
  @IsString() @IsNotEmpty() resposta!: string;
  @IsOptional() @IsString() anexoKey?: string;
}

class DevolverDto {
  @IsString() @IsNotEmpty() motivo!: string;
}

@Controller()
export class SetoresController {
  constructor(
    @Inject(SETORES_REPOSITORY) private readonly setores: SetoresRepository,
    private readonly consulta: SetoresQueryService,
    private readonly encaminhamentos: EncaminhamentosUseCase,
  ) {}

  @Get('setores')
  listarSetores() {
    return this.setores.listarSetores();
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @Post('setores')
  criarSetor(@Body() dto: CriarSetorDto) {
    return this.setores.criarSetor(dto);
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('setores/:setorId')
  desativarSetor(@Param('setorId') setorId: string) {
    return this.setores.desativarSetor(setorId);
  }

  /** Caixa do usuário: a RLS decide se ele vê o que enviou ou o que recebeu. */
  @Get('encaminhamentos')
  caixa(
    @Query('situacao') situacao?: string,
    @Query('entidade') entidade?: string,
    @Query('entidadeId') entidadeId?: string,
  ) {
    return this.consulta.caixa({ situacao, entidade, entidadeId });
  }

  @RequerCapacidade('ENCAMINHAR_SETOR')
  @Post('encaminhamentos')
  abrir(@Body() dto: AbrirEncaminhamentoDto, @CurrentUser() user: AuthUser) {
    return this.encaminhamentos.abrir({ ...dto, agora: new Date() }, user.setorId);
  }

  @RequerCapacidade('RESPONDER_ENCAMINHAMENTO')
  @HttpCode(HttpStatus.OK)
  @Post('encaminhamentos/:encaminhamentoId/resposta')
  responder(
    @Param('encaminhamentoId') encaminhamentoId: string,
    @Body() dto: ResponderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.encaminhamentos.responder({
      encaminhamentoId,
      resposta: dto.resposta,
      anexoKey: dto.anexoKey,
      setorDoUsuario: user.setorId,
    });
  }

  @RequerCapacidade('RESPONDER_ENCAMINHAMENTO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('encaminhamentos/:encaminhamentoId/devolucao')
  devolver(
    @Param('encaminhamentoId') encaminhamentoId: string,
    @Body() dto: DevolverDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.encaminhamentos.devolver(encaminhamentoId, dto.motivo, user.setorId);
  }
}
