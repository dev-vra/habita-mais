import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

const TAMANHO_MINIMO_SENHA = 12;

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail funcional válido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  senha!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class TrocarSenhaDto {
  @IsString()
  @IsNotEmpty()
  senhaAtual!: string;

  @IsString()
  @MinLength(TAMANHO_MINIMO_SENHA, {
    message: `A nova senha precisa de ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
  })
  novaSenha!: string;
}

/** Acesso da família à central: o par que aparece na tela (spec, Identidade §8). */
export class AcessoMunicipeDto {
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o número do protocolo.' })
  protocolo!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o CPF do responsável familiar.' })
  cpf!: string;
}
