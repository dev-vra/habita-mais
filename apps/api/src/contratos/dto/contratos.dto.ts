import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const INDICES = ['SEM_REAJUSTE', 'INPC', 'IPCA', 'TR', 'SALARIO_MINIMO'] as const;
const FORMAS = ['BOLETO', 'PIX', 'DINHEIRO', 'TRANSFERENCIA', 'DESCONTO_FOLHA', 'OUTRA'] as const;
const MOTIVOS = [
  'OBITO_TITULAR',
  'SEPARACAO_DIVORCIO',
  'ABANDONO_LAR',
  'DECISAO_JUDICIAL',
  'OUTRO',
] as const;
const SITUACOES = ['VIGENTE', 'SUSPENSO', 'QUITADO', 'RESCINDIDO'] as const;

export class CriarContratoDto {
  @IsString() @IsNotEmpty() unidadeId!: string;
  @IsString() @IsNotEmpty() familiaId!: string;
  @IsString() @IsNotEmpty() titularId!: string;

  @IsNumber() @Min(0.01) valorUnidade!: number;
  @IsOptional() @IsNumber() @Min(0) valorSubsidio?: number;
  @IsOptional() @IsNumber() @Min(0) valorEntrada?: number;

  @IsInt() @Min(1) @Max(600) quantidadeParcelas!: number;
  @IsInt() @Min(1) @Max(31) diaVencimento!: number;

  @IsIn(INDICES) indiceReajuste!: (typeof INDICES)[number];

  @Type(() => Date) @IsDate() assinadoEm!: Date;

  @Matches(/^\d{4}-\d{2}$/, { message: 'Competência no formato AAAA-MM.' })
  primeiraCompetencia!: string;

  @IsOptional() @IsString() tituloGarantiaKey?: string;
  @IsOptional() @IsString() observacao?: string;
}

export class SituacaoContratoDto {
  @IsIn(SITUACOES) situacao!: (typeof SITUACOES)[number];
  @IsOptional() @IsString() motivo?: string;
}

export class BaixaDto {
  @IsNumber() @Min(0.01) valor!: number;

  @Type(() => Date) @IsDate() pagoEm!: Date;

  @IsIn(FORMAS) forma!: (typeof FORMAS)[number];

  @IsOptional() @IsString() comprovanteKey?: string;
}

export class EstornoDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo do estorno.' })
  motivo!: string;
}

export class RenegociarDto {
  @IsString() @IsNotEmpty({ message: 'Informe o motivo da renegociação.' }) motivo!: string;

  @IsInt() @Min(1) @Max(600) novaQuantidade!: number;

  @Matches(/^\d{4}-\d{2}$/, { message: 'Competência no formato AAAA-MM.' })
  primeiraCompetencia!: string;

  @IsOptional() @IsInt() @Min(1) @Max(31) diaVencimento?: number;
  @IsOptional() @IsString() acordoKey?: string;
}

export class TransferirDto {
  @IsIn(MOTIVOS) motivo!: (typeof MOTIVOS)[number];

  @IsString() @IsNotEmpty() paraTitularId!: string;
  @IsString() @IsNotEmpty() paraFamiliaId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Fundamente a transferência.' })
  fundamentacao!: string;
}
