import type { Capacidade, PerfilTenant } from '@habita/shared/habitacao';

export const ADMINISTRACAO_REPOSITORY = Symbol('AdministracaoRepository');

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilTenant | null;
  status: string;
  ultimoAcessoEm: Date | null;
  capacidadesConcedidas: Capacidade[];
  capacidadesRevogadas: Capacidade[];
}

export interface AdministracaoRepository {
  listarUsuarios(): Promise<UsuarioResumo[]>;
  buscarUsuario(usuarioId: string): Promise<UsuarioResumo | null>;
  emailEmUso(email: string): Promise<boolean>;
  criarUsuario(dados: {
    nome: string;
    email: string;
    perfil: PerfilTenant;
    senhaHash: string;
  }): Promise<{ id: string }>;
  definirStatus(usuarioId: string, status: string): Promise<void>;
  redefinirSenha(usuarioId: string, senhaHash: string): Promise<void>;
  /** Grava a decisão explícita (concedida ou revogada) com o motivo. */
  registrarCapacidade(dados: {
    usuarioId: string;
    capacidade: Capacidade;
    concedida: boolean;
    motivo: string;
  }): Promise<void>;
  removerCapacidade(usuarioId: string, capacidade: Capacidade): Promise<void>;

  listarSignatarios(): Promise<
    { id: string; nome: string; papel: string; cargo: string; ativo: boolean }[]
  >;
  criarSignatario(dados: {
    nome: string;
    papel: string;
    cargo: string;
    cpf?: string;
  }): Promise<{ id: string }>;
  desativarSignatario(signatarioId: string): Promise<void>;

  parametros(): Promise<Record<string, unknown>>;
  salvarParametros(parametros: Record<string, unknown>): Promise<void>;
}
