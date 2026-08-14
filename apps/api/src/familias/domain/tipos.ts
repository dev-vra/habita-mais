// Tipos do domínio de famílias. A unidade de atendimento é a família, não a pessoa: renda per
// capita, composição e vulnerabilidade só fazem sentido no grupo, e é o grupo que entra na fila.

export interface DadosPessoa {
  cpf: string;
  nome: string;
  nascimento?: Date;
  sexo?: 'FEMININO' | 'MASCULINO' | 'NAO_INFORMADO';
  nis?: string;
  telefone?: string;
  email?: string;
  deficiencia?: boolean;
}

export interface DadosFichaSocial {
  rendaFamiliar: number;
  quantidadePessoas: number;
  quantidadeMenores: number;
  fonteRendaPrincipal?: string;
  nis?: string;
  beneficioAtivo?: string;
  mulherChefeFamilia: boolean;
  temPessoaComDeficiencia: boolean;
  temIdoso: boolean;
  situacaoRisco: boolean;
  laudoRiscoKey?: string;
  laudoRiscoEmitidoEm?: Date;
  tipoMoradia: string;
  tipoConstrucao: string;
  saneamento: string;
  moradiaInadequada: boolean;
  possuiOutroImovel: boolean;
  mesesResidenciaMunicipio: number;
  apuradaEm: Date;
  validaAte: Date;
  origem?: 'PROPRIA' | 'REURB';
  origemProcessoExterno?: string;
}

export interface DadosMembro {
  pessoa: DadosPessoa;
  parentesco: string;
  contribuiRenda: boolean;
}

export interface DadosVisita {
  visitadaEm: Date;
  parecer: string;
  latitude?: number;
  longitude?: number;
  fotos: string[];
}

export interface FamiliaCriada {
  id: string;
  codigo: string;
  responsavelId: string;
}
