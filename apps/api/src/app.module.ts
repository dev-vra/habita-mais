import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CapacidadeGuard } from './auth/capacidade.guard';
import { EsferaGuard } from './auth/esfera.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import type { AuthUser } from './auth/jwt.strategy';
import { PerfilGuard } from './auth/perfil.guard';
import { TenantContextInterceptor } from './context/tenant-context.interceptor';
import { FilaModule } from './fila/fila.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';

// Módulo raiz. Auth, RLS e auditoria são a fundação; cada domínio entra como feature module.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // Log estruturado com requestId/tenantId/userId. Nunca o header de autorização — teria o JWT
    // em texto puro. tenantId/userId só existem depois do guard, e customProps roda no fim.
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
        genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string) || randomUUID(),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          censor: '[REDACTED]',
        },
        customProps: (req: IncomingMessage) => {
          const user = (req as Request & { user?: AuthUser }).user;
          return { tenantId: user?.tenantId ?? null, userId: user?.userId ?? null };
        },
        autoLogging: { ignore: (req: IncomingMessage) => req.url?.includes('/health') ?? false },
      },
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    FilaModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: EsferaGuard },
    { provide: APP_GUARD, useClass: PerfilGuard },
    { provide: APP_GUARD, useClass: CapacidadeGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
