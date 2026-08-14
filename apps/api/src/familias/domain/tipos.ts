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
  nomeMae?: string;
  nomePai?: string;
  nomePaiNaoInformado?: boolean;
  estadoCivil?: string;
  regimeBens?: string;
  rg?: string;
  orgaoExpedidor?: string;
  rgUf?: string;
  rgAusente?: boolean;
  nacionalidade?: string;
  naturalidade?: string;
  profissao?: string;
  escolaridade?: string;
  situacaoTrabalho?: string;
  tiposDeficiencia?: string[];
  usaCadeiraDeRodas?: boolean;
  necessitaCuidador?: boolean;
  telefoneAlternativo?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  referencia?: string;
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
  fonteRenda?: string;
  regimeRenda?: string;
  rendaComplementar?: boolean;
  rendaComplementarDesc?: string;
  inscritoCadUnico?: boolean;
  beneficios?: string[];
  estruturaFamiliar?: string;
  vulnerabilidades?: string[];
  nivelVulnerabilidade?: string;
  parecerTecnico?: string;
  situacaoHabitacional?: string;
  comodos?: number;
  banheiros?: number;
  abastecimentoAgua?: string;
  energiaEletrica?: string;
  coletaLixo?: string;
  pavimentacao?: string;
  iluminacaoPublica?: boolean;
  drenagemPluvial?: boolean;
  acessoEscolaProxima?: boolean;
  acessoSaudeProxima?: boolean;
  acessoTransportePublico?: boolean;
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
