import { Injectable } from '@nestjs/common';
import { br } from '@habita/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** Janela do painel: prazo que vence dentro do mês entra na lista; a urgência ordena o resto. */
const DIAS_DE_ANTECEDENCIA = 30;
const LIMITE_POR_TIPO = 20;

export type UrgenciaDecisao = 'vencido' | 'hoje' | 'proximo';

export interface ItemDecisao {
  tipo: string;
  assunto: string;
  familia: string;
  referencia: string;
  prazo: string;
  urgencia: UrgenciaDecisao;
  link: string;
}

/**
 * "Três decisões esperam por você" — a lista que abre o painel do gestor (Identidade §5).
 *
 * O que entra aqui é só o que tem prazo correndo e depende de alguém decidir. Um painel que mostra
 * tudo não é painel; a régua é: se ninguém agir, algo vence e vira problema jurídico.
 */
@Injectable()
export class DecisoesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async pendentes(agora: Date): Promise<ItemDecisao[]> {
    const limite = new Date(agora);
    limite.setDate(limite.getDate() + DIAS_DE_ANTECEDENCIA);

    const [recursos, convocacoes, pendencias, fichas] = await Promise.all([
      this.prisma.tx.recurso.findMany({
        where: { decisao: null, prazoRespostaAte: { lte: limite } },
        orderBy: { prazoRespostaAte: 'asc' },
        take: LIMITE_POR_TIPO,
        select: {
          protocolo: true,
          prazoRespostaAte: true,
          inscricao: {
            select: { id: true, familia: { select: { responsavel: { select: { nome: true } } } } },
          },
        },
      }),
      this.prisma.tx.convocacao.findMany({
        where: { desfecho: null, prazoComparecimentoAte: { lte: limite } },
        orderBy: { prazoComparecimentoAte: 'asc' },
        take: LIMITE_POR_TIPO,
        select: {
          numeroOficio: true,
          prazoComparecimentoAte: true,
          inscricao: {
            select: { id: true, familia: { select: { responsavel: { select: { nome: true } } } } },
          },
        },
      }),
      this.prisma.tx.pendencia.findMany({
        where: { situacao: { in: ['ABERTA', 'VENCIDA'] }, prazoAte: { lte: limite } },
        orderBy: { prazoAte: 'asc' },
        take: LIMITE_POR_TIPO,
        select: {
          tipo: true,
          prazoAte: true,
          inscricao: {
            select: {
              id: true,
              protocolo: true,
              familia: { select: { responsavel: { select: { nome: true } } } },
            },
          },
        },
      }),
      this.prisma.tx.fichaSocial.findMany({
        where: { vigente: true, deletedAt: null, validaAte: { lte: limite } },
        orderBy: { validaAte: 'asc' },
        take: LIMITE_POR_TIPO,
        select: {
          validaAte: true,
          familia: {
            select: { id: true, codigo: true, responsavel: { select: { nome: true } } },
          },
        },
      }),
    ]);

    const itens: ItemDecisao[] = [
      ...recursos.map((recurso) => ({
        tipo: 'Recurso',
        assunto: 'Recurso contra classificação aguardando decisão',
        familia: recurso.inscricao.familia.responsavel.nome,
        referencia: recurso.protocolo,
        prazo: recurso.prazoRespostaAte.toISOString(),
        urgencia: urgencia(recurso.prazoRespostaAte, agora),
        link: `/inscricoes/${recurso.inscricao.id}`,
      })),
      ...convocacoes.map((convocacao) => ({
        tipo: 'Convocação',
        assunto: 'Convocação sem desfecho registrado',
        familia: convocacao.inscricao.familia.responsavel.nome,
        referencia: convocacao.numeroOficio,
        prazo: convocacao.prazoComparecimentoAte.toISOString(),
        urgencia: urgencia(convocacao.prazoComparecimentoAte, agora),
        link: `/inscricoes/${convocacao.inscricao.id}`,
      })),
      ...pendencias.map((pendencia) => ({
        tipo: 'Pendência',
        assunto: pendencia.tipo,
        familia: pendencia.inscricao.familia.responsavel.nome,
        referencia: pendencia.inscricao.protocolo,
        prazo: pendencia.prazoAte.toISOString(),
        urgencia: urgencia(pendencia.prazoAte, agora),
        link: `/inscricoes/${pendencia.inscricao.id}`,
      })),
      ...fichas.map((ficha) => ({
        tipo: 'Recadastramento',
        assunto: 'Ficha social vencendo — revalidar para manter na fila',
        familia: ficha.familia.responsavel.nome,
        referencia: ficha.familia.codigo,
        prazo: ficha.validaAte.toISOString(),
        urgencia: urgencia(ficha.validaAte, agora),
        link: `/familias/${ficha.familia.id}`,
      })),
    ];

    return itens.sort((a, b) => a.prazo.localeCompare(b.prazo));
  }

  /** Busca do topo: CPF, nome ou protocolo — os três jeitos de alguém chegar no balcão. */
  async buscar(termo: string) {
    const texto = termo.trim();
    if (texto.length < 3) return { familias: [], inscricoes: [] };

    const digitos = br.onlyDigits(texto);

    const [familias, inscricoes] = await Promise.all([
      this.prisma.tx.familia.findMany({
        where: {
          deletedAt: null,
          OR: [
            { codigo: { contains: texto, mode: 'insensitive' } },
            { responsavel: { nome: { contains: texto, mode: 'insensitive' } } },
            ...(digitos.length >= 3 ? [{ responsavel: { cpf: { contains: digitos } } }] : []),
          ],
        },
        take: 8,
        select: { id: true, codigo: true, responsavel: { select: { nome: true, cpf: true } } },
      }),
      this.prisma.tx.inscricaoFila.findMany({
        where: { deletedAt: null, protocolo: { contains: texto.toUpperCase() } },
        take: 8,
        select: {
          id: true,
          protocolo: true,
          situacao: true,
          familia: { select: { responsavel: { select: { nome: true } } } },
        },
      }),
    ]);

    return {
      familias: familias.map((familia) => ({
        id: familia.id,
        codigo: familia.codigo,
        nome: familia.responsavel.nome,
        cpfMascarado: br.mascararCpfParcial(familia.responsavel.cpf),
      })),
      inscricoes: inscricoes.map((inscricao) => ({
        id: inscricao.id,
        protocolo: inscricao.protocolo,
        situacao: inscricao.situacao,
        nome: inscricao.familia.responsavel.nome,
      })),
    };
  }
}

function urgencia(prazo: Date, agora: Date): UrgenciaDecisao {
  const dia = 24 * 60 * 60 * 1000;
  const diferenca = Math.floor((prazo.getTime() - agora.getTime()) / dia);

  if (diferenca < 0) return 'vencido';
  return diferenca === 0 ? 'hoje' : 'proximo';
}
