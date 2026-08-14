import { Injectable } from '@nestjs/common';
import { ActorType, AuditOperation, Prisma } from '@prisma/client';
import { requestContextStorage } from '../context/request-context';
import { mascararDiffGenerico, type ValorJson } from './mascarar-diff';

export interface RegistroAuditoria {
  operation: AuditOperation;
  entity: string;
  entityId?: string;
  diff?: ValorJson;
}

/**
 * Trilha append-only. Grava na MESMA transação do caso de uso: se a operação falha, o log não
 * fica órfão; se o log falha, a operação não passa. É o que torna a trilha prova, e não relatório.
 */
@Injectable()
export class AuditService {
  async log(tx: Prisma.TransactionClient, params: RegistroAuditoria): Promise<void> {
    const ctx = requestContextStorage.getStore();

    await tx.auditLog.create({
      data: {
        tenantId: ctx?.tenantId ?? null,
        actorType: this.tipoDeAtor(),
        actorId: ctx?.userId ?? null,
        operation: params.operation,
        entity: params.entity,
        entityId: params.entityId ?? null,
        diff:
          params.diff === undefined
            ? undefined
            : (mascararDiffGenerico(params.diff) as Prisma.InputJsonValue),
        ip: ctx?.ip ?? null,
      },
    });
  }

  /**
   * Leitura auditada. Existe porque em Habitação consultar já é ato administrativo: abrir a ficha
   * social de uma família, ou perguntar ao Regulariza+ se ela tem processo, precisa deixar rastro.
   */
  async logLeitura(
    tx: Prisma.TransactionClient,
    entity: string,
    entityId: string,
    finalidade: string,
  ): Promise<void> {
    await this.log(tx, {
      operation: AuditOperation.READ,
      entity,
      entityId,
      diff: { finalidade },
    });
  }

  private tipoDeAtor(): ActorType {
    const ctx = requestContextStorage.getStore();
    if (ctx?.familiaId) return ActorType.MUNICIPE;
    if (ctx?.isPlatform) return ActorType.PLATFORM;
    if (ctx?.userId) return ActorType.TENANT;
    return ActorType.SYSTEM;
  }
}
