import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Capacidade, PerfilTenant } from '@habita/shared/habitacao';

/** Esfera do ator do token. MUNICIPE é a família na central — nunca alcança dado de terceiro. */
export type Esfera = 'PLATAFORMA' | 'TENANT' | 'MUNICIPE';

/**
 * Conteúdo do access token.
 *
 * As capacidades viajam no token porque o guard roda antes do interceptor que abre a transação —
 * sem contexto de tenant, uma consulta ao banco não passaria pela RLS. O access token é curto
 * (15 min), então concessão e revogação valem no próximo refresh. Para as ações sensíveis da
 * §5 isso não basta sozinho: o caso de uso reconfirma a concessão no banco antes de gravar.
 */
export interface JwtPayload {
  sub: string;
  tenantId: string | null;
  esfera: Esfera;
  nome: string;
  perfil?: PerfilTenant;
  capacidades?: Capacidade[];
  trocarSenhaNoLogin?: boolean;
  /** Família dona do token (só esfera MUNICIPE). */
  familiaId?: string;
  setorId?: string;
  setorRestrito?: boolean;
}

/** Usuário autenticado anexado ao request. */
export interface AuthUser {
  userId: string;
  tenantId: string | null;
  esfera: Esfera;
  nome: string;
  perfil?: PerfilTenant;
  capacidades: Capacidade[];
  trocarSenhaNoLogin: boolean;
  familiaId?: string;
  setorId?: string;
  setorRestrito: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      esfera: payload.esfera,
      nome: payload.nome,
      perfil: payload.perfil,
      capacidades: payload.capacidades ?? [],
      trocarSenhaNoLogin: payload.trocarSenhaNoLogin ?? false,
      familiaId: payload.familiaId,
      setorId: payload.setorId,
      setorRestrito: payload.setorRestrito ?? false,
    };
  }
}
