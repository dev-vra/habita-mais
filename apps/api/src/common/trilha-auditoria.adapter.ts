import { Injectable } from '@nestjs/common';
import { AuditOperation } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { ValorJson } from '../audit/mascarar-diff';
import { PrismaService } from '../prisma/prisma.service';
import type { TrilhaAuditoria } from './ports';

/**
 * Liga o port do domínio à trilha de verdade. Grava na transação do request, então o registro cai
 * junto com a operação se algo falhar — trilha que sobrevive a um rollback é trilha mentindo.
 */
@Injectable()
export class TrilhaAuditoriaAdapter implements TrilhaAuditoria {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async registrar(evento: {
    operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'READ';
    entidade: string;
    entidadeId: string;
    diff?: Record<string, unknown>;
  }): Promise<void> {
    await this.audit.log(this.prisma.tx, {
      operation: evento.operacao as AuditOperation,
      entity: evento.entidade,
      entityId: evento.entidadeId,
      diff: evento.diff as ValorJson | undefined,
    });
  }
}
