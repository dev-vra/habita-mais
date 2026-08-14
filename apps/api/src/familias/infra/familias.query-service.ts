import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditOperation } from '@prisma/client';
import { br, habitacao } from '@habita/shared';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const TAMANHO_PAGINA = 25;

export interface ItemListaFamilias {
  id: string;
  codigo: string;
  responsavel: string;
  cpfMascarado: string;
  pessoas: number;
  rendaPerCapita: number | null;
  fichaValidaAte: string | null;
  inscricoes: number;
}

export interface EventoLinhaDoTempo {
  quando: string;
  titulo: string;
  detalhe: string;
}

export interface Familia360 {
  id: string;
  codigo: string;
  responsavel: { nome: string; cpfMascarado: string; nis: string | null };
  ficha: {
    id: string;
    rendaFamiliar: number;
    rendaPerCapita: number;
    quantidadePessoas: number;
    quantidadeMenores: number;
    mulherChefeFamilia: boolean;
    temPessoaComDeficiencia: boolean;
    temIdoso: boolean;
    situacaoRisco: boolean;
    temLaudoRisco: boolean;
    moradiaInadequada: boolean;
    tipoMoradia: string;
    saneamento: string;
    mesesResidenciaMunicipio: number;
    apuradaEm: string;
    validaAte: string;
    vencida: boolean;
    origem: string;
  } | null;
  membros: { id: string; nome: string; parentesco: string; contribuiRenda: boolean }[];
  inscricoes: {
    id: string;
    protocolo: string;
    programa: string;
    programaSlug: string;
    situacao: string;
    pontuacao: number | null;
    itensPontuacao: { rotulo: string; pontos: number; peso: number; observacao?: string }[];
  }[];
  linhaDoTempo: EventoLinhaDoTempo[];
  diagnostico: habitacao.ItemDiagnostico[];
}

/**
 * Consultas de família, incluindo a visão 360° — a tela que impede benefício duplicado por falta
 * de visão cruzada (spec §4).
 *
 * Abrir a ficha de uma família é ato administrativo com dado sensível, então a leitura entra na
 * trilha. CPF sai mascarado em lista: a tela de busca não precisa do número inteiro.
 */
@Injectable()
export class FamiliasQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listar(busca?: string, pagina = 1): Promise<{ itens: ItemListaFamilias[]; total: number }> {
    const termo = busca?.trim() ?? '';
    const digitos = br.onlyDigits(termo);

    const where = termo
      ? {
          deletedAt: null,
          OR: [
            { codigo: { contains: termo, mode: 'insensitive' as const } },
            { responsavel: { nome: { contains: termo, mode: 'insensitive' as const } } },
            ...(digitos.length >= 3 ? [{ responsavel: { cpf: { contains: digitos } } }] : []),
          ],
        }
      : { deletedAt: null };

    const [total, familias] = await Promise.all([
      this.prisma.tx.familia.count({ where }),
      this.prisma.tx.familia.findMany({
        where,
        orderBy: { codigo: 'asc' },
        skip: (pagina - 1) * TAMANHO_PAGINA,
        take: TAMANHO_PAGINA,
        select: {
          id: true,
          codigo: true,
          responsavel: { select: { nome: true, cpf: true } },
          fichas: {
            where: { vigente: true },
            take: 1,
            select: { rendaPerCapita: true, quantidadePessoas: true, validaAte: true },
          },
          _count: { select: { inscricoes: true } },
        },
      }),
    ]);

    const itens = familias.map((familia) => {
      const ficha = familia.fichas[0];
      return {
        id: familia.id,
        codigo: familia.codigo,
        responsavel: familia.responsavel.nome,
        cpfMascarado: br.mascararCpfParcial(familia.responsavel.cpf),
        pessoas: ficha?.quantidadePessoas ?? 0,
        rendaPerCapita: ficha ? Number(ficha.rendaPerCapita) : null,
        fichaValidaAte: ficha?.validaAte.toISOString() ?? null,
        inscricoes: familia._count.inscricoes,
      };
    });

