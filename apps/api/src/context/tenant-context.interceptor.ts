import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, from, lastValueFrom } from 'rxjs';
import type { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { TRANSACAO_LONGA } from './transacao-longa.decorator';

/**
 * Abre a transação com contexto (SET LOCAL) a cada requisição autenticada, fixando o escopo da
 * RLS. Rota pública segue sem contexto — e, sem contexto, nenhuma policy libera nada.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) {
      return next.handle();
    }

    return from(
      this.prisma.runWithContext(
        {
          tenantId: user.tenantId ?? undefined,
          userId: user.userId,
          userNome: user.nome,
          perfil: user.perfil,
          capacidades: user.capacidades,
          isPlatform: user.esfera === 'PLATAFORMA',
          familiaId: user.esfera === 'MUNICIPE' ? user.familiaId : undefined,
          setorId: user.setorId,
          setorRestrito: user.setorRestrito,
          ip: req.ip,
        },
        () => lastValueFrom(next.handle()),
        this.reflector.getAllAndOverride<number | undefined>(TRANSACAO_LONGA, [
          context.getHandler(),
          context.getClass(),
        ])
          ? { timeoutMs: this.reflector.getAllAndOverride<number>(TRANSACAO_LONGA, [
              context.getHandler(),
              context.getClass(),
            ]) }
          : undefined,
      ),
    );
  }
}
