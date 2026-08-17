// Rótulos em PT-BR de todo enum do domínio social.
//
// Fonte única: a mesma palavra que o técnico lê na tela é a que sai no relatório e no PDF. Deixar
// isso no componente faria cada tela inventar a própria tradução — e "MONOPARENTAL_MAE" vira
// "Monoparental mãe" numa e "Chefiada por mulher" noutra, sem ninguém perceber.

function rotulador<T extends Record<string, string>>(mapa: T) {
  return (valor: string | null | undefined): string => (valor ? (mapa[valor] ?? valor) : '—');
}

export const SEXO = {
  FEMININO: 'Feminino',
  MASCULINO: 'Masculino',
  NAO_INFORMADO: 'Não informado',
} as const;

export const ESTADO_CIVIL = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  UNIAO_ESTAVEL: 'União estável',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
  SEPARADO: 'Separado(a)',
} as const;

export const REGIME_BENS = {
  COMUNHAO_PARCIAL: 'Comunhão parcial de bens',
  COMUNHAO_UNIVERSAL: 'Comunhão universal de bens',
  SEPARACAO_TOTAL: 'Separação total de bens',
  SEPARACAO_OBRIGATORIA: 'Separação obrigatória de bens',
  PARTICIPACAO_FINAL_AQUESTOS: 'Participação final nos aquestos',
} as const;

export const ESCOLARIDADE = {
  NAO_ALFABETIZADO: 'Não alfabetizado(a)',
  SEM_INSTRUCAO: 'Sem instrução',
  FUNDAMENTAL_INCOMPLETO: 'Fundamental incompleto',
  FUNDAMENTAL_COMPLETO: 'Fundamental completo',
  MEDIO_INCOMPLETO: 'Médio incompleto',
  MEDIO_COMPLETO: 'Médio completo',
  SUPERIOR_INCOMPLETO: 'Superior incompleto',
  SUPERIOR_COMPLETO: 'Superior completo',
  POS_GRADUACAO: 'Pós-graduação',
} as const;

export const SITUACAO_TRABALHO = {
  CARTEIRA_ASSINADA: 'Carteira assinada',
  SERVIDOR_PUBLICO: 'Servidor(a) público(a)',
  AUTONOMO: 'Autônomo(a)',
  INFORMAL: 'Trabalho informal',
  DESEMPREGADO: 'Desempregado(a)',
  APOSENTADO_PENSIONISTA: 'Aposentado(a) ou pensionista',
  ESTUDANTE: 'Estudante',
  DO_LAR: 'Do lar',
  INCAPACITADO: 'Incapacitado(a) para o trabalho',
} as const;

export const TIPO_DEFICIENCIA = {
  FISICA: 'Física',
  VISUAL: 'Visual',
  AUDITIVA: 'Auditiva',
  INTELECTUAL: 'Intelectual',
  PSICOSSOCIAL: 'Psicossocial',
  TEA: 'Transtorno do espectro autista',
  MULTIPLA: 'Múltipla',
  MOBILIDADE_REDUZIDA: 'Mobilidade reduzida',
} as const;

export const FONTE_RENDA = {
  EMPREGO_FORMAL: 'Emprego formal',
  MEI: 'MEI',
  AUTONOMO: 'Trabalho autônomo',
  INFORMAL: 'Trabalho informal',
  APOSENTADORIA_PENSAO: 'Aposentadoria ou pensão',
  BPC: 'BPC',
  PROGRAMA_SOCIAL: 'Programa social',
  SEM_RENDA: 'Sem renda',
} as const;

export const REGIME_RENDA = {
  FIXA: 'Renda fixa',
  VARIAVEL: 'Renda variável',
  MISTA: 'Renda mista',
} as const;

export const BENEFICIO_SOCIAL = {
  BOLSA_FAMILIA: 'Bolsa Família',
  BPC_PCD: 'BPC — pessoa com deficiência',
  BPC_IDOSO: 'BPC — idoso',
  APOSENTADORIA_INVALIDEZ: 'Aposentadoria por invalidez',
  SEGURO_DESEMPREGO: 'Seguro-desemprego',
  AUXILIO_ALUGUEL_MUNICIPAL: 'Auxílio-aluguel municipal',
  TARIFA_SOCIAL_ENERGIA: 'Tarifa social de energia',
} as const;

