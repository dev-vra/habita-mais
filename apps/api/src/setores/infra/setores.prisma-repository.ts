import { Injectable } from '@nestjs/common';
import { SituacaoEncaminhamento, TipoSetor, TipoSolicitacao } from '@prisma/client';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { EncaminhamentoEstado, SetorResumo, SetoresRepository } from '../domain/ports';

@Injectable()
export class SetoresPrismaRepository implements SetoresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarSetores(): Promise<SetorResumo[]> {
    return this.prisma.tx.setor.findMany({
      where: { deletedAt: null },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, sigla: true, tipo: true, secretaria: true, ativo: true },
    });
  }

  async buscarSetor(setorId: string): Promise<SetorResumo | null> {
    return this.prisma.tx.setor.findFirst({
      where: { id: setorId, deletedAt: null },
      select: { id: true, nome: true, sigla: true, tipo: true, secretaria: true, ativo: true },
    });
  }

  async setorDaHabitacao(): Promise<string | null> {
    const setor = await this.prisma.tx.setor.findFirst({
      where: { tipo: TipoSetor.HABITACAO, ativo: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return setor?.id ?? null;
  }

  async criarSetor(dados: {
    nome: string;
    sigla: string;
    tipo: string;
    secretaria?: string;
    email?: string;
  }): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.setor.create({
      data: {
        tenantId: tenantId ?? '',
        nome: dados.nome,
        sigla: dados.sigla.toUpperCase(),
        tipo: dados.tipo as TipoSetor,
        secretaria: dados.secretaria ?? null,
        email: dados.email ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async desativarSetor(setorId: string): Promise<void> {
    await this.prisma.tx.setor.update({
      where: { id: setorId },
      data: { ativo: false, updatedBy: actorId() },
    });
  }

  async criarEncaminhamento(dados: {
    numero: string;
    setorOrigemId: string;
    setorDestinoId: string;
    tipoSolicitacao: string;
    entidade: string;
    entidadeId: string;
    referenciaResumo: string;
    assunto: string;
    descricao: string;
    prazoAte: Date;
  }): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.encaminhamento.create({
      data: {
        tenantId: tenantId ?? '',
        numero: dados.numero,
        setorOrigemId: dados.setorOrigemId,
        setorDestinoId: dados.setorDestinoId,
        tipoSolicitacao: dados.tipoSolicitacao as TipoSolicitacao,
        entidade: dados.entidade,
        entidadeId: dados.entidadeId,
        referenciaResumo: dados.referenciaResumo,
        assunto: dados.assunto,
        descricao: dados.descricao,
        prazoAte: dados.prazoAte,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async buscarEncaminhamento(encaminhamentoId: string): Promise<EncaminhamentoEstado | null> {
    return this.prisma.tx.encaminhamento.findUnique({
      where: { id: encaminhamentoId },
      select: {
        id: true,
        numero: true,
        setorDestinoId: true,
        situacao: true,
        tipoSolicitacao: true,
        entidade: true,
        entidadeId: true,
      },
    });
  }

  async registrarResposta(dados: {
    encaminhamentoId: string;
    resposta: string;
    anexoKey?: string;
  }): Promise<void> {
    const ator = actorId();

    await this.prisma.tx.encaminhamento.update({
      where: { id: dados.encaminhamentoId },
      data: {
        situacao: SituacaoEncaminhamento.RESPONDIDO,
        resposta: dados.resposta,
        anexoKey: dados.anexoKey ?? null,
        respondidoEm: new Date(),
        respondidoPor: ator,
        updatedBy: ator,
      },
    });
  }

  async devolver(encaminhamentoId: string, motivo: string): Promise<void> {
    const ator = actorId();

    await this.prisma.tx.encaminhamento.update({
      where: { id: encaminhamentoId },
      data: {
        situacao: SituacaoEncaminhamento.DEVOLVIDO,
        resposta: motivo,
        respondidoEm: new Date(),
        respondidoPor: ator,
        updatedBy: ator,
      },
    });
  }

  /**
   * Anexa o laudo na ficha vigente, NA MESMA TRANSAÇÃO da resposta.
   *
   * Transação separada seria a forma errada: se a resposta falhasse depois, a ficha ficaria
   * alterada com o encaminhamento ainda aberto — aconteceu no primeiro teste. A autorização vem
   * da policy `setor_anexa_laudo_*`, que só libera enquanto existir encaminhamento de laudo
   * ABERTO para aquela família endereçado a este setor.
   */
  async anexarLaudoNaFichaVigente(familiaId: string, anexoKey: string): Promise<boolean> {
    const ficha = await this.prisma.tx.fichaSocial.findFirst({
      where: { familiaId, vigente: true, deletedAt: null },
      select: { id: true },
    });
    if (!ficha) return false;

    await this.prisma.tx.fichaSocial.update({
      where: { id: ficha.id },
      data: {
        laudoRiscoKey: anexoKey,
        laudoRiscoEmitidoEm: new Date(),
        updatedBy: actorId(),
      },
    });
    return true;
  }
}