    return { itens, total };
  }

  async visao360(familiaId: string): Promise<Familia360> {
    const familia = await this.prisma.tx.familia.findFirst({
      where: { id: familiaId, deletedAt: null },
      select: {
        id: true,
        codigo: true,
        responsavel: {
          select: {
            nome: true,
            cpf: true,
            nis: true,
            logradouro: true,
            numero: true,
            bairro: true,
            municipio: true,
          },
        },
        fichas: { where: { vigente: true }, take: 1 },
        membros: {
          where: { saiuEm: null },
          select: {
            id: true,
            parentesco: true,
            contribuiRenda: true,
            pessoa: { select: { nome: true } },
          },
        },
        visitas: { orderBy: { visitadaEm: 'desc' }, take: 5 },
        inscricoes: {
          where: { deletedAt: null },
          select: {
            id: true,
            protocolo: true,
            situacao: true,
            inscritaEm: true,
            programa: { select: { nome: true, slug: true } },
            snapshots: {
              where: { vigente: true },
              take: 1,
              select: { total: true, itens: true, calculadoEm: true },
            },
            pendencias: { where: { situacao: { in: ['ABERTA', 'VENCIDA'] } }, select: { id: true } },
            recursos: { select: { protocolo: true, apresentadoEm: true, decisao: true } },
            convocacoes: { select: { numeroOficio: true, emitidaEm: true, foraDeOrdem: true } },
          },
        },
      },
    });
    if (!familia) throw new NotFoundException('Família não encontrada.');

    await this.audit.log(this.prisma.tx, {
      operation: AuditOperation.READ,
      entity: 'Familia',
      entityId: familiaId,
      diff: { finalidade: 'consulta da visão 360 da família' },
    });

    const ficha = familia.fichas[0];
    const programasAbertos = await this.prisma.tx.programaHabitacional.count({
      where: { situacao: 'INSCRICOES_ABERTAS', deletedAt: null },
    });

    return {
      id: familia.id,
      codigo: familia.codigo,
      responsavel: {
        nome: familia.responsavel.nome,
        cpfMascarado: br.mascararCpfParcial(familia.responsavel.cpf),
        nis: familia.responsavel.nis,
      },
      ficha: ficha
        ? {
            id: ficha.id,
            rendaFamiliar: Number(ficha.rendaFamiliar),
            rendaPerCapita: Number(ficha.rendaPerCapita),
            quantidadePessoas: ficha.quantidadePessoas,
            quantidadeMenores: ficha.quantidadeMenores,
            mulherChefeFamilia: ficha.mulherChefeFamilia,
            temPessoaComDeficiencia: ficha.temPessoaComDeficiencia,
            temIdoso: ficha.temIdoso,
            situacaoRisco: ficha.situacaoRisco,
            temLaudoRisco: Boolean(ficha.laudoRiscoKey),
            moradiaInadequada: ficha.moradiaInadequada,
            tipoMoradia: ficha.tipoMoradia,
            saneamento: ficha.saneamento,
            mesesResidenciaMunicipio: ficha.mesesResidenciaMunicipio,
            apuradaEm: ficha.apuradaEm.toISOString(),
            validaAte: ficha.validaAte.toISOString(),
            vencida: ficha.validaAte < new Date(),
            origem: ficha.origem,
          }
        : null,
      membros: familia.membros.map((membro) => ({
        id: membro.id,
        nome: membro.pessoa.nome,
        parentesco: membro.parentesco,
        contribuiRenda: membro.contribuiRenda,
      })),
      inscricoes: familia.inscricoes.map((inscricao) => ({
        id: inscricao.id,
        protocolo: inscricao.protocolo,
        programa: inscricao.programa.nome,
        programaSlug: inscricao.programa.slug,
        situacao: inscricao.situacao,
        pontuacao: inscricao.snapshots[0] ? Number(inscricao.snapshots[0].total) : null,
        itensPontuacao: (inscricao.snapshots[0]?.itens ?? []) as Familia360['inscricoes'][number]['itensPontuacao'],
      })),
      linhaDoTempo: montarLinhaDoTempo(familia),
      diagnostico: habitacao.diagnosticarCadastro({
        temFichaVigente: Boolean(ficha),
        fichaVencida: ficha ? ficha.validaAte < new Date() : false,
        fichaVenceEmDias: ficha ? diasAte(ficha.validaAte) : null,
        quantidadePessoas: ficha?.quantidadePessoas ?? 0,
        membrosCadastrados: familia.membros.length,
        rendaFamiliar: ficha ? Number(ficha.rendaFamiliar) : 0,
        fonteRendaInformada: Boolean(ficha?.fonteRenda ?? ficha?.fonteRendaPrincipal),
        nisInformado: Boolean(ficha?.nis ?? familia.responsavel.nis),
        nisVerificado: ficha?.nisVerificado ?? false,
        enderecoCompleto: Boolean(
          familia.responsavel.logradouro &&
            familia.responsavel.numero &&
            familia.responsavel.bairro &&
            familia.responsavel.municipio,
        ),
        situacaoRisco: ficha?.situacaoRisco ?? false,
        temLaudoRisco: Boolean(ficha?.laudoRiscoKey),
        vulnerabilidadesMarcadas: ficha?.vulnerabilidades.length ?? 0,
        inscricoes: familia.inscricoes.map((inscricao) => {
          const snapshot = inscricao.snapshots[0];
          return {
            situacao: inscricao.situacao,
            pendenciasAbertas: inscricao.pendencias.length,
            temSnapshot: Boolean(snapshot),
            // A ficha mudou depois do último cálculo: a nota no ar já não reflete os fatos.
            pontuacaoDesatualizada: Boolean(
              snapshot && ficha && snapshot.calculadoEm < ficha.apuradaEm,
            ),
          };
        }),
        programasComInscricaoAberta: programasAbertos,
      }),
    };
  }
}

