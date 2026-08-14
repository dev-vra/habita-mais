import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ActiveContext,
  RequestContext,
  getActiveContext,
  requestContextStorage,
} from '../context/request-context';

/**
 * Prisma 7 com driver adapter. Toda operação de domínio passa por runWithContext: abre transação,
 * aplica SET LOCAL dos GUCs que a RLS lê, e publica o cliente transacional no AsyncLocalStorage.
 *
 * A conexão usa RUNTIME_DATABASE_URL — o papel `habita_app`, sem superuser e sem BYPASSRLS. É a
 * diferença entre RLS real e RLS decorativa: o owner do banco ignora policy, então usar a URL de
 * migração em runtime desligaria silenciosamente todo o isolamento. Sem fallback de propósito;
 * a ausência da variável derruba o boot (ver env.ts).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.RUNTIME_DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Executa `work` dentro de uma transação com o contexto aplicado via SET LOCAL.
   * `timeoutMs` sobe o teto padrão do Prisma (5s) para operações com muitas escritas em série —
   * recálculo de pontuação em lote de um programa com milhares de inscrições, por exemplo.
   */
  async runWithContext<T>(
    ctx: RequestContext,
    work: (tx: ActiveContext) => Promise<T>,
    opcoes?: { timeoutMs?: number },
  ): Promise<T> {
    return this.$transaction(
      async (tx) => {
        // Esfera MUNÍCIPE: o GUC de tenant fica VAZIO (as policies de tenant negam tudo) e a
        // leitura é liberada só pela família do contexto. O tenantId continua no AsyncLocalStorage
        // para a auditoria saber de que prefeitura foi o acesso.
        // Munícipe e setor externo compartilham o mesmo mecanismo: sem tenant no GUC, as policies
        // de tenant negam tudo, e só as policies do escopo próprio liberam.
        const escopoProprio = Boolean(ctx.familiaId) || ctx.setorRestrito === true;
        const tenantGuc = escopoProprio ? '' : (ctx.tenantId ?? '');

        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantGuc}, true)`;
        await tx.$executeRaw`SELECT set_config('app.is_platform', ${ctx.isPlatform ? 'true' : 'false'}, true)`;
        await tx.$executeRaw`SELECT set_config('app.current_familia', ${ctx.familiaId ?? ''}, true)`;
        await tx.$executeRaw`SELECT set_config('app.current_setor', ${ctx.setorId ?? ''}, true)`;
        // Necessário para o RETURNING do INSERT na trilha: sob RLS, a linha inserida também
        // precisa passar pela policy de SELECT, e cada ator pode ler o que ele mesmo registrou.
        await tx.$executeRaw`SELECT set_config('app.current_ator', ${ctx.userId ?? ''}, true)`;
        // Tenant do ator, sempre presente — inclusive nas esferas restritas, onde o GUC de tenant
        // fica vazio de propósito. Serve só para amarrar escopos mínimos (ex.: a família numerar
        // o próprio recurso), nunca para liberar leitura de domínio.
        await tx.$executeRaw`SELECT set_config('app.tenant_do_ator', ${ctx.tenantId ?? ''}, true)`;

        const active: ActiveContext = { ...ctx, tx };
        return requestContextStorage.run(active, () => work(active));
      },
      opcoes?.timeoutMs ? { timeout: opcoes.timeoutMs } : undefined,
    );
  }

  /** Cliente transacional do contexto ativo (mesma conexão do SET LOCAL). */
  get tx(): ActiveContext['tx'] {
    return getActiveContext().tx;
  }
}
