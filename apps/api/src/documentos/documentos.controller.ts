import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { EscopoDocumento } from '@prisma/client';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { actorId, getActiveContext } from '../context/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentosService } from './documentos.service';

const ESCOPOS = [
  'PESSOA',
  'FAMILIA',
  'INSCRICAO',
  'PROGRAMA',
  'CONVENIO',
  'OBRA',
  'UNIDADE',
  'CONTRATO',
  'CASO_RETOMADA',
] as const;

const FINALIDADES = [
  'REGISTRO_CARTORIO',
  'PRESTACAO_CONTAS',
  'HABITE_SE',
  'CONTRATO_MUTUARIO',
  'RETOMADA_UNIDADE',
  'OUTRA',
] as const;

class TipoDocumentoDto {
  @IsString() @IsNotEmpty() codigo!: string;
  @IsString() @IsNotEmpty() nome!: string;
  @IsIn(ESCOPOS) escopo!: string;
  @IsOptional() @IsInt() @Min(1) validadeMeses?: number;
  @IsOptional() @IsString() orientacao?: string;
}

class JuntarDocumentoDto {
  @IsString() @IsNotEmpty() tipoDocumentoId!: string;
  @IsIn(ESCOPOS) escopo!: string;
  @IsString() @IsNotEmpty() referenciaId!: string;
  @IsString() @IsNotEmpty() arquivoKey!: string;
  @IsString() @IsNotEmpty() nomeArquivo!: string;
  @IsString() @IsNotEmpty() mimeType!: string;
  @IsInt() @Min(1) tamanho!: number;

  @IsOptional() @Type(() => Date) @IsDate() emitidoEm?: Date;
  @IsOptional() @IsString() observacao?: string;
}

class ConferirDto {
  @IsIn(['CONFERIDO', 'RECUSADO']) decisao!: 'CONFERIDO' | 'RECUSADO';
  @IsOptional() @IsString() motivoRecusa?: string;
}

class ExigenciaDto {
  @IsArray()
  @IsString({ each: true })
  tiposDocumento!: string[];
}

class MontarPilhaDto {
  @IsIn(FINALIDADES) finalidade!: string;
  @IsIn(ESCOPOS) escopo!: string;
  @IsString() @IsNotEmpty() referenciaId!: string;
  @IsString() @IsNotEmpty() nome!: string;

  @IsArray()
  @IsString({ each: true })
  tiposDocumento!: string[];
}

class FecharPilhaDto {
  @IsString() @IsNotEmpty() entreguePara!: string;
}

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  listar(escopo?: string) {
    return this.prisma.tx.tipoDocumento.findMany({
      where: {
        deletedAt: null,
        ...(escopo ? { escopo: escopo as EscopoDocumento } : {}),
      },
      orderBy: [{ escopo: 'asc' }, { nome: 'asc' }],
    });
  }

  criar(dados: TipoDocumentoDto) {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.tipoDocumento.create({
      data: {
        tenantId: tenantId ?? '',
        codigo: dados.codigo.toUpperCase().replace(/\s+/g, '_'),
        nome: dados.nome,
        escopo: dados.escopo as EscopoDocumento,
        validadeMeses: dados.validadeMeses ?? null,
        orientacao: dados.orientacao ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, codigo: true },
    });
  }

  /** Exigências do programa: a lista que vira cobrança na inscrição. */
  async definirExigencias(programaId: string, tiposDocumento: string[]) {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    await this.prisma.tx.exigenciaDocumental.deleteMany({
      where: { programaId, tipoDocumentoId: { notIn: tiposDocumento } },
    });

    for (const tipoDocumentoId of tiposDocumento) {
      await this.prisma.tx.exigenciaDocumental.upsert({
        where: { programaId_tipoDocumentoId: { programaId, tipoDocumentoId } },
        update: {},
        create: {
          tenantId: tenantId ?? '',
          programaId,
          tipoDocumentoId,
          createdBy: ator,
          updatedBy: ator,
        },
      });
    }

    return { exigencias: tiposDocumento.length };
  }

  exigencias(programaId: string) {
    return this.prisma.tx.exigenciaDocumental.findMany({
      where: { programaId },
      include: { tipo: true },
      orderBy: { tipo: { nome: 'asc' } },
    });
  }
}

@Controller()
export class DocumentosController {
  constructor(
    private readonly documentos: DocumentosService,
    private readonly catalogo: CatalogoService,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('tipos-documento')
  listarTipos(@Query('escopo') escopo?: string) {
    return this.catalogo.listar(escopo);
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @Post('tipos-documento')
  criarTipo(@Body() dto: TipoDocumentoDto) {
    return this.catalogo.criar(dto);
  }

  @RequerCapacidade('GERIR_PROGRAMA')
  @HttpCode(HttpStatus.OK)
  @Post('programas/:programaId/exigencias')
  definirExigencias(@Param('programaId') programaId: string, @Body() dto: ExigenciaDto) {
    return this.catalogo.definirExigencias(programaId, dto.tiposDocumento);
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('programas/:programaId/exigencias')
  exigencias(@Param('programaId') programaId: string) {
    return this.catalogo.exigencias(programaId);
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO', 'CADASTRAR_FAMILIA', 'EDITAR_FICHA_SOCIAL')
  @Post('documentos')
  juntar(@Body() dto: JuntarDocumentoDto) {
    return this.documentos.juntar(dto, new Date());
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('documentos/:documentoId/conferencia')
  conferir(@Param('documentoId') documentoId: string, @Body() dto: ConferirDto) {
    return this.documentos.conferir(documentoId, dto.decisao, dto.motivoRecusa);
  }

  /** Situação documental de uma entidade — com programa, vira conferência contra as exigências. */
  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('documentos/situacao/:escopo/:referenciaId')
  situacao(
    @Param('escopo') escopo: string,
    @Param('referenciaId') referenciaId: string,
    @Query('programaId') programaId?: string,
  ) {
    return this.documentos.situacao(escopo, referenciaId, programaId);
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO', 'GERIR_CONTRATO', 'GERIR_PROGRAMA')
  @Post('pilhas')
  montarPilha(@Body() dto: MontarPilhaDto) {
    return this.documentos.montarPilha({ ...dto, agora: new Date() });
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('pilhas/:pilhaId')
  pilha(@Param('pilhaId') pilhaId: string) {
    return this.documentos.pilha(pilhaId);
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO', 'GERIR_CONTRATO')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('pilhas/:pilhaId/entrega')
  fecharPilha(@Param('pilhaId') pilhaId: string, @Body() dto: FecharPilhaDto) {
    return this.documentos.fecharPilha(pilhaId, dto.entreguePara);
  }
}

@Module({
  controllers: [DocumentosController],
  providers: [DocumentosService, CatalogoService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
