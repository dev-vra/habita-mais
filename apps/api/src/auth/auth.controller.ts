import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AcessoMunicipeDto, LoginDto, RefreshDto, TrocarSenhaDto } from './dto/auth.dto';
import type { AuthUser } from './jwt.strategy';
import { Public } from './public.decorator';

/** Teto apertado nas rotas de credencial — o global de 120/min é largo demais para login. */
const LIMITE_TENTATIVAS = { default: { limit: 10, ttl: 60_000 } };

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
  @Throttle(LIMITE_TENTATIVAS)
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