/** Dias até a data, negativo se já passou. */
function diasAte(data: Date): number {
  const umDia = 24 * 60 * 60 * 1000;
  return Math.ceil((data.getTime() - Date.now()) / umDia);
}

type FamiliaComHistorico = {
  visitas: { visitadaEm: Date; parecer: string }[];
  inscricoes: {
    protocolo: string;
    inscritaEm: Date;
    programa: { nome: string };
    snapshots: { total: unknown; calculadoEm: Date }[];
    recursos: { protocolo: string; apresentadoEm: Date; decisao: string | null }[];
    convocacoes: { numeroOficio: string; emitidaEm: Date; foraDeOrdem: boolean }[];
  }[];
};

/** A mesma história que a família vê na central, do lado de dentro do balcão. */
function montarLinhaDoTempo(familia: FamiliaComHistorico): EventoLinhaDoTempo[] {
  const eventos: EventoLinhaDoTempo[] = [];

  for (const inscricao of familia.inscricoes) {
    eventos.push({
      quando: inscricao.inscritaEm.toISOString(),
      titulo: 'Inscrição registrada',
      detalhe: `${inscricao.programa.nome} · ${inscricao.protocolo}`,
    });

    for (const snapshot of inscricao.snapshots) {
      eventos.push({
        quando: snapshot.calculadoEm.toISOString(),
        titulo: `Pontuação congelada — ${Number(snapshot.total)}`,
        detalhe: inscricao.protocolo,
      });
    }
    for (const convocacao of inscricao.convocacoes) {
      eventos.push({
        quando: convocacao.emitidaEm.toISOString(),
        titulo: convocacao.foraDeOrdem ? 'Convocação fora de ordem' : 'Convocação emitida',
        detalhe: convocacao.numeroOficio,
      });
    }
    for (const recurso of inscricao.recursos) {
      eventos.push({
        quando: recurso.apresentadoEm.toISOString(),
        titulo: recurso.decisao ? `Recurso ${recurso.decisao.toLowerCase()}` : 'Recurso protocolado',
        detalhe: recurso.protocolo,
      });
    }
  }

  for (const visita of familia.visitas) {
    eventos.push({
      quando: visita.visitadaEm.toISOString(),
      titulo: 'Visita domiciliar realizada',
      detalhe: visita.parecer.slice(0, 120),
    });
  }

  return eventos.sort((a, b) => b.quando.localeCompare(a.quando));
}
