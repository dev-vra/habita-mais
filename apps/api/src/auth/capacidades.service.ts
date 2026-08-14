import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { habitacao } from '@habita/shared';
import type { Capacidade, PerfilTenant } from '@habita/shared/habitacao';

/**
 * Resolve as capacidades efetivas de um usuário: matriz do perfil (sem as sensíveis) somada às
 * concessões explícitas da prefeitura, menos as revogações. A regra vive em @habita/shared para
 * que API e interface nunca discordem sobre quem pode o quê.
 */
@Injectable()
export class CapacidadesService {
  async resolver(
    tx: Prisma.TransactionClient,
    usuarioId: string,
    perfil: PerfilTenant,
  ): Promise<Capacidade[]> {
    const registros = await tx.usuarioCapacidade.findMany({ where: { usuarioId } });

    const concedidas = registros
      .filter((registro) => registro.concedida)
      .map((registro) => registro.capacidade as Capacidade);
    const revogadas = registros
      .filter((registro) => !registro.concedida)
      .map((registro) => registro.capacidade as Capacidade);

    return [...habitacao.resolverCapacidades(perfil, { concedidas, revogadas })];
  }

  /**
   * Reconfirma no banco, dentro da transação do caso de uso, antes de executar uma ação sensível
   * (spec §5). O guard já barrou pelo token; isto fecha a janela entre a revogação da capacidade
   * e a expiração do access token que ainda a carrega.
   */
  async confirmar(
    tx: Prisma.TransactionClient,
    usuarioId: string,
    perfil: PerfilTenant,
    capacidade: Capacidade,
  ): Promise<void> {
    const efetivas = await this.resolver(tx, usuarioId, perfil);
    if (!efetivas.includes(capacidade)) {
      throw new ForbiddenException(`Capacidade ${capacidade} não concedida a este usuário.`);
    }
  }
}
