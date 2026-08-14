import { Injectable } from '@nestjs/common';
import {
  EsferaUsuario,
  PapelSignatario,
  PerfilTenant as PerfilPrisma,
  StatusUsuario,
  type Prisma,
} from '@prisma/client';
import type { Capacidade, PerfilTenant } from '@habita/shared/habitacao';
import { actorId, getActiveContext } from '../../context/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdministracaoRepository, UsuarioResumo } from '../domain/ports';

const SELECT_USUARIO = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  status: true,
  ultimoAcessoEm: true,
  capacidades: { select: { capacidade: true, concedida: true } },
} satisfies Prisma.UsuarioSelect;

@Injectable()
export class AdministracaoPrismaRepository implements AdministracaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarUsuarios(): Promise<UsuarioResumo[]> {
    const usuarios = await this.prisma.tx.usuario.findMany({
      where: { deletedAt: null, esfera: EsferaUsuario.TENANT },
      orderBy: { nome: 'asc' },
      select: SELECT_USUARIO,
    });
    return usuarios.map(paraResumo);
  }

  async buscarUsuario(usuarioId: string): Promise<UsuarioResumo | null> {
    const usuario = await this.prisma.tx.usuario.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: SELECT_USUARIO,
    });
    return usuario ? paraResumo(usuario) : null;
  }

  async emailEmUso(email: string): Promise<boolean> {
    const existente = await this.prisma.tx.usuario.findUnique({
      where: { email },
      select: { id: true },
    });
    return existente !== null;
  }

  async criarUsuario(dados: {
    nome: string;
    email: string;
    perfil: PerfilTenant;
    senhaHash: string;
  }): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.usuario.create({
      data: {
        tenantId: tenantId ?? '',
        esfera: EsferaUsuario.TENANT,
        perfil: dados.perfil as PerfilPrisma,
        nome: dados.nome,
        email: dados.email,
        senhaHash: dados.senhaHash,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async definirStatus(usuarioId: string, status: string): Promise<void> {
    await this.prisma.tx.usuario.update({
      where: { id: usuarioId },
      data: { status: status as StatusUsuario, updatedBy: actorId() },
    });
  }

  async redefinirSenha(usuarioId: string, senhaHash: string): Promise<void> {
    await this.prisma.tx.usuario.update({
      where: { id: usuarioId },
      data: {
        senhaHash,
        trocarSenhaNoLogin: true,
        // Senha nova zera o lockout: quem foi bloqueado por tentativas erradas volta a entrar.
        tentativasFalhas: 0,
        bloqueadoAte: null,
        updatedBy: actorId(),
      },
    });
  }

  async registrarCapacidade(dados: {
    usuarioId: string;
    capacidade: Capacidade;
    concedida: boolean;
    motivo: string;
  }): Promise<void> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    await this.prisma.tx.usuarioCapacidade.upsert({
      where: {
        usuarioId_capacidade: { usuarioId: dados.usuarioId, capacidade: dados.capacidade },
      },
      update: { concedida: dados.concedida, motivo: dados.motivo, updatedBy: ator },
      create: {
        tenantId: tenantId ?? '',
        usuarioId: dados.usuarioId,
        capacidade: dados.capacidade,
        concedida: dados.concedida,
        motivo: dados.motivo,
        createdBy: ator,
        updatedBy: ator,
      },
    });
  }

  async removerCapacidade(usuarioId: string, capacidade: Capacidade): Promise<void> {
    await this.prisma.tx.usuarioCapacidade.deleteMany({ where: { usuarioId, capacidade } });
  }

  async listarSignatarios() {
    return this.prisma.tx.signatario.findMany({
      where: { deletedAt: null },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, papel: true, cargo: true, ativo: true },
    });
  }

  async criarSignatario(dados: {
    nome: string;
    papel: string;
    cargo: string;
    cpf?: string;
  }): Promise<{ id: string }> {
    const { tenantId } = getActiveContext();
    const ator = actorId();

    return this.prisma.tx.signatario.create({
      data: {
        tenantId: tenantId ?? '',
        nome: dados.nome,
        papel: dados.papel as PapelSignatario,
        cargo: dados.cargo,
        cpf: dados.cpf ?? null,
        createdBy: ator,
        updatedBy: ator,
      },
      select: { id: true },
    });
  }

  async desativarSignatario(signatarioId: string): Promise<void> {
    await this.prisma.tx.signatario.update({
      where: { id: signatarioId },
      data: { ativo: false, updatedBy: actorId() },
    });
  }

  async parametros(): Promise<Record<string, unknown>> {
    const tenant = await this.prisma.tx.tenant.findFirst({ select: { parametros: true } });
    return (tenant?.parametros ?? {}) as Record<string, unknown>;
  }

  async salvarParametros(parametros: Record<string, unknown>): Promise<void> {
    const { tenantId } = getActiveContext();
    if (!tenantId) return;

    await this.prisma.tx.tenant.update({
      where: { id: tenantId },
      data: { parametros: parametros as Prisma.InputJsonValue, updatedBy: actorId() },
    });
  }
}

function paraResumo(usuario: Prisma.UsuarioGetPayload<{ select: typeof SELECT_USUARIO }>): UsuarioResumo {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil as PerfilTenant | null,
    status: usuario.status,
    ultimoAcessoEm: usuario.ultimoAcessoEm,
    capacidadesConcedidas: usuario.capacidades
      .filter((registro) => registro.concedida)
      .map((registro) => registro.capacidade as Capacidade),
    capacidadesRevogadas: usuario.capacidades
      .filter((registro) => !registro.concedida)
      .map((registro) => registro.capacidade as Capacidade),
  };
}
