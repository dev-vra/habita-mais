import type { Prisma, SerieProtocolo } from '@prisma/client';
import { habitacao } from '@habita/shared';

/**
 * Próximo protocolo público da série, por tenant e ano.
 *
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` é uma operação só: dois atendimentos
 * simultâneos no balcão não podem ler o mesmo máximo e emitir o mesmo número — protocolo repetido
 * é o tipo de defeito que só aparece na auditoria, meses depois.
 */
export async function proximoProtocolo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  serie: SerieProtocolo,
  ano: number,
): Promise<string> {
  const linhas = await tx.$queryRaw<{ ultimo: number }[]>`
    INSERT INTO "contador_protocolo" ("id", "tenantId", "serie", "ano", "ultimo", "updatedAt")
    VALUES (gen_random_uuid()::text, ${tenantId}, ${serie}::"SerieProtocolo", ${ano}, 1, now())
    ON CONFLICT ("tenantId", "serie", "ano")
    DO UPDATE SET "ultimo" = "contador_protocolo"."ultimo" + 1, "updatedAt" = now()
    RETURNING "ultimo"
  `;

  const linha = linhas[0];
  if (!linha) {
    throw new Error(`Falha ao gerar protocolo da série ${serie} para o tenant ${tenantId}.`);
  }

  return habitacao.formatarProtocolo({ serie, ano, sequencial: linha.ultimo });
}
