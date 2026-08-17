import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CAPACIDADES, PERFIS_TENANT, type Capacidade, type PerfilTenant } from '@habita/shared/habitacao';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ConfiguracaoUseCase } from './application/configuracao.use-case';
import { UsuariosUseCase } from './application/usuarios.use-case';

class CriarUsuarioDto {
  @IsString() @IsNotEmpty() nome!: string;
  @IsEmail() email!: string;
  @IsIn(PERFIS_TENANT) perfil!: PerfilTenant;
  @IsOptional() @IsString() setorId?: string;
}

class StatusDto {
  @IsIn(['ATIVO', 'BLOQUEADO', 'INATIVO']) status!: string;
}

class CapacidadeDto {
  @IsIn(CAPACIDADES) capacidade!: Capacidade;
  @IsBoolean() concedida!: boolean;
  @IsString() @IsNotEmpty() motivo!: string;
}

class SalarioMinimoDto {
  @Type(() => Number) @IsNumber() salarioMinimo!: number;
}

class SignatarioDto {
  @IsString() @IsNotEmpty() nome!: string;
  @IsIn(['PREFEITO', 'VICE_PREFEITO', 'SECRETARIO', 'DIRETOR_HABITACAO', 'PROCURADOR', 'OUTRO'])
  papel!: string;
  @IsString() @IsNotEmpty() cargo!: string;
  @IsOptional() @IsString() cpf?: string;
}

@Controller('administracao')
export class AdministracaoController {
  constructor(
    private readonly usuarios: UsuariosUseCase,
    private readonly configuracao: ConfiguracaoUseCase,
  ) {}

  @RequerCapacidade('GERIR_USUARIOS')
  @Get('usuarios')
  listarUsuarios() {
    return this.usuarios.listar();
  }

  @RequerCapacidade('GERIR_USUARIOS')
  @Post('usuarios')
  criarUsuario(@Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar(dto);
  }

  @RequerCapacidade('GERIR_USUARIOS')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('usuarios/:usuarioId/status')
  definirStatus(
    @Param('usuarioId') usuarioId: string,
    @Body() dto: StatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usuarios.definirStatus(usuarioId, dto.status, user.userId);
  }

  @RequerCapacidade('GERIR_USUARIOS')
  @HttpCode(HttpStatus.OK)
  @Post('usuarios/:usuarioId/senha')
  redefinirSenha(@Param('usuarioId') usuarioId: string) {
    return this.usuarios.redefinirSenha(usuarioId);
  }

  @RequerCapacidade('GERIR_CAPACIDADES')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('usuarios/:usuarioId/capacidades')
  definirCapacidade(
    @Param('usuarioId') usuarioId: string,
    @Body() dto: CapacidadeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usuarios.definirCapacidade({ usuarioId, ...dto, atorId: user.userId });
  }

  @RequerCapacidade('GERIR_CAPACIDADES')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('usuarios/:usuarioId/capacidades/:capacidade')
  limparCapacidade(
    @Param('usuarioId') usuarioId: string,
    @Param('capacidade') capacidade: Capacidade,
  ) {
    return this.usuarios.limparCapacidade(usuarioId, capacidade);
  }

  // Quem cadastra família também lê: o enquadramento por faixa de renda é calculado sobre o
  // salário mínimo do município, e o balcão precisa do número para conferir na hora.
  @RequerCapacidade('GERIR_PARAMETROS', 'ACESSAR_HABITACAO')
  @Get('parametros')
  parametros() {
    return this.configuracao.parametros();
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('parametros/salario-minimo')
  definirSalarioMinimo(@Body() dto: SalarioMinimoDto) {
    return this.configuracao.definirSalarioMinimo(dto.salarioMinimo);
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @Get('signatarios')
  listarSignatarios() {
    return this.configuracao.listarSignatarios();
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @Post('signatarios')
  criarSignatario(@Body() dto: SignatarioDto) {
    return this.configuracao.criarSignatario(dto);
  }

  @RequerCapacidade('GERIR_PARAMETROS')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('signatarios/:signatarioId')
  desativarSignatario(@Param('signatarioId') signatarioId: string) {
    return this.configuracao.desativarSignatario(signatarioId);
  }
}
