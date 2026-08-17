import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIPOS_ACOMPANHAMENTO = ['INICIAL', 'PERIODICA', 'EXTRAORDINARIA', 'APURACAO'] as const;

const EIXOS = [
  'MOBILIZACAO_ORGANIZACAO',
  'ACOMPANHAMENTO_GESTAO',
  'EDUCACAO_AMBIENTAL_PATRIMONIAL',
  'DESENVOLVIMENTO_SOCIOECONOMICO',
] as const;

const SITUACOES_EIXO = ['ADEQUADA', 'ATENCAO', 'CRITICA', 'NAO_AVALIADA'] as const;

const TIPOS_OCORRENCIA = [
  'CESSAO_TERCEIRO',
  'ALUGUEL',
  'VENDA_TRANSFERENCIA',
  'ABANDONO',
  'USO_COMERCIAL',
  'OBRA_IRREGULAR',
  'MUDANCA_COMPOSICAO',
  'OBITO_TITULAR',
  'OUTRA',
] as const;

const ORIGENS = ['VISITA', 'DENUNCIA', 'OFICIO', 'CRUZAMENTO_CADASTRAL', 'OUTRA'] as const;

const SITUACOES_OCORRENCIA = [
  'EM_APURACAO',
  'NOTIFICADA',
  'REGULARIZADA',
  'IMPROCEDENTE',
  'ENCAMINHADA_JURIDICO',
] as const;

export class EixoDto {
  @IsIn(EIXOS) eixo!: (typeof EIXOS)[number];
  @IsIn(SITUACOES_EIXO) situacao!: (typeof SITUACOES_EIXO)[number];
  @IsOptional() @IsString() observacao?: string;
}

export class RegistrarAcompanhamentoDto {
  @IsString() @IsNotEmpty() unidadeId!: string;

  @Type(() => Date) @IsDate() visitadaEm!: Date;

  @IsIn(TIPOS_ACOMPANHAMENTO) tipo!: (typeof TIPOS_ACOMPANHAMENTO)[number];

  @IsString()
  @IsNotEmpty({ message: 'Informe quem fez a visita.' })
  tecnicoNome!: string;

  @IsBoolean() residenciaConfirmada!: boolean;

  @IsOptional() @IsString() quemReside?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) moradoresEncontrados?: number;

  @IsString()
  @IsNotEmpty({ message: 'O parecer é o registro da visita — sem ele, a visita não prova nada.' })
  parecer!: string;

  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) fotos?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EixoDto)
  eixos!: EixoDto[];
}

export class AbrirOcorrenciaDto {
  @IsString() @IsNotEmpty() unidadeId!: string;

  @IsIn(TIPOS_OCORRENCIA) tipo!: (typeof TIPOS_OCORRENCIA)[number];
  @IsIn(ORIGENS) origem!: (typeof ORIGENS)[number];

  @IsString()
  @IsNotEmpty({ message: 'Descreva o que foi constatado.' })
  descricao!: string;

  @Type(() => Date) @IsDate() constatadaEm!: Date;

  @IsOptional() @IsString() acompanhamentoId?: string;
}

export class MoverOcorrenciaDto {
  @IsIn(SITUACOES_OCORRENCIA) situacao!: (typeof SITUACOES_OCORRENCIA)[number];

  @IsOptional() @IsString() motivo?: string;
}
