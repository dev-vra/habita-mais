import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const SEXOS = ['FEMININO', 'MASCULINO', 'NAO_INFORMADO'] as const;
const PARENTESCOS = [
  'RESPONSAVEL',
  'CONJUGE',
  'FILHO',
  'ENTEADO',
  'PAI_MAE',
  'AVO',
  'NETO',
  'IRMAO',
  'OUTRO_PARENTE',
  'NAO_PARENTE',
] as const;
const TIPOS_MORADIA = [
  'PROPRIA_QUITADA',
  'PROPRIA_FINANCIADA',
  'ALUGADA',
  'CEDIDA',
  'OCUPACAO',
  'ABRIGO',
  'SITUACAO_RUA',
  'OUTRO',
] as const;
const TIPOS_CONSTRUCAO = ['ALVENARIA', 'MADEIRA', 'MISTA', 'IMPROVISADO', 'OUTRO'] as const;
const SANEAMENTOS = ['REDE_PUBLICA', 'FOSSA_SEPTICA', 'FOSSA_RUDIMENTAR', 'CEU_ABERTO', 'OUTRO'] as const;

export class PessoaDto {
  /** Validação de dígito verificador fica no caso de uso — nunca confie na máscara do front. */
  @IsString()
  @IsNotEmpty({ message: 'Informe o CPF.' })
  cpf!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  nome!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nascimento?: Date;

  @IsOptional()
  @IsIn(SEXOS)
  sexo?: (typeof SEXOS)[number];

  @IsOptional()
  @IsString()
  nis?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  deficiencia?: boolean;

  @IsOptional() @IsString() nomeMae?: string;
  @IsOptional() @IsString() nomePai?: string;
  @IsOptional() @IsBoolean() nomePaiNaoInformado?: boolean;
  @IsOptional() @IsString() estadoCivil?: string;
  @IsOptional() @IsString() regimeBens?: string;
  @IsOptional() @IsString() rg?: string;
  @IsOptional() @IsString() orgaoExpedidor?: string;
  @IsOptional() @IsString() rgUf?: string;
  @IsOptional() @IsBoolean() rgAusente?: boolean;
  @IsOptional() @IsString() nacionalidade?: string;
  @IsOptional() @IsString() naturalidade?: string;
  @IsOptional() @IsString() profissao?: string;
  @IsOptional() @IsString() escolaridade?: string;
  @IsOptional() @IsString() situacaoTrabalho?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tiposDeficiencia?: string[];
  @IsOptional() @IsBoolean() usaCadeiraDeRodas?: boolean;
  @IsOptional() @IsBoolean() necessitaCuidador?: boolean;
  @IsOptional() @IsString() telefoneAlternativo?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() uf?: string;
  @IsOptional() @IsString() referencia?: string;
}

export class FichaSocialDto {
  @IsNumber()
  @Min(0)
  rendaFamiliar!: number;

  @IsInt()
  @Min(1)
  quantidadePessoas!: number;

  @IsInt()
  @Min(0)
  quantidadeMenores!: number;

  @IsOptional()
  @IsString()
  fonteRendaPrincipal?: string;

  @IsOptional()
  @IsString()
  nis?: string;

  @IsOptional()
  @IsString()
  beneficioAtivo?: string;

  @IsBoolean() mulherChefeFamilia!: boolean;
  @IsBoolean() temPessoaComDeficiencia!: boolean;
  @IsBoolean() temIdoso!: boolean;
  @IsBoolean() situacaoRisco!: boolean;
  @IsBoolean() moradiaInadequada!: boolean;
  @IsBoolean() possuiOutroImovel!: boolean;

  @IsOptional()
  @IsString()
  laudoRiscoKey?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  laudoRiscoEmitidoEm?: Date;

  @IsIn(TIPOS_MORADIA) tipoMoradia!: (typeof TIPOS_MORADIA)[number];
  @IsIn(TIPOS_CONSTRUCAO) tipoConstrucao!: (typeof TIPOS_CONSTRUCAO)[number];
  @IsIn(SANEAMENTOS) saneamento!: (typeof SANEAMENTOS)[number];

  @IsInt()
  @Min(0)
  mesesResidenciaMunicipio!: number;

  @Type(() => Date)
  @IsDate()
  apuradaEm!: Date;

  @Type(() => Date)
  @IsDate()
  validaAte!: Date;

  @IsOptional()
  @IsIn(['PROPRIA', 'REURB'])
  origem?: 'PROPRIA' | 'REURB';

  @IsOptional()
  @IsString()
  origemProcessoExterno?: string;

  @IsOptional() @IsString() fonteRenda?: string;
  @IsOptional() @IsString() regimeRenda?: string;
  @IsOptional() @IsBoolean() rendaComplementar?: boolean;
  @IsOptional() @IsString() rendaComplementarDesc?: string;
  @IsOptional() @IsBoolean() inscritoCadUnico?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) beneficios?: string[];
  @IsOptional() @IsString() estruturaFamiliar?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) vulnerabilidades?: string[];
  @IsOptional() @IsString() nivelVulnerabilidade?: string;
  @IsOptional() @IsString() parecerTecnico?: string;
  @IsOptional() @IsString() situacaoHabitacional?: string;
  @IsOptional() @IsInt() @Min(0) comodos?: number;
  @IsOptional() @IsInt() @Min(0) banheiros?: number;
  @IsOptional() @IsString() abastecimentoAgua?: string;
  @IsOptional() @IsString() energiaEletrica?: string;
  @IsOptional() @IsString() coletaLixo?: string;
  @IsOptional() @IsString() pavimentacao?: string;
  @IsOptional() @IsBoolean() iluminacaoPublica?: boolean;
  @IsOptional() @IsBoolean() drenagemPluvial?: boolean;
  @IsOptional() @IsBoolean() acessoEscolaProxima?: boolean;
  @IsOptional() @IsBoolean() acessoSaudeProxima?: boolean;
  @IsOptional() @IsBoolean() acessoTransportePublico?: boolean;
}

export class CadastrarFamiliaDto {
  @ValidateNested()
  @Type(() => PessoaDto)
  responsavel!: PessoaDto;

  @ValidateNested()
  @Type(() => FichaSocialDto)
  ficha!: FichaSocialDto;
}

export class MembroDto {
  @ValidateNested()
  @Type(() => PessoaDto)
  pessoa!: PessoaDto;

  @IsIn(PARENTESCOS)
  parentesco!: (typeof PARENTESCOS)[number];

  @IsBoolean()
  contribuiRenda!: boolean;
}

export class VisitaDto {
  @Type(() => Date)
  @IsDate()
  visitadaEm!: Date;

  @IsString()
  @IsNotEmpty({ message: 'A visita precisa de parecer técnico.' })
  parecer!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotos?: string[];
}