export const ESTRUTURA_FAMILIAR = {
  CASAL_COM_FILHOS: 'Casal com filhos',
  CASAL_SEM_FILHOS: 'Casal sem filhos',
  MONOPARENTAL_MAE: 'Monoparental — mãe',
  MONOPARENTAL_PAI: 'Monoparental — pai',
  UNIPESSOAL: 'Unipessoal',
  AMPLIADA: 'Família ampliada',
  OUTRA: 'Outra',
} as const;

export const VULNERABILIDADE = {
  VIOLENCIA_DOMESTICA: 'Violência doméstica',
  TRABALHO_INFANTIL: 'Trabalho infantil',
  USO_SUBSTANCIAS: 'Uso abusivo de substâncias',
  SITUACAO_RUA_ANTERIOR: 'Situação de rua anterior',
  DOENCA_CRONICA_GRAVE: 'Doença crônica grave',
  PCD_DOMICILIO: 'Pessoa com deficiência no domicílio',
  CUIDADOS_CONTINUOS: 'Necessidade de cuidados contínuos',
  GESTANTE: 'Gestante no domicílio',
  ADOLESCENTE_RESPONSAVEL: 'Adolescente como responsável',
  ENDIVIDAMENTO_RENDA_BASICA: 'Endividamento sobre renda básica',
  DESPEJO_EM_CURSO: 'Despejo em curso',
  AREA_DE_RISCO: 'Moradia em área de risco',
} as const;

export const NIVEL_VULNERABILIDADE = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
} as const;

export const SITUACAO_HABITACIONAL = {
  ADEQUADA: 'Adequada',
  PRECARIA_HABITAVEL: 'Precária, mas habitável',
  INADEQUADA: 'Inadequada',
} as const;

export const TIPO_MORADIA = {
  PROPRIA_QUITADA: 'Própria quitada',
  PROPRIA_FINANCIADA: 'Própria financiada',
  ALUGADA: 'Alugada',
  CEDIDA: 'Cedida',
  OCUPACAO: 'Ocupação',
  ABRIGO: 'Abrigo',
  SITUACAO_RUA: 'Situação de rua',
  OUTRO: 'Outro',
} as const;

export const TIPO_CONSTRUCAO = {
  ALVENARIA: 'Alvenaria',
  MADEIRA: 'Madeira',
  MISTA: 'Mista',
  IMPROVISADO: 'Improvisada',
  OUTRO: 'Outro',
} as const;

export const SANEAMENTO = {
  REDE_PUBLICA: 'Rede pública',
  FOSSA_SEPTICA: 'Fossa séptica',
  FOSSA_RUDIMENTAR: 'Fossa rudimentar',
  CEU_ABERTO: 'A céu aberto',
  OUTRO: 'Outro',
} as const;

export const ABASTECIMENTO_AGUA = {
  REDE_PUBLICA: 'Rede pública',
  POCO_NASCENTE: 'Poço ou nascente',
  CARRO_PIPA: 'Carro-pipa',
  SEM_ABASTECIMENTO: 'Sem abastecimento',
} as const;

export const ENERGIA_ELETRICA = {
  RELOGIO_PROPRIO: 'Relógio próprio',
  RELOGIO_COMPARTILHADO: 'Relógio compartilhado',
  LIGACAO_IRREGULAR: 'Ligação irregular',
  SEM_ENERGIA: 'Sem energia',
} as const;

export const COLETA_LIXO = {
  COLETA_REGULAR: 'Coleta regular',
  COLETA_IRREGULAR: 'Coleta irregular',
  QUEIMA_ENTERRA: 'Queima ou enterra',
  DESCARTE_IRREGULAR: 'Descarte irregular',
} as const;

export const PAVIMENTACAO = {
  ASFALTO: 'Asfalto',
  BLOQUETE: 'Bloquete',
  CASCALHO: 'Cascalho',
  TERRA: 'Terra',
} as const;

export const PARENTESCO = {
  RESPONSAVEL: 'Responsável familiar',
  CONJUGE: 'Cônjuge ou companheiro(a)',
  FILHO: 'Filho(a)',
  ENTEADO: 'Enteado(a)',
  PAI_MAE: 'Pai ou mãe',
  AVO: 'Avô ou avó',
  NETO: 'Neto(a)',
  IRMAO: 'Irmão ou irmã',
  OUTRO_PARENTE: 'Outro parente',
  NAO_PARENTE: 'Não parente',
} as const;

export const TIPO_ESCOLA = {
  PUBLICA: 'Pública',
  PRIVADA: 'Privada',
  FILANTROPICA: 'Filantrópica',
} as const;

export const TURNO_ESCOLA = {
  MATUTINO: 'Matutino',
  VESPERTINO: 'Vespertino',
  NOTURNO: 'Noturno',
  INTEGRAL: 'Integral',
} as const;

