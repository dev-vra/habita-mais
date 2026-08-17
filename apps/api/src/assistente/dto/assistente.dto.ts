import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const DESFECHOS = ['ACEITA', 'EDITADA', 'REJEITADA'] as const;

export class EixoRascunhoDto {
  @IsString() @IsNotEmpty() eixo!: string;
  @IsString() @IsNotEmpty() situacao!: string;
  @IsOptional() @IsString() observacao?: string;
}

export class ParecerVisitaDto {
  @IsString() @IsNotEmpty() acompanhamentoId!: string;
  @IsString() @IsNotEmpty() unidade!: string;
  @IsString() @IsNotEmpty() familia!: string;

  @IsBoolean() residenciaConfirmada!: boolean;

  @IsOptional() @IsString() quemReside?: string;
  @IsOptional() @IsInt() @Min(0) moradoresEncontrados?: number;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => EixoRascunhoDto)
  eixos!: EixoRascunhoDto[];

  @IsOptional() @IsString() anotacoes?: string;
}

export class ResumoEncaminhamentoDto {
  @IsString() @IsNotEmpty() familiaId!: string;
  @IsString() @IsNotEmpty() familia!: string;
  @IsString() @IsNotEmpty() tipoSolicitacao!: string;
  @IsString() @IsNotEmpty() contexto!: string;
}

export class ExtrairDocumentoDto {
  @IsString() @IsNotEmpty() documentoId!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  campos!: string[];
}

export class DesfechoDto {
  @IsIn(DESFECHOS) desfecho!: (typeof DESFECHOS)[number];

  /** Obrigatório quando editada — é o texto que ficou de fato. */
  @IsOptional() @IsString() textoFinal?: string;
}
