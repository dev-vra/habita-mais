import { Injectable, NotFoundException } from '@nestjs/common';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { oficioConvocacaoHtml } from './oficio-convocacao.template';
import { PdfService } from './pdf.service';
import { assinarComprovante } from './validacao';

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3001';

@Injectable()
export class OficioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Gera (ou regenera) o ofício da convocação e guarda a chave no registro.
   *
   * O PDF é arquivado no object storage porque o ofício é o ato: reimprimir precisa devolver
   * exatamente o papel que a família recebeu, e não um documento recomposto com dados de hoje.
   */
  async convocacao(convocacaoId: string): Promise<{ pdf: Buffer; nome: string }> {
    const convocacao = await this.prisma.tx.convocacao.findUnique({
      where: { id: convocacaoId },
      include: {
        inscricao: {
          include: {
            programa: { select: { nome: true } },
            familia: { select: { responsavel: { select: { nome: true } } } },
            snapshots: { where: { vigente: true }, take: 1, select: { total: true } },
            itensRanking: {
              orderBy: { publicacao: { publicadoEm: 'desc' } },
              take: 1,
              select: { posicao: true },
            },
          },
        },
      },
    });
    if (!convocacao) throw new NotFoundException('Convocação não encontrada.');

    const [tenant, signatario] = await Promise.all([
      this.prisma.tx.tenant.findFirst({ select: { nome: true, municipio: true, uf: true } }),
      this.prisma.tx.signatario.findFirst({
        where: { ativo: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { nome: true, cargo: true },
      }),
    ]);

    const comprovante = assinarComprovante({
      tipo: 'convocacao',
      id: convocacao.id,
      numeroOficio: convocacao.numeroOficio,
      protocolo: convocacao.inscricao.protocolo,
      programa: convocacao.inscricao.programa.nome,
      emitidoEm: convocacao.emitidaEm.toISOString(),
      prazoAte: convocacao.prazoComparecimentoAte.toISOString(),
      foraDeOrdem: convocacao.foraDeOrdem,
      municipio: tenant?.municipio ?? '',
    });
    const urlValidacao = `${WEB_URL}/validar/${comprovante}`;
    const html = oficioConvocacaoHtml({
      municipio: tenant?.municipio ?? '',
      uf: tenant?.uf ?? '',
      orgao: `${tenant?.nome ?? ''} — Secretaria de Habitação`,
      numeroOficio: convocacao.numeroOficio,
      emitidaEm: convocacao.emitidaEm,
      responsavel: convocacao.inscricao.familia.responsavel.nome,
      protocolo: convocacao.inscricao.protocolo,
      programa: convocacao.inscricao.programa.nome,
      posicao: convocacao.inscricao.itensRanking[0]?.posicao ?? null,
      pontuacao: convocacao.inscricao.snapshots[0]
        ? Number(convocacao.inscricao.snapshots[0].total)
        : null,
      prazoComparecimentoAte: convocacao.prazoComparecimentoAte,
      foraDeOrdem: convocacao.foraDeOrdem,
      motivoExcecao: convocacao.motivoExcecao,
      signatario,
      urlValidacao,
      qrDataUrl: await toDataURL(urlValidacao, { margin: 0, width: 148 }),
    });

    const pdf = await this.pdf.gerar(html);

    if (!convocacao.oficioKey) {
      const { key } = await this.storage.enviar('oficios', {
        originalname: `${convocacao.numeroOficio}.pdf`,
        mimetype: 'application/pdf',
        size: pdf.length,
        buffer: pdf,
      });
      await this.prisma.tx.convocacao.update({
        where: { id: convocacaoId },
        data: { oficioKey: key },
      });
    }

    return { pdf, nome: `${convocacao.numeroOficio.replace('/', '-')}.pdf` };
  }
}
