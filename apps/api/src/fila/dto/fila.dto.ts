import { Type } from 'class-transformer';
import {
  IsArray,
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

export class AbrirPendenciaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o tipo do documento pendente.' })
  tipo!: string;

  @IsString()
  @IsNotEmpty({ message: 'Descreva o que falta — é o que a família vai ler.' })
  descricao!: string;

  @Type(() => Date)
  @IsDate({ message: 'Informe o prazo de entrega.' })
  prazoAte!: Date;
}

export class ResolverPendenciaDto {
  @IsIn(['RESOLVIDA', 'DISPENSADA'])
  desfecho!: 'RESOLVIDA' | 'DISPENSADA';

  @IsOptional()
  @IsString()
  arquivoKey?: string;
}

export class BaixaRecadastramentoDto {
  @IsArray()
  @IsString({ each: true })
  inscricoes!: string[];
}

export class DecidirRecursoDto {
  @IsIn(['DEFERIDO', 'INDEFERIDO', 'PARCIALMENTE_DEFERIDO'])
  decisao!: 'DEFERIDO' | 'INDEFERIDO' | 'PARCIALMENTE_DEFERIDO';

  @IsString()
  @IsNotEmpty()
  fundamentacao!: string;
}
