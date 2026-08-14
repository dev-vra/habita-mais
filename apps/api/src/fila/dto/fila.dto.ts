import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { DESFECHOS_CONVOCACAO } from '@habita/shared/habitacao';

export class InscreverFamiliaDto {
  @IsString()
  @IsNotEmpty()
  familiaId!: string;
}

export class PublicarRankingDto {
  @Type(() => Date)
  @IsDate({ message: 'Informe o prazo de recurso.' })
  prazoRecursoAte!: Date;
}

export class ConvocarDto {
  @Type(() => Date)
  @IsDate({ message: 'Informe o prazo de comparecimento.' })
  prazoComparecimentoAte!: Date;

  @IsOptional()
  @IsBoolean()
  foraDeOrdem?: boolean;

  /** Obrigatório quando fora de ordem — validado no caso de uso, que conhece a regra. */
  @IsOptional()
  @IsString()
  motivoExcecao?: string;
}

export class DesfechoConvocacaoDto {
  @IsIn(DESFECHOS_CONVOCACAO)
  desfecho!: (typeof DESFECHOS_CONVOCACAO)[number];

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class InterporRecursoDto {
  @IsString()
  @MinLength(20, { message: 'Descreva o motivo do recurso.' })
  motivo!: string;

  @Type(() => Date)
  @IsDate({ message: 'Informe o prazo de resposta.' })
  prazoRespostaAte!: Date;
}

export class DecidirRecursoDto {
  @IsIn(['DEFERIDO', 'INDEFERIDO', 'PARCIALMENTE_DEFERIDO'])
  decisao!: 'DEFERIDO' | 'INDEFERIDO' | 'PARCIALMENTE_DEFERIDO';

  @IsString()
  @IsNotEmpty()
  fundamentacao!: string;
}
