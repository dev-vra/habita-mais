import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AcessoMunicipeDto, LoginDto, RefreshDto, TrocarSenhaDto } from './dto/auth.dto';
import type { AuthUser } from './jwt.strategy';
import { Public } from './public.decorator';

/**
 * Teto de tentativas de credencial. Apertado no login, onde brute force importa — e onde o
 * lockout por conta já é a defesa principal.
 */
const LIMITE_TENTATIVAS = { default: { limit: 20, ttl: 60_000 } };

/**
 * Renovação de sessão é outra história: acontece a cada 15 minutos por usuário ativo, e numa
 * prefeitura todo mundo sai pelo mesmo IP. Com teto baixo, um município inteiro se desloga sozinho
 * no meio do expediente — foi o que aconteceu em teste, com 10/min.
 *
 * O refresh não é adivinhável (id + segredo de 32 bytes) e tem rotação: quem apresenta um token
 * revogado leva 401 na primeira tentativa. O limite aqui é contra abuso grosseiro, não contra
 * adivinhação.
 */
const LIMITE_RENOVACAO = { default: { limit: 120, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(LIMITE_TENTATIVAS)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.senha);
  }

  @Public()
  @Throttle(LIMITE_TENTATIVAS)
  @HttpCode(HttpStatus.OK)
  @Post('municipe')
  async acessoMunicipe(@Body() dto: AcessoMunicipeDto) {
    const accessToken = await this.auth.acessoMunicipe(dto.tenantId, dto.protocolo, dto.cpf);
    return { accessToken };
  }

  @Public()
  @Throttle(LIMITE_RENOVACAO)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @HttpCode(HttpStatus.OK)
  @Post('trocar-senha')
  trocarSenha(@CurrentUser() user: AuthUser, @Body() dto: TrocarSenhaDto) {
    return this.auth.trocarSenha(user.userId, dto.senhaAtual, dto.novaSenha);
  }
}
