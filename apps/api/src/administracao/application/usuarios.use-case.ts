import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import type { Capacidade, PerfilTenant } from '@habita/shared/habitacao';
import { PasswordService } from '../../auth/password.service';
import { TRILHA_AUDITORIA, type TrilhaAuditoria } from '../../common/ports';
import { ADMINISTRACAO_REPOSITORY, type AdministracaoRepository } from '../domain/ports';

const TAMANHO_SENHA_TEMPORARIA = 9;
const TAMANHO_MINIMO_MOTIVO = 15;

@Injectable()
export class UsuariosUseCase {
  constructor(
    @Inject(ADMINISTRACAO_REPOSITORY) private readonly repositorio: AdministracaoRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    private readonly senhas: PasswordService,
  ) {}

  listar() {
    return this.repositorio.listarUsuarios();
  }

  /**
   * Cria o servidor com senha temporária, devolvida uma única vez para ser entregue em mãos.
   * O sistema nunca mais mostra essa senha — e o primeiro acesso obriga a troca.
   */
  async criar(dados: {
    nome: string;
    email: string;
    perfil: PerfilTenant;
    setorId?: string;
  }): Promise<{
    id: string;
    senhaTemporaria: string;
  }> {
    const email = dados.email.trim().toLowerCase();
    if (await this.repositorio.emailEmUso(email)) {
      throw new BadRequestException('Já existe usuário com este e-mail.');
    }

    const senhaTemporaria = gerarSenhaTemporaria();
    const usuario = await this.repositorio.criarUsuario({
      nome: dados.nome.trim(),
      email,
      perfil: dados.perfil,
      setorId: dados.setorId,
      senhaHash: await this.senhas.hash(senhaTemporaria),
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Usuario',
      entidadeId: usuario.id,
      diff: { nome: dados.nome, email, perfil: dados.perfil, setorId: dados.setorId ?? null },
    });

    return { id: usuario.id, senhaTemporaria };
  }

  /**
   * Bloqueio e desativação. Um administrador não desativa a si mesmo: em prefeitura pequena isso
   * costuma ser o único acesso administrativo, e o erro deixaria o município sem quem configure.
   */
  async definirStatus(usuarioId: string, status: string, atorId: string): Promise<void> {
    if (usuarioId === atorId) {
      throw new BadRequestException('Você não pode alterar o próprio status de acesso.');
    }

    const usuario = await this.exigirUsuario(usuarioId);
    await this.repositorio.definirStatus(usuarioId, status);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Usuario',
      entidadeId: usuarioId,
      diff: { de: usuario.status, para: status },
    });
  }

  async redefinirSenha(usuarioId: string): Promise<{ senhaTemporaria: string }> {
    await this.exigirUsuario(usuarioId);

    const senhaTemporaria = gerarSenhaTemporaria();
    await this.repositorio.redefinirSenha(usuarioId, await this.senhas.hash(senhaTemporaria));

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Usuario',
      entidadeId: usuarioId,
      diff: { acao: 'senha_redefinida' },
    });

    return { senhaTemporaria };
  }

  /**
   * Concessão e revogação de capacidade.
   *
   * Motivo é obrigatório porque a matriz de capacidades é o documento que a prefeitura mostra ao
   * controle externo: uma linha sem justificativa transforma segregação de funções em decoração.
   */
  async definirCapacidade(dados: {
    usuarioId: string;
    capacidade: Capacidade;
    concedida: boolean;
    motivo: string;
    atorId: string;
  }): Promise<void> {
    const usuario = await this.exigirUsuario(dados.usuarioId);
    if (!usuario.perfil) {
      throw new BadRequestException('Usuário sem perfil não recebe capacidade.');
    }
    if (dados.usuarioId === dados.atorId && habitacao.isCapacidadeSensivel(dados.capacidade)) {
      throw new ForbiddenException(
        'Ninguém concede a si mesmo uma capacidade sensível — peça a outro administrador.',
      );
    }

    const motivo = dados.motivo.trim();
    if (motivo.length < TAMANHO_MINIMO_MOTIVO) {
      throw new BadRequestException('Descreva o motivo da concessão — ele fica na trilha.');
    }

    await this.repositorio.registrarCapacidade({
      usuarioId: dados.usuarioId,
      capacidade: dados.capacidade,
      concedida: dados.concedida,
      motivo,
    });

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'UsuarioCapacidade',
      entidadeId: dados.usuarioId,
      diff: {
        capacidade: dados.capacidade,
        concedida: dados.concedida,
        sensivel: habitacao.isCapacidadeSensivel(dados.capacidade),
        motivo,
      },
    });
  }

  /** Remove a decisão explícita: o usuário volta ao que o perfil dá por padrão. */
  async limparCapacidade(usuarioId: string, capacidade: Capacidade): Promise<void> {
    await this.exigirUsuario(usuarioId);
    await this.repositorio.removerCapacidade(usuarioId, capacidade);

    await this.trilha.registrar({
      operacao: 'DELETE',
      entidade: 'UsuarioCapacidade',
      entidadeId: usuarioId,
      diff: { capacidade, acao: 'voltou_ao_padrao_do_perfil' },
    });
  }

  private async exigirUsuario(usuarioId: string) {
    const usuario = await this.repositorio.buscarUsuario(usuarioId);
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return usuario;
  }
}

/** Senha temporária legível ao telefone: sem caracteres ambíguos (O/0, I/l/1). */
function gerarSenhaTemporaria(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(TAMANHO_SENHA_TEMPORARIA);

  return Array.from(bytes)
    .map((valor) => alfabeto[valor % alfabeto.length])
    .join('');
}
