import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ESFERAS_KEY } from './esfera.decorator';
import type { AuthUser, Esfera } from './jwt.strategy';

const ESFERAS_PADRAO: readonly Esfera[] = ['PLATAFORMA', 'TENANT'];

/**
 * Isola a esfera do munícipe da esfera do servidor. Um token da central não abre rota de gestão
 * mesmo que a URL seja adivinhada — e o padrão fechado garante que uma rota nova nasça inacessível
 * ao munícipe até alguém declarar o contrário.
 */
@Injectable()
export class EsferaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) return true;

    const permitidas =
      this.reflector.getAllAndOverride<Esfera[]>(ESFERAS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? ESFERAS_PADRAO;

    if (!permitidas.includes(user.esfera)) {
      throw new ForbiddenException('Esfera sem acesso a esta operação.');
    }
    return true;
  }
}
