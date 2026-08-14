import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CriarProgramaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do programa.' })
  nome!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a fonte do recurso.' })
  fonteRecurso!: string;

  @IsInt()
  @Min(1)
  vagas!: number;

  @Type(() => Date)
  @IsDate()
  inscricaoInicio!: Date;

  @Type(() => Date)
  @IsDate()
  inscricaoFim!: Date;

  @IsOptional()
  @IsString()
  regulamentoKey?: string;
}

export class AtualizarProgramaDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() fonteRecurso?: string;
  @IsOptional() @IsInt() @Min(1) vagas?: number;
  @IsOptional() @Type(() => Date) @IsDate() inscricaoInicio?: Date;
  @IsOptional() @Type(() => Date) @IsDate() inscricaoFim?: Date;
  @IsOptional() @IsString() regulamentoKey?: string;
}

export class SituacaoProgramaDto {
  @IsIn(['RASCUNHO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS', 'EM_EXECUCAO', 'ENCERRADO'])
  situacao!: string;
}

export class FaixaDto {
  @IsOptional()
  @IsNumber()
  ate!: number | null;

  @IsNumber()
  pontos!: number;
}

export class CriterioDto {
  @IsString() @IsNotEmpty() codigo!: string;
  @IsString() @IsNotEmpty() rotulo!: string;
  @IsIn(['FAIXA', 'FLAG', 'PROGRESSIVO']) tipo!: 'FAIXA' | 'FLAG' | 'PROGRESSIVO';

  @IsNumber()
  @Min(0)
  peso!: number;

  @IsString() @IsNotEmpty() fonte!: string;

  @IsOptional() @IsString() evidencia?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaixaDto)
  faixas?: FaixaDto[];

  @IsOptional() @IsNumber() pontosPorUnidade?: number;
  @IsOptional() @IsNumber() unidadeMaxima?: number;
}

export class RascunhoCriterioDto {
  /** Sem versão a copiar, o rascunho parte do modelo de referência calculado sobre este valor. */
  @IsOptional()
  @IsNumber()
  @Min(1)
  salarioMinimo?: number;

  @IsOptional()
  @IsString()
  copiarDaVersaoId?: string;
}

export class EditarCriteriosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterioDto)
  criterios!: CriterioDto[];
}
