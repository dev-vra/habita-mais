import { Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Salário mínimo de referência quando a prefeitura ainda não parametrizou o seu. */
const SALARIO_MINIMO_PADRAO = 1518;

/**
 * Conferência automática da ficha. Determinística de ponta a ponta: nenhuma chamada a modelo, e o
 * mesmo resultado hoje e daqui a dois anos, com os mesmos dados.
 */
@Injectable()
export class ConferenciaQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async daFamilia(familiaId: string) {
    const familia = await this.prisma.tx.familia.findUnique({
      where: { id: familiaId },
      select: {
        id: true,
        codigo: true,
        responsavel: { select: { nome: true, sexo: true } },
        membros: {
          // Membro que saiu do núcleo não conta na composição de hoje.
          where: { saiuEm: null },
          select: {
            parentesco: true,
            pessoa: { select: { nascimento: true, deficiencia: true } },
          },
        },
        fichas: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            rendaFamiliar: true,
            rendaPerCapita: true,
            quantidadePessoas: true,
            beneficios: true,
            inscritoCadUnico: true,
            nis: true,
            nisVerificado: true,
            temIdoso: true,
            temPessoaComDeficiencia: true,
            quantidadeMenores: true,
            mulherChefeFamilia: true,
            situacaoRisco: true,
            laudoRiscoKey: true,
            possuiOutroImovel: true,
          },
        },
      },
    });

    if (!familia) throw new NotFoundException('Família não encontrada.');

    const ficha = familia.fichas[0];
    if (!ficha) {
      return {
        familiaId: familia.id,
        temFicha: false,
        inconsistencias: [],
        resumo: { total: 0, altas: 0, afetamPontuacao: 0 },
      };
    }

    const salarioMinimo = await this.salarioMinimo();

    const inconsistencias = habitacao.conferirFicha(
      {
        rendaFamiliar: Number(ficha.rendaFamiliar),
        rendaPerCapita: Number(ficha.rendaPerCapita),
        quantidadePessoas: ficha.quantidadePessoas,
        beneficios: ficha.beneficios,
        inscritoCadUnico: ficha.inscritoCadUnico,
        nis: ficha.nis,
        nisVerificado: ficha.nisVerificado,
        temIdoso: ficha.temIdoso,
        temPessoaComDeficiencia: ficha.temPessoaComDeficiencia,
        quantidadeMenores: ficha.quantidadeMenores,
        mulherChefeFamilia: ficha.mulherChefeFamilia,
        situacaoRisco: ficha.situacaoRisco,
        temLaudoRisco: Boolean(ficha.laudoRiscoKey),
        possuiOutroImovel: ficha.possuiOutroImovel,
        responsavelSexo: familia.responsavel.sexo,
        membros: familia.membros.map((membro) => ({
          parentesco: membro.parentesco,
          nascimento: membro.pessoa.nascimento?.toISOString() ?? null,
          temDeficiencia: membro.pessoa.deficiencia,
        })),
        salarioMinimo,
      },
      new Date(),
    );

    return {
      familiaId: familia.id,
      codigo: familia.codigo,
      fichaId: ficha.id,
      temFicha: true,
      inconsistencias,
      resumo: habitacao.resumirInconsistencias(inconsistencias),
    };
  }

  private async salarioMinimo(): Promise<number> {
    const tenant = await this.prisma.tx.tenant.findFirst({ select: { parametros: true } });
    const parametros = (tenant?.parametros ?? {}) as { salarioMinimo?: number };
    return parametros.salarioMinimo ?? SALARIO_MINIMO_PADRAO;
  }
}
