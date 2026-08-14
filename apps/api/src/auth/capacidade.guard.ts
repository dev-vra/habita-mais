import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Capacidade } from '@habita/shared/habitacao';
import { CAPACIDADES_KEY } from './capacidade.decorator';
import type { AuthUser } from './jwt.strategy';

/**
 * Primeira barreira: as capacidades efetivas que vieram no token. A segunda barreira, para as
 * ações sensíveis, é a reconfirmação no banco dentro da transação do caso de uso
 * (CapacidadesService.confirmar) — token curto é rápido, mas não é a última palavra.
 */
@Injectable()
export class CapacidadeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridas = this.reflector.getAllAndOverride<Capacidade[]>(CAPACIDADES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridas || requeridas.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const capacidades = req.user?.capacidades ?? [];

    if (!requeridas.some((requerida) => capacidades.includes(requerida))) {
      throw new ForbiddenException('Perfil sem permissão para esta operação.');
    }
    return true;
  }
}
