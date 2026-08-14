import type {
  DadosFichaSocial,
  DadosMembro,
  DadosPessoa,
  DadosVisita,
  FamiliaCriada,
} from './tipos';

export const FAMILIAS_REPOSITORY = Symbol('FamiliasRepository');

export interface FichaVigenteResumo {
  id: string;
  rendaPerCapita: number;
  quantidadePessoas: number;
  validaAte: Date;
}

export interface FamiliasRepository {
  pessoaPorCpf(cpf: string): Promise<{ id: string; nome: string; familiaId?: string } | null>;
  criarPessoa(dados: DadosPessoa): Promise<{ id: string }>;
  criarFamilia(dados: { codigo: string; responsavelId: string }): Promise<FamiliaCriada>;
  existe(familiaId: string): Promise<boolean>;
  fichaVigente(familiaId: string): Promise<FichaVigenteResumo | null>;
  /** Encerra a ficha vigente e grava a nova — a anterior não é sobrescrita. */
  registrarFicha(familiaId: string, dados: DadosFichaSocial): Promise<{ id: string }>;
  adicionarMembro(familiaId: string, dados: DadosMembro): Promise<{ id: string }>;
  registrarVisita(familiaId: string, dados: DadosVisita): Promise<{ id: string }>;
}