export const PERFIL_USUARIO = {
  ADMINISTRADOR: 'Administrador',
  GESTOR_HABITACAO: 'Gestor de Habitação',
  TECNICO_SOCIAL: 'Técnico social',
  ATENDENTE: 'Atendimento',
  FISCAL_OBRAS: 'Fiscal de obras',
  ANALISTA_MUTUARIO: 'Analista de mutuários',
  JURIDICO: 'Jurídico',
  FISCAL_AUDITOR: 'Controle interno',
  DEFESA_CIVIL: 'Defesa Civil',
  SETOR_PARCEIRO: 'Setor parceiro',
} as const;

export const TIPO_SETOR = {
  HABITACAO: 'Habitação',
  ASSISTENCIA_SOCIAL: 'Assistência Social',
  DEFESA_CIVIL: 'Defesa Civil',
  OBRAS: 'Obras',
  JURIDICO: 'Jurídico',
  PLANEJAMENTO_URBANO: 'Planejamento Urbano',
  MEIO_AMBIENTE: 'Meio Ambiente',
  FAZENDA: 'Fazenda',
  GABINETE: 'Gabinete',
  CONTROLE_INTERNO: 'Controle Interno',
  OUTRO: 'Outro',
} as const;

export const TIPO_SOLICITACAO = {
  LAUDO_RISCO: 'Laudo de risco',
  PARECER_JURIDICO: 'Parecer jurídico',
  VISTORIA_TECNICA: 'Vistoria técnica',
  ANALISE_PROJETO: 'Análise de projeto',
  APOIO_SOCIAL: 'Apoio social',
  OUTRO: 'Outro',
} as const;

export const ORIGEM_RECURSO = {
  FEDERAL: 'Federal',
  ESTADUAL: 'Estadual',
  MUNICIPAL: 'Municipal',
  FGTS: 'FGTS',
  FINANCIAMENTO: 'Financiamento',
  EMENDA_PARLAMENTAR: 'Emenda parlamentar',
  OUTRA: 'Outra',
} as const;

export const SITUACAO_CONVENIO = {
  EM_ELABORACAO: 'Em elaboração',
  VIGENTE: 'Vigente',
  SUSPENSO: 'Suspenso',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
} as const;

export const SITUACAO_EMPREENDIMENTO = {
  PLANEJAMENTO: 'Em planejamento',
  EM_OBRA: 'Em obra',
  CONCLUIDO: 'Concluído',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
} as const;

export const SITUACAO_OBRA = {
  NAO_INICIADA: 'Não iniciada',
  EM_EXECUCAO: 'Em execução',
  PARALISADA: 'Paralisada',
  CONCLUIDA: 'Concluída',
  RESCINDIDA: 'Rescindida',
} as const;

export const SITUACAO_MEDICAO = {
  RASCUNHO: 'Aguardando aprovação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
} as const;

export const SITUACAO_UNIDADE = {
  PLANEJADA: 'Planejada',
  EM_OBRA: 'Em obra',
  PRONTA: 'Pronta para entrega',
  ENTREGUE: 'Entregue',
  DESOCUPADA: 'Desocupada',
  EM_LITIGIO: 'Em litígio',
  RETOMADA: 'Retomada',
  CANCELADA: 'Cancelada',
} as const;

export const SITUACAO_ETAPA = {
  CONCLUIDA: 'Concluída',
  NO_PRAZO: 'No prazo',
  PROXIMA_DO_PRAZO: 'Vence em breve',
  ATRASADA: 'Atrasada',
} as const;

export const TIPO_ACOMPANHAMENTO = {
  INICIAL: 'Primeira visita',
  PERIODICA: 'Visita periódica',
  EXTRAORDINARIA: 'Visita extraordinária',
  APURACAO: 'Visita de apuração',
} as const;

export const EIXO_TRABALHO_SOCIAL = {
  MOBILIZACAO_ORGANIZACAO: 'Mobilização e organização comunitária',
  ACOMPANHAMENTO_GESTAO: 'Acompanhamento e gestão social',
  EDUCACAO_AMBIENTAL_PATRIMONIAL: 'Educação ambiental e patrimonial',
  DESENVOLVIMENTO_SOCIOECONOMICO: 'Desenvolvimento socioeconômico',
} as const;

export const SITUACAO_EIXO = {
  ADEQUADA: 'Adequada',
  ATENCAO: 'Requer atenção',
  CRITICA: 'Crítica',
  NAO_AVALIADA: 'Não avaliada',
} as const;

