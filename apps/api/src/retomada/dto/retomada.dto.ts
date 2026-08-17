import { Type } from 'class-transformer';
import { IsDate, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

const FORMAS = ['PESSOAL', 'AR_CORREIO', 'EDITAL'] as const;
const DECISOES = ['REGULARIZACAO', 'ACORDO', 'RESCISAO', 'ARQUIVAMENTO'] as const;

export class AbrirCasoDto {
  @IsString() @IsNotEmpty() unidadeId!: string;

  @IsOptional() @IsString() ocorrenciaId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a base legal invocada.' })
  fundamentacaoLegal!: string;

  @IsString()
  @IsNotEmpty({ message: 'Descreva o descumprimento apurado.' })
  descricao!: string;
}

export class TentativaDto {
  @IsString()
  @IsNotEmpty({ message: 'Descreva a tentativa — é o que justifica o edital depois.' })
  detalhe!: string;
}

export class NotificarDto {
  @IsIn(FORMAS) forma!: (typeof FORMAS)[number];

  @Type(() => Date) @IsDate() notificadoEm!: Date;

  /** Obrigatório fora do edital — a validação de conteúdo fica no caso de uso. */
  @IsOptional() @IsString() comprovanteKey?: string;

  @IsOptional() @IsInt() @Min(5) @Max(60) prazoDefesaDias?: number;
}

export class DefesaDto {
  @Type(() => Date) @IsDate() apresentadaEm!: Date;

  @IsString()
  @IsNotEmpty({ message: 'Registre o teor da defesa.' })
  teor!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe quem apresentou a defesa.' })
  apresentadaPor!: string;

  @IsOptional() @IsString() arquivoKey?: string;
}

export class DecidirDto {
  @IsIn(DECISOES) decisao!: (typeof DECISOES)[number];

  @IsString()
  @IsNotEmpty({ message: 'A decisão precisa ser fundamentada.' })
  fundamentacao!: string;
}

export class EncerrarCasoDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo do encerramento.' })
  motivo!: string;
}
