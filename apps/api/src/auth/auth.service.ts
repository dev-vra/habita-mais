import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { EsferaUsuario, Prisma, StatusUsuario, Usuario } from '@prisma/client';
import { br } from '@habita/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CapacidadesService } from './capacidades.service';
import type { JwtPayload } from './jwt.strategy';
import { PasswordService } from './password.service';

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** A família volta à central com protocolo e CPF; nada de credencial longa presa a um CPF. */
const ACCESS_TTL_MUNICIPE = '30m';

/** Quem entra por encaminhamento, e não pela Habitação. */
const PERFIS_DE_SETOR_EXTERNO: readonly string[] = ['DEFESA_CIVIL', 'SETOR_PARCEIRO'];

const MAX_TENTATIVAS_FALHAS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly capacidades: CapacidadesService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Login do servidor. O lookup roda em contexto de plataforma porque o usuário ainda não trouxe
   * tenant — é o único caminho que precisa enxergar além de uma prefeitura.
   *
   * A transação precisa sempre committar: `runWithContext` usa `$transaction`, e um throw no meio
   * desfaria o incremento de tentativas que acabamos de gravar. Por isso o resultado volta como
   * dado e o erro é lançado fora. A mensagem é sempre a mesma — não revela se a conta existe,
   * está bloqueada ou se só a senha está errada.
   */
  async login(email: string, senha: string): Promise<ParDeTokens> {
    const resultado = await this.prisma.runWithContext({ isPlatform: true }, async ({ tx }) => {
      const usuario = await tx.usuario.findUnique({ where: { email } });
      if (!usuario || usuario.status !== StatusUsuario.ATIVO) return null;
      if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) return null;

      if (!(await this.passwords.verify(usuario.senhaHash, senha))) {
        await this.registrarTentativaFalha(tx, usuario);
        return null;
      }

      await tx.usuario.update({
        where: { id: usuario.id },
        data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoAcessoEm: new Date() },
      });

      return this.emitirTokens(tx, usuario);
    });

    if (!resultado) throw new UnauthorizedException('Credenciais inválidas.');
    return resultado;
  }

  /**
   * Acesso da família à central: protocolo da inscrição + CPF do responsável familiar, como na
   * tela. O tenant vem do portal do município, e não do palpite do visitante — protocolo é único
   * por prefeitura, e buscar solto abriria enumeração entre municípios.
   *
   * Roda no contexto do próprio tenant, não em contexto de plataforma: dado de família não tem
   * bypass administrativo, e este caminho não precisa de um.
   */
  async acessoMunicipe(tenantId: string, protocolo: string, cpf: string): Promise<string> {
    const cpfLimpo = br.onlyDigits(cpf);

    const dados = await this.prisma.runWithContext({ tenantId, isPlatform: false }, async ({ tx }) => {
      const inscricao = await tx.inscricaoFila.findFirst({
        where: { tenantId, protocolo: protocolo.trim().toUpperCase(), deletedAt: null },
        include: { familia: { include: { responsavel: true } } },
      });
      if (!inscricao || inscricao.familia.responsavel.cpf !== cpfLimpo) return null;

      return {
        familiaId: inscricao.familiaId,
        tenantId: inscricao.tenantId,
        nome: inscricao.familia.responsavel.nome,
      };
    });

    if (!dados) throw new UnauthorizedException('Protocolo ou CPF não confere.');

    const payload: JwtPayload = {
      sub: dados.familiaId,
      tenantId: dados.tenantId,
      esfera: 'MUNICIPE',
      nome: dados.nome,
      familiaId: dados.familiaId,
    };

    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET as string,
      expiresIn: ACCESS_TTL_MUNICIPE as JwtSignOptions['expiresIn'],
    });
  }

  /** Rotação de refresh token: valida, revoga o antigo e emite um par novo. */
  async refresh(apresentado: string): Promise<ParDeTokens> {
    const [id, segredo] = apresentado.split('.');
    if (!id || !segredo) throw new UnauthorizedException('Refresh token inválido.');

    return this.prisma.runWithContext({ isPlatform: true }, async ({ tx }) => {
      const guardado = await tx.refreshToken.findUnique({ where: { id } });
      const valido =
        guardado &&
        !guardado.revokedAt &&
        guardado.expiresAt > new Date() &&
        (await this.passwords.verify(guardado.tokenHash, segredo));

      if (!guardado || !valido) {
        throw new UnauthorizedException('Refresh token inválido ou expirado.');
      }

      await tx.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });

      const usuario = await tx.usuario.findUnique({ where: { id: guardado.usuarioId } });
      if (!usuario || usuario.status !== StatusUsuario.ATIVO) {
        throw new UnauthorizedException('Usuário sem acesso ativo.');
      }
      return this.emitirTokens(tx, usuario);
    });
  }

  /** Logout: revoga o refresh apresentado. Idempotente — quem está saindo já está saindo. */
  async logout(apresentado: string): Promise<void> {
    const [id, segredo] = apresentado.split('.');
    if (!id || !segredo) return;

    await this.prisma.runWithContext({ isPlatform: true }, async ({ tx }) => {
      const guardado = await tx.refreshToken.findUnique({ where: { id } });
      if (!guardado || guardado.revokedAt) return;
      if (!(await this.passwords.verify(guardado.tokenHash, segredo))) return;
      await tx.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
    });
  }

  /** Troca de senha (primeiro acesso ou voluntária): valida a atual e reemite os tokens. */
  async trocarSenha(usuarioId: string, senhaAtual: string, novaSenha: string): Promise<ParDeTokens> {
    return this.prisma.runWithContext({ isPlatform: true }, async ({ tx }) => {
      const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario || usuario.status !== StatusUsuario.ATIVO) {
        throw new UnauthorizedException('Usuário inválido.');
      }
      if (!(await this.passwords.verify(usuario.senhaHash, senhaAtual))) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }

      const atualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          senhaHash: await this.passwords.hash(novaSenha),
          trocarSenhaNoLogin: false,
          updatedBy: usuarioId,
        },
      });
      return this.emitirTokens(tx, atualizado);
    });
  }

  private async registrarTentativaFalha(
    tx: Prisma.TransactionClient,
    usuario: Usuario,
  ): Promise<void> {
    const tentativas = usuario.tentativasFalhas + 1;
    await tx.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasFalhas: tentativas,
        bloqueadoAte:
          tentativas >= MAX_TENTATIVAS_FALHAS ? new Date(Date.now() + LOCKOUT_MS) : undefined,
      },
    });
  }

  private async emitirTokens(
    tx: Prisma.TransactionClient,
    usuario: Usuario,
  ): Promise<ParDeTokens> {
    const capacidades =
      usuario.perfil && usuario.esfera === EsferaUsuario.TENANT
        ? await this.capacidades.resolver(tx, usuario.id, usuario.perfil)
        : [];

    const payload: JwtPayload = {
      sub: usuario.id,
      tenantId: usuario.tenantId,
      esfera: usuario.esfera === EsferaUsuario.PLATAFORMA ? 'PLATAFORMA' : 'TENANT',
      nome: usuario.nome,
      perfil: usuario.perfil ?? undefined,
      capacidades,
      trocarSenhaNoLogin: usuario.trocarSenhaNoLogin,
      setorId: usuario.setorId ?? undefined,
      // Perfis de setor externo entram escopados ao próprio setor — nunca ao município inteiro.
      setorRestrito: PERFIS_DE_SETOR_EXTERNO.includes(usuario.perfil ?? ''),
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET as string,
      expiresIn: ACCESS_TTL as JwtSignOptions['expiresIn'],
    });

    const segredo = randomBytes(32).toString('hex');
    const criado = await tx.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: await this.passwords.hash(segredo),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken: `${criado.id}.${segredo}` };
  }
}