export const SITUACAO_ACOMPANHAMENTO = {
  SEM_ACOMPANHAMENTO: 'Sem acompanhamento',
  AGUARDANDO_PRIMEIRA: 'Aguardando primeira visita',
  EM_DIA: 'Em dia',
  VENCENDO: 'Vence em breve',
  VENCIDA: 'Visita vencida',
} as const;

export const TIPO_OCORRENCIA_USO = {
  CESSAO_TERCEIRO: 'Cessão a terceiro',
  ALUGUEL: 'Aluguel da unidade',
  VENDA_TRANSFERENCIA: 'Venda ou transferência',
  ABANDONO: 'Abandono',
  USO_COMERCIAL: 'Uso comercial',
  OBRA_IRREGULAR: 'Obra irregular',
  MUDANCA_COMPOSICAO: 'Mudança na composição familiar',
  OBITO_TITULAR: 'Óbito do titular',
  OUTRA: 'Outra',
} as const;

export const GRAVIDADE_OCORRENCIA = {
  ADMINISTRATIVA: 'Administrativa',
  LEVE: 'Leve',
  GRAVE: 'Grave',
  GRAVISSIMA: 'Gravíssima',
} as const;

export const ORIGEM_OCORRENCIA = {
  VISITA: 'Constatada em visita',
  DENUNCIA: 'Denúncia',
  OFICIO: 'De ofício',
  CRUZAMENTO_CADASTRAL: 'Cruzamento cadastral',
  OUTRA: 'Outra',
} as const;

export const SITUACAO_OCORRENCIA_USO = {
  ABERTA: 'Aberta',
  EM_APURACAO: 'Em apuração',
  NOTIFICADA: 'Notificada',
  REGULARIZADA: 'Regularizada',
  IMPROCEDENTE: 'Improcedente',
  ENCAMINHADA_JURIDICO: 'No Jurídico',
} as const;

export const FASE_RETOMADA = {
  ABERTO: 'Aberto',
  NOTIFICADO: 'Notificado',
  EM_DEFESA: 'Defesa apresentada',
  EM_ANALISE: 'Em análise',
  DECIDIDO: 'Decidido',
  ENCERRADO: 'Encerrado',
} as const;

export const FORMA_NOTIFICACAO = {
  PESSOAL: 'Pessoalmente',
  AR_CORREIO: 'AR pelos Correios',
  EDITAL: 'Por edital',
} as const;

export const DECISAO_RETOMADA = {
  REGULARIZACAO: 'Regularização',
  ACORDO: 'Acordo',
  RESCISAO: 'Rescisão',
  ARQUIVAMENTO: 'Arquivamento',
} as const;

export const SITUACAO_CONTRATO = {
  EM_ELABORACAO: 'Em elaboração',
  VIGENTE: 'Vigente',
  SUSPENSO: 'Suspenso',
  RENEGOCIADO: 'Renegociado',
  QUITADO: 'Quitado',
  RESCINDIDO: 'Rescindido',
  TRANSFERIDO: 'Transferido',
} as const;

export const SITUACAO_PARCELA = {
  ABERTA: 'Em aberto',
  PAGA: 'Paga',
  PAGA_PARCIAL: 'Paga em parte',
  VENCIDA: 'Vencida',
  RENEGOCIADA: 'Renegociada',
  ISENTA: 'Isenta',
  CANCELADA: 'Cancelada',
} as const;

export const INDICE_REAJUSTE = {
  SEM_REAJUSTE: 'Sem reajuste',
  INPC: 'INPC',
  IPCA: 'IPCA',
  TR: 'TR',
  SALARIO_MINIMO: 'Salário mínimo',
} as const;

export const FORMA_PAGAMENTO = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  TRANSFERENCIA: 'Transferência',
  DESCONTO_FOLHA: 'Desconto em folha',
  OUTRA: 'Outra',
} as const;

export const MOTIVO_TRANSFERENCIA = {
  OBITO_TITULAR: 'Óbito do titular',
  SEPARACAO_DIVORCIO: 'Separação ou divórcio',
  ABANDONO_LAR: 'Abandono do lar',
  DECISAO_JUDICIAL: 'Decisão judicial',
  OUTRO: 'Outro',
} as const;

export const FASE_INADIMPLENCIA = {
  EM_DIA: 'Em dia',
  ATRASO_RECENTE: 'Atraso recente',
  COBRANCA: 'Em cobrança',
  NOTIFICACAO: 'A notificar',
  PASSIVEL_RESCISAO: 'Passível de rescisão',
} as const;

