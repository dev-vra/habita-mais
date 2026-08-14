import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfilTenant } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from './jwt.strategy';
import { PERFIS_KEY } from './perfis.decorator';

/** Exige que o usuário tenha um dos perfis declarados em @Perfis(). */
@Injectable()
export class PerfilGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<PerfilTenant[]>(PERFIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const perfil = req.user?.perfil;

    if (!perfil || !requeridos.includes(perfil as PerfilTenant)) {
      throw new ForbiddenException('Perfil sem permissão para esta operação.');
    }
    return true;
  }
}
