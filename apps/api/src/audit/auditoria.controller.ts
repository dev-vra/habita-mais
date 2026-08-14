import { Controller, Get, Injectable, Query } from '@nestjs/common';
import { AuditOperation, type Prisma } from '@prisma/client';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { PrismaService } from '../prisma/prisma.service';

const TAMANHO_PAGINA = 50;

export interface FiltroTrilha {
  entidade?: string;
  entidadeId?: string;
  ator?: string;
  operacao?: string;
  de?: string;
  ate?: string;
  pagina?: string;
}

@Injectable()
export class AuditoriaQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consulta da trilha. O diff já está mascarado no banco — a máscara é aplicada na escrita, não
   * na leitura, para que nem um dump da tabela devolva CPF ou renda em claro.
   *
   * A trilha é escopada pela RLS ao tenant; o perfil auditor lê tudo do município e não escreve
   * nada, o que é a razão de ele existir desde a primeira versão (spec §8).
   */
  async consultar(filtro: FiltroTrilha) {
    const pagina = Math.max(1, Number(filtro.pagina ?? 1));

    const where: Prisma.AuditLogWhereInput = {
      ...(filtro.entidade ? { entity: filtro.entidade } : {}),
      ...(filtro.entidadeId ? { entityId: filtro.entidadeId } : {}),
      ...(filtro.ator ? { actorId: filtro.ator } : {}),
      ...(filtro.operacao ? { operation: filtro.operacao as AuditOperation } : {}),
      ...(filtro.de || filtro.ate
        ? {
            createdAt: {
              ...(filtro.de ? { gte: new Date(filtro.de) } : {}),
              ...(filtro.ate ? { lte: new Date(`${filtro.ate}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [total, eventos, entidades] = await Promise.all([
      this.prisma.tx.auditLog.count({ where }),
      this.prisma.tx.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * TAMANHO_PAGINA,
        take: TAMANHO_PAGINA,
      }),
      this.prisma.tx.auditLog.groupBy({ by: ['entity'], _count: true, orderBy: { entity: 'asc' } }),
    ]);

    const atores = await this.nomesDosAtores(eventos.map((evento) => evento.actorId));

    return {
      total,
      pagina,
      paginas: Math.ceil(total / TAMANHO_PAGINA),
      entidades: entidades.map((linha) => ({ entidade: linha.entity, eventos: linha._count })),
      eventos: eventos.map((evento) => ({
        id: evento.id,
        quando: evento.createdAt.toISOString(),
        operacao: evento.operation,
        entidade: evento.entity,
        entidadeId: evento.entityId,
        ator: evento.actorId ? (atores.get(evento.actorId) ?? evento.actorId) : 'sistema',
        tipoAtor: evento.actorType,
        ip: evento.ip,
        diff: evento.diff,
      })),
    };
  }

  /** Nome de quem agiu — o id sozinho não serve para prestar contas a ninguém. */
  private async nomesDosAtores(ids: (string | null)[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (unicos.length === 0) return new Map();

    const usuarios = await this.prisma.tx.usuario.findMany({
      where: { id: { in: unicos } },
      select: { id: true, nome: true },
    });
    return new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));
  }
}

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly consulta: AuditoriaQueryService) {}

  @RequerCapacidade('LER_AUDITORIA')
  @Get()
  listar(@Query() filtro: FiltroTrilha) {
    return this.consulta.consultar(filtro);
  }
}