export const rotuloSexo = rotulador(SEXO);
export const rotuloEstadoCivil = rotulador(ESTADO_CIVIL);
export const rotuloRegimeBens = rotulador(REGIME_BENS);
export const rotuloEscolaridade = rotulador(ESCOLARIDADE);
export const rotuloSituacaoTrabalho = rotulador(SITUACAO_TRABALHO);
export const rotuloTipoDeficiencia = rotulador(TIPO_DEFICIENCIA);
export const rotuloFonteRenda = rotulador(FONTE_RENDA);
export const rotuloRegimeRenda = rotulador(REGIME_RENDA);
export const rotuloBeneficio = rotulador(BENEFICIO_SOCIAL);
export const rotuloEstruturaFamiliar = rotulador(ESTRUTURA_FAMILIAR);
export const rotuloVulnerabilidade = rotulador(VULNERABILIDADE);
export const rotuloNivelVulnerabilidade = rotulador(NIVEL_VULNERABILIDADE);
export const rotuloSituacaoHabitacional = rotulador(SITUACAO_HABITACIONAL);
export const rotuloTipoMoradia = rotulador(TIPO_MORADIA);
export const rotuloTipoConstrucao = rotulador(TIPO_CONSTRUCAO);
export const rotuloSaneamento = rotulador(SANEAMENTO);
export const rotuloAbastecimentoAgua = rotulador(ABASTECIMENTO_AGUA);
export const rotuloEnergiaEletrica = rotulador(ENERGIA_ELETRICA);
export const rotuloColetaLixo = rotulador(COLETA_LIXO);
export const rotuloPavimentacao = rotulador(PAVIMENTACAO);
export const rotuloParentesco = rotulador(PARENTESCO);
export const rotuloTipoEscola = rotulador(TIPO_ESCOLA);
export const rotuloTurnoEscola = rotulador(TURNO_ESCOLA);
export const rotuloPerfil = rotulador(PERFIL_USUARIO);
export const rotuloTipoSetor = rotulador(TIPO_SETOR);
export const rotuloTipoSolicitacao = rotulador(TIPO_SOLICITACAO);
export const rotuloOrigemRecurso = rotulador(ORIGEM_RECURSO);
export const rotuloSituacaoConvenio = rotulador(SITUACAO_CONVENIO);
export const rotuloSituacaoEmpreendimento = rotulador(SITUACAO_EMPREENDIMENTO);
export const rotuloSituacaoObra = rotulador(SITUACAO_OBRA);
export const rotuloSituacaoMedicao = rotulador(SITUACAO_MEDICAO);
export const rotuloSituacaoUnidade = rotulador(SITUACAO_UNIDADE);
export const rotuloSituacaoEtapa = rotulador(SITUACAO_ETAPA);
export const rotuloTipoAcompanhamento = rotulador(TIPO_ACOMPANHAMENTO);
export const rotuloEixo = rotulador(EIXO_TRABALHO_SOCIAL);
export const rotuloSituacaoEixo = rotulador(SITUACAO_EIXO);
export const rotuloSituacaoAcompanhamento = rotulador(SITUACAO_ACOMPANHAMENTO);
export const rotuloTipoOcorrencia = rotulador(TIPO_OCORRENCIA_USO);
export const rotuloGravidade = rotulador(GRAVIDADE_OCORRENCIA);
export const rotuloOrigemOcorrencia = rotulador(ORIGEM_OCORRENCIA);
export const rotuloSituacaoOcorrencia = rotulador(SITUACAO_OCORRENCIA_USO);
export const rotuloFaseRetomada = rotulador(FASE_RETOMADA);
export const rotuloFormaNotificacao = rotulador(FORMA_NOTIFICACAO);
export const rotuloDecisaoRetomada = rotulador(DECISAO_RETOMADA);
export const rotuloSituacaoContrato = rotulador(SITUACAO_CONTRATO);
export const rotuloSituacaoParcela = rotulador(SITUACAO_PARCELA);
export const rotuloIndiceReajuste = rotulador(INDICE_REAJUSTE);
export const rotuloFormaPagamento = rotulador(FORMA_PAGAMENTO);
export const rotuloMotivoTransferencia = rotulador(MOTIVO_TRANSFERENCIA);
export const rotuloFaseInadimplencia = rotulador(FASE_INADIMPLENCIA);





/** Converte o mapa em opções de `<select>`, na ordem em que foi declarado. */
export function opcoes(mapa: Record<string, string>): { valor: string; rotulo: string }[] {
  return Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }));
}
