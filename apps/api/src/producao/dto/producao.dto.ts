import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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

const ORIGENS = [
  'FEDERAL',
  'ESTADUAL',
  'MUNICIPAL',
  'FGTS',
  'FINANCIAMENTO',
  'EMENDA_PARLAMENTAR',
  'OUTRA',
] as const;

const SITUACOES_OBRA = [
  'NAO_INICIADA',
  'EM_EXECUCAO',
  'PARALISADA',
  'CONCLUIDA',
  'RESCINDIDA',
] as const;

const SITUACOES_UNIDADE = [
  'PLANEJADA',
  'EM_OBRA',
  'PRONTA',
  'ENTREGUE',
  'DESOCUPADA',
  'EM_LITIGIO',
  'RETOMADA',
  'CANCELADA',
] as const;

export class CriarConvenioDto {
  @IsOptional() @IsString() numeroExterno?: string;

  @IsString()
  @IsNotEmpty({ message: 'Descreva o objeto do convênio.' })
  objeto!: string;

  @IsIn(ORIGENS) origem!: (typeof ORIGENS)[number];

  @IsString()
  @IsNotEmpty({ message: 'Informe o órgão repassador.' })
  orgaoRepassador!: string;

  @IsNumber() @Min(0) valorRepasse!: number;
  @IsOptional() @IsNumber() @Min(0) valorContrapartida?: number;

  @Type(() => Date) @IsDate() vigenciaInicio!: Date;
  @Type(() => Date) @IsDate() vigenciaFim!: Date;

  @IsOptional() @IsString() observacao?: string;
}

export class CriarEmpreendimentoDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do empreendimento.' })
  nome!: string;

  @IsOptional() @IsString() convenioId?: string;
  @IsOptional() @IsString() programaId?: string;

  @IsString() @IsNotEmpty({ message: 'Informe o endereço.' }) endereco!: string;
  @IsString() @IsNotEmpty({ message: 'Informe o bairro.' }) bairro!: string;
  @IsOptional() @IsString() cep?: string;

  @IsInt() @Min(1, { message: 'O empreendimento precisa prever ao menos uma unidade.' })
  unidadesPrevistas!: number;

  @IsOptional() @Type(() => Date) @IsDate() previsaoEntrega?: Date;
  @IsOptional() @IsString() observacao?: string;
}

export class CriarObraDto {
  @IsString() @IsNotEmpty() empreendimentoId!: string;

  @IsString() @IsNotEmpty({ message: 'Descreva a obra.' }) descricao!: string;

  @IsString() @IsNotEmpty({ message: 'Informe a executora.' }) executoraNome!: string;

  /** DV conferido no caso de uso — máscara do front não é validação. */
  @IsString() @IsNotEmpty({ message: 'Informe o CNPJ da executora.' }) executoraCnpj!: string;

  @IsString() @IsNotEmpty({ message: 'Informe o número do contrato.' }) numeroContrato!: string;

  @IsOptional() @IsString() artRrt?: string;

  @IsNumber() @Min(0.01, { message: 'O valor do contrato precisa ser maior que zero.' })
  valorContrato!: number;

  @Type(() => Date) @IsDate() inicioPrevisto!: Date;
  @Type(() => Date) @IsDate() terminoPrevisto!: Date;
}

export class EtapaDto {
  @IsString() @IsNotEmpty() codigo!: string;
  @IsString() @IsNotEmpty() nome!: string;

  @IsNumber() @Min(0.01) @Max(100) peso!: number;

  @Type(() => Date) @IsDate() previstaAte!: Date;
}

export class DefinirEtapasDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'O cronograma precisa de ao menos uma etapa.' })
  @ValidateNested({ each: true })
  @Type(() => EtapaDto)
  etapas!: EtapaDto[];
}

export class ExecucaoEtapaDto {
  @IsNumber() @Min(0) @Max(100) executado!: number;
}

export class SituacaoObraDto {
  @IsIn(SITUACOES_OBRA) situacao!: (typeof SITUACOES_OBRA)[number];

  /** Paralisar e rescindir sem motivo é decisão que ninguém explica na prestação de contas. */
  @IsOptional() @IsString() motivo?: string;
}

export class CriarMedicaoDto {
  @Type(() => Date) @IsDate() periodoInicio!: Date;
  @Type(() => Date) @IsDate() periodoFim!: Date;

  @IsNumber() @Min(0) @Max(100) percentualAcumulado!: number;
  @IsNumber() @Min(0.01) valor!: number;

  @IsString() @IsNotEmpty({ message: 'Informe o fiscal responsável pela medição.' })
  fiscalNome!: string;
}

export class EncerrarMedicaoDto {
  @IsIn(['REJEITADA', 'CANCELADA']) situacao!: 'REJEITADA' | 'CANCELADA';

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo — medição desfeita sem motivo é buraco na prestação de contas.' })
  motivo!: string;
}

export class CriarUnidadeDto {
  @IsString() @IsNotEmpty() empreendimentoId!: string;
  @IsString() @IsNotEmpty({ message: 'Informe a identificação da unidade.' }) identificacao!: string;

  @IsOptional() @IsString() quadra?: string;
  @IsOptional() @IsString() lote?: string;

  @IsString() @IsNotEmpty({ message: 'Informe o endereço da unidade.' }) endereco!: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() tipologia?: string;

  @IsOptional() @IsNumber() @Min(0) areaConstruida?: number;
  @IsOptional() @IsNumber() @Min(0) areaTerreno?: number;

  @IsOptional() @IsString() matricula?: string;
  @IsOptional() @IsString() cartorio?: string;
  @IsOptional() @IsString() inscricaoImobiliaria?: string;
  @IsOptional() @IsNumber() @Min(0) valorAvaliado?: number;
}

/**
 * Geração em lote das unidades de um conjunto: 120 casas iguais não devem ser digitadas 120 vezes.
 * O sistema propõe a identificação sequencial e o servidor corrige o que for diferente.
 */
export class GerarUnidadesDto {
  @IsInt() @Min(1) @Max(500, { message: 'Gere no máximo 500 unidades por vez.' })
  quantidade!: number;

  @IsOptional() @IsString() prefixo?: string;
  @IsOptional() @IsInt() @Min(1) inicio?: number;
  @IsOptional() @IsString() quadra?: string;
  @IsOptional() @IsString() tipologia?: string;
  @IsOptional() @IsNumber() @Min(0) areaConstruida?: number;
  @IsOptional() @IsNumber() @Min(0) areaTerreno?: number;
  @IsOptional() @IsNumber() @Min(0) valorAvaliado?: number;
}

export class MoverUnidadeDto {
  @IsIn(SITUACOES_UNIDADE) situacao!: (typeof SITUACOES_UNIDADE)[number];

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo da mudança de situação.' })
  motivo!: string;

  /** Só faz sentido na entrega: é o núcleo que recebe a casa, não a pessoa. */
  @IsOptional() @IsString() familiaId?: string;
}
