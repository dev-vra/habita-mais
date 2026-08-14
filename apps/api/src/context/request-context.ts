import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '@prisma/client';
import type { Capacidade, PerfilTenant } from '@habita/shared/habitacao';

/**
 * Contexto da requisição corrente. Três esferas, e a diferença entre elas é o que a RLS enxerga:
 *  • PLATAFORMA — cria e configura prefeitura; não opera dado de família.
 *  • TENANT — servidor do município, escopado ao próprio tenant.
 *  • MUNICIPE — a família na central, escopada à própria inscrição (nunca a de terceiro).
 */
export interface RequestContext {
  tenantId?: string;
  userId?: string;
  userNome?: string;
  perfil?: PerfilTenant;
  capacidades?: readonly Capacidade[];
  isPlatform: boolean;
  /** Esfera MUNÍCIPE: id da família do contexto. Presente = RLS escopada a ela. */
  familiaId?: string;
  /** Setor do servidor. Com `setorRestrito`, vira o único escopo que a RLS enxerga. */
  setorId?: string;
  /**
   * Servidor de setor externo (Defesa Civil, Jurídico, Obras). Entra com o mesmo default-deny do
   * munícipe: sem tenant no GUC, alcança apenas os encaminhamentos do próprio setor.
   */
  setorRestrito?: boolean;
  ip?: string;
}

/** Contexto + cliente transacional ativo — a mesma conexão onde o SET LOCAL foi aplicado. */
export interface ActiveContext extends RequestContext {
  tx: Prisma.TransactionClient;
}

export const requestContextStorage = new AsyncLocalStorage<ActiveContext>();

/** Contexto ativo, ou erro. Use em repositórios e casos de uso que exigem contexto. */
export function getActiveContext(): ActiveContext {
  const ctx = requestContextStorage.getStore();
  if (!ctx) {
    throw new Error('Sem contexto de requisição ativo (esqueceu runWithContext?).');
  }
  return ctx;
}

/** Autor do carimbo de auditoria. Nunca vem do cliente. */
export function actorId(): string {
  return requestContextStorage.getStore()?.userId ?? 'system';
}
