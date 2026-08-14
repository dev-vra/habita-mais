import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  EscopoDocumento,
  FinalidadePilha,
  SituacaoDocumento,
  SituacaoPilha,
} from '@prisma/client';
import { habitacao } from '@habita/shared';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../common/ports';
import { actorId, getActiveContext } from '../context/request-context';
import { PrismaService } from '../prisma/prisma.service';

export interface JuntarDocumentoEntrada {
  tipoDocumentoId: string;
  escopo: string;
  referenciaId: string;
  arquivoKey: string;
  nomeArquivo: string;
  mimeType: string;
  tamanho: number;
  emitidoEm?: Date;
  observacao?: string;
}

/**
 * Juntada documental.
 *
 * Cada documento recebe protocolo próprio: no processo administrativo, o papel que entrou precisa
 * ser referenciável por si, e "o comprovante que a dona Marlene trouxe" não é referência.
 */
@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolos: GeradorProtocolo,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
  ) {}

  async juntar(entrada: JuntarDocumentoEntrada, agora: Date) {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    const tipo = await this.prisma.tx.tipoDocumento.findFirst({
      where: { id: entrada.tipoDocumentoId, ativo: true, deletedAt: null },
      select: { id: true, nome: true, escopo: true, validadeMeses: true },
    });
    if (!tipo) throw new NotFoundException('Tipo de documento não encontrado ou inativo.');
    if (tipo.escopo !== entrada.escopo) {
      throw new BadRequestException(
        `"${tipo.nome}" é documento de ${tipo.escopo.toLowerCase()}, não de ${entrada.escopo.toLowerCase()}.`,
      );
    }

    // A versão anterior do mesmo tipo não some: vira SUBSTITUIDO, e continua no histórico. Quem
    // audita precisa ver o que foi apresentado antes, não só o que vale hoje.
    await this.prisma.tx.documento.updateMany({
      where: {
        escopo: entrada.escopo as EscopoDocumento,
        referenciaId: entrada.referenciaId,
        tipoDocumentoId: tipo.id,
        situacao: { in: [SituacaoDocumento.RECEBIDO, SituacaoDocumento.CONFERIDO] },
        deletedAt: null,
      },
      data: { situacao: SituacaoDocumento.SUBSTITUIDO, updatedBy: ator },
    });

    const protocolo = await this.protocolos.proximo('DOC', agora.getFullYear());
    const validoAte = entrada.emitidoEm
      ? habitacao.calcularValidade(entrada.emitidoEm, tipo.validadeMeses)
      : null;

    const documento = await this.prisma.tx.documento.create({
      data: {
        tenantId: tenantId ?? '',
        tipoDocumentoId: tipo.id,
        escopo: entrada.escopo as EscopoDocumento,
        referenciaId: entrada.referenciaId,
        protocolo,
        arquivoKey: entrada.arquivoKey,
        nomeArquivo: entrada.nomeArquivo,
        mimeType: entrada.mimeType,
        tamanho: entrada.tamanho,
        emitidoEm: entrada.emitidoEm ?? null,
        validoAte,
        observacao: entrada.observacao ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, protocolo: true, validoAte: true },
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Documento',
      entidadeId: documento.id,
      diff: {
        protocolo,
        tipo: tipo.nome,
        referencia: `${entrada.escopo}:${entrada.referenciaId}`,
        validoAte: validoAte?.toISOString() ?? null,
      },
    });

    await this.vincularEmPilhasAbertas(documento.id, tipo.id, entrada.escopo, entrada.referenciaId);

    return documento;
  }

  /**
   * Conferência: o ato que transforma papel entregue em documento aceito.
   *
   * Recusar exige motivo — a família precisa saber o que corrigir, e "recusado" sem razão é o tipo
   * de resposta que faz a pessoa voltar ao balcão três vezes.
   */
  async conferir(
    documentoId: string,
    decisao: 'CONFERIDO' | 'RECUSADO',
    motivoRecusa?: string,
  ): Promise<void> {
    const documento = await this.prisma.tx.documento.findFirst({
      where: { id: documentoId, deletedAt: null },
      select: { id: true, protocolo: true, situacao: true },
    });
    if (!documento) throw new NotFoundException('Documento não encontrado.');
    if (documento.situacao === SituacaoDocumento.SUBSTITUIDO) {
      throw new BadRequestException('Documento substituído por versão mais recente.');
    }
    if (decisao === 'RECUSADO' && !motivoRecusa?.trim()) {
      throw new BadRequestException('Recusa exige motivo — é o que a família recebe para corrigir.');
    }

    const ator = actorId();
    await this.prisma.tx.documento.update({
      where: { id: documentoId },
      data: {
        situacao: decisao as SituacaoDocumento,
        conferidoPor: ator,
        conferidoEm: new Date(),
        motivoRecusa: decisao === 'RECUSADO' ? motivoRecusa?.trim() : null,
        updatedBy: ator,
      },
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Documento',
      entidadeId: documentoId,
      diff: { protocolo: documento.protocolo, decisao, motivoRecusa: motivoRecusa ?? null },
    });
  }

  /**
   * Situação documental de uma entidade, avaliada contra as exigências do programa.
   *
   * Sem programa (uma família fora de fila, por exemplo), a lista sai dos documentos que existem —
   * é conferência do que há, não cobrança do que falta.
   */
  async situacao(escopo: string, referenciaId: string, programaId?: string) {
    const [exigencias, documentos] = await Promise.all([
      programaId
        ? this.prisma.tx.exigenciaDocumental.findMany({
            where: { programaId },
            include: { tipo: true },
          })
        : Promise.resolve([]),
      this.prisma.tx.documento.findMany({
        where: {
          escopo: escopo as EscopoDocumento,
          referenciaId,
          deletedAt: null,
          situacao: { not: SituacaoDocumento.SUBSTITUIDO },
        },
        include: { tipo: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const porTipo = new Map(documentos.map((documento) => [documento.tipoDocumentoId, documento]));

    const lista: habitacao.ExigenciaComDocumento[] = exigencias.map((exigencia) => {
      const documento = porTipo.get(exigencia.tipoDocumentoId);
      porTipo.delete(exigencia.tipoDocumentoId);

      return {
        tipoCodigo: exigencia.tipo.codigo,
        tipoNome: exigencia.tipo.nome,
        obrigatorio: exigencia.obrigatorio,
        orientacao: exigencia.tipo.orientacao ?? undefined,
        documento: documento ? paraDominio(documento) : undefined,
      };
    });

    // O que foi entregue sem ser exigido continua aparecendo: a família trouxe, o processo tem.
    for (const documento of porTipo.values()) {
      lista.push({
        tipoCodigo: documento.tipo.codigo,
        tipoNome: documento.tipo.nome,
        obrigatorio: false,
        orientacao: documento.tipo.orientacao ?? undefined,
        documento: paraDominio(documento),
      });
    }

    const itens = habitacao.conferirDocumentos(lista, new Date());

    return {
      itens: itens.map((item, indice) => ({
        ...item,
        documentoId: documentos.find((d) => d.tipo.codigo === item.tipoCodigo)?.id ?? null,
        ordem: indice + 1,
      })),
      resumo: habitacao.resumirConferencia(itens),
    };
  }

  /**
   * Monta a pilha de uma finalidade e amarra o que já existe.
   *
   * É o que resolve o problema do cartório: em vez de conferir papel por papel numa mesa, a pessoa
   * abre a pilha e vê o que falta. O índice sai na ordem de juntada quando ela fecha.
   */
  async montarPilha(entrada: {
    finalidade: string;
    escopo: string;
    referenciaId: string;
    nome: string;
    tiposDocumento: string[];
    agora: Date;
  }) {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    if (entrada.tiposDocumento.length === 0) {
      throw new BadRequestException('A pilha precisa de ao menos um documento na lista.');
    }

    const protocolo = await this.protocolos.proximo('PIL', entrada.agora.getFullYear());
    const pilha = await this.prisma.tx.pilhaDocumental.create({
      data: {
        tenantId: tenantId ?? '',
        finalidade: entrada.finalidade as FinalidadePilha,
        escopo: entrada.escopo as EscopoDocumento,
        referenciaId: entrada.referenciaId,
        nome: `${entrada.nome} · ${protocolo}`,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true, nome: true },
    });

    const existentes = await this.prisma.tx.documento.findMany({
      where: {
        referenciaId: entrada.referenciaId,
        tipoDocumentoId: { in: entrada.tiposDocumento },
        situacao: { in: [SituacaoDocumento.RECEBIDO, SituacaoDocumento.CONFERIDO] },
        deletedAt: null,
      },
      select: { id: true, tipoDocumentoId: true },
    });
    const porTipo = new Map(existentes.map((documento) => [documento.tipoDocumentoId, documento.id]));

    for (const [indice, tipoDocumentoId] of entrada.tiposDocumento.entries()) {
      await this.prisma.tx.itemPilha.create({
        data: {
          tenantId: tenantId ?? '',
          pilhaId: pilha.id,
          tipoDocumentoId,
          documentoId: porTipo.get(tipoDocumentoId) ?? null,
          ordem: indice + 1,
          createdBy: ator,
          updatedBy: ator,
        },
      });
    }

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'PilhaDocumental',
      entidadeId: pilha.id,
      diff: {
        protocolo,
        finalidade: entrada.finalidade,
        itens: entrada.tiposDocumento.length,
        jaVinculados: porTipo.size,
      },
    });

    return { id: pilha.id, nome: pilha.nome, protocolo, vinculados: porTipo.size };
  }

  async pilha(pilhaId: string) {
    const pilha = await this.prisma.tx.pilhaDocumental.findFirst({
      where: { id: pilhaId },
      include: {
        itens: {
          orderBy: { ordem: 'asc' },
          include: { tipo: true, documento: true },
        },
      },
    });
    if (!pilha) throw new NotFoundException('Pilha não encontrada.');

    const itens = pilha.itens.map((item) => ({
      ordem: item.ordem,
      tipoNome: item.tipo.nome,
      obrigatorio: item.obrigatorio,
      documento: item.documento
        ? {
            protocolo: item.documento.protocolo,
            nomeArquivo: item.documento.nomeArquivo,
            arquivoKey: item.documento.arquivoKey,
            situacao: item.documento.situacao,
            validoAte: item.documento.validoAte?.toISOString() ?? null,
          }
        : null,
    }));

    return {
      id: pilha.id,
      nome: pilha.nome,
      finalidade: pilha.finalidade,
      situacao: pilha.situacao,
      itens,
      faltando: itens.filter((item) => item.obrigatorio && !item.documento).length,
    };
  }

  /** Fecha a pilha. Só fecha completa — pilha entregue pela metade volta do cartório. */
  async fecharPilha(pilhaId: string, entreguePara: string): Promise<void> {
    const pilha = await this.pilha(pilhaId);
    if (pilha.faltando > 0) {
      throw new BadRequestException(
        `Faltam ${pilha.faltando} documento(s) obrigatório(s) — a pilha incompleta volta do destino.`,
      );
    }

    const ator = actorId();
    await this.prisma.tx.pilhaDocumental.update({
      where: { id: pilhaId },
      data: {
        situacao: SituacaoPilha.ENTREGUE,
        entregueEm: new Date(),
        entreguePara,
        updatedBy: ator,
      },
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'PilhaDocumental',
      entidadeId: pilhaId,
      diff: { situacao: 'ENTREGUE', entreguePara, itens: pilha.itens.length },
    });
  }

  /** Documento novo entra sozinho nas pilhas abertas que o esperavam. */
  private async vincularEmPilhasAbertas(
    documentoId: string,
    tipoDocumentoId: string,
    escopo: string,
    referenciaId: string,
  ): Promise<void> {
    await this.prisma.tx.itemPilha.updateMany({
      where: {
        tipoDocumentoId,
        documentoId: null,
        pilha: {
          escopo: escopo as EscopoDocumento,
          referenciaId,
          situacao: SituacaoPilha.EM_MONTAGEM,
        },
      },
      data: { documentoId, updatedBy: actorId() },
    });
  }
}

function paraDominio(documento: {
  id: string;
  protocolo: string;
  situacao: SituacaoDocumento;
  validoAte: Date | null;
  motivoRecusa: string | null;
}): habitacao.ExigenciaComDocumento['documento'] {
  return {
    id: documento.id,
    protocolo: documento.protocolo,
    situacao: documento.situacao as 'RECEBIDO' | 'CONFERIDO' | 'RECUSADO' | 'SUBSTITUIDO',
    validoAte: documento.validoAte?.toISOString(),
    motivoRecusa: documento.motivoRecusa ?? undefined,
  };
}
