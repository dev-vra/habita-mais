import { Injectable, NotFoundException } from '@nestjs/common';
import type { DefinicaoCriterio } from '@habita/shared/habitacao';
import { PrismaService } from '../../prisma/prisma.service';

export interface VersaoDetalhe {
  id: string;
  versao: number;
  situacao: string;
  publicadoEm: string | null;
  totalPontos: number;
  criterios: DefinicaoCriterio[];
}

export interface ProgramaDetalhe {
  id: string;
  nome: string;
  slug: string;
  fonteRecurso: string;
  vagas: number;
  situacao: string;
  inscricaoInicio: string;
  inscricaoFim: string;
  inscricoes: number;
  versoes: VersaoDetalhe[];
}

@Injectable()
export class ProgramasQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<Omit<ProgramaDetalhe, 'versoes'>[]> {
    const programas = await this.prisma.tx.programaHabitacional.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        slug: true,
        fonteRecurso: true,
        vagas: true,
        situacao: true,
        inscricaoInicio: true,
        inscricaoFim: true,
        _count: { select: { inscricoes: true } },
      },
    });

    return programas.map((programa) => ({
      ...programa,
      inscricaoInicio: programa.inscricaoInicio.toISOString(),
      inscricaoFim: programa.inscricaoFim.toISOString(),
      inscricoes: programa._count.inscricoes,
    }));
  }

  async detalhe(idOuSlug: string): Promise<ProgramaDetalhe> {
    const programa = await this.prisma.tx.programaHabitacional.findFirst({
      where: { OR: [{ id: idOuSlug }, { slug: idOuSlug }], deletedAt: null },
      select: {
        id: true,
        nome: true,
        slug: true,
        fonteRecurso: true,
        vagas: true,
        situacao: true,
        inscricaoInicio: true,
        inscricaoFim: true,
        _count: { select: { inscricoes: true } },
        versoes: {
          orderBy: { versao: 'desc' },
          select: {
            id: true,
            versao: true,
            situacao: true,
            publicadoEm: true,
            definicoes: true,
          },
        },
      },
    });
    if (!programa) throw new NotFoundException('Programa não encontrado.');

    return {
      id: programa.id,
      nome: programa.nome,
      slug: programa.slug,
      fonteRecurso: programa.fonteRecurso,
      vagas: programa.vagas,
      situacao: programa.situacao,
      inscricaoInicio: programa.inscricaoInicio.toISOString(),
      inscricaoFim: programa.inscricaoFim.toISOString(),
      inscricoes: programa._count.inscricoes,
      versoes: programa.versoes.map((versao) => {
        const criterios = versao.definicoes as unknown as DefinicaoCriterio[];
        return {
          id: versao.id,
          versao: versao.versao,
          situacao: versao.situacao,
          publicadoEm: versao.publicadoEm?.toISOString() ?? null,
          totalPontos: criterios.reduce((soma, criterio) => soma + criterio.peso, 0),
          criterios,
        };
      }),
    };
  }

  /**
   * Salário mínimo parametrizado por prefeitura — alimenta as faixas de renda do modelo de
   * critérios. A RLS já escopa a consulta ao tenant do contexto, então `findFirst` basta.
   */
  async salarioMinimo(): Promise<number | null> {
    const tenant = await this.prisma.tx.tenant.findFirst({ select: { parametros: true } });
    const parametros = (tenant?.parametros ?? {}) as { salarioMinimo?: number };
    return parametros.salarioMinimo ?? null;
  }
}
