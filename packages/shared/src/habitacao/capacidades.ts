// Perfis e matriz de capacidades (spec §5). Fonte única, consumida pelo guard da API e pela UI.
//
// Duas ideias diferentes convivem aqui:
//  • Perfil é o cargo — dá o conjunto ordinário de ações do dia a dia.
//  • Capacidade sensível NÃO vem do cargo. É concedida por prefeitura, usuário a usuário, e é o
//    que torna a segregação de funções demonstrável para o controle externo (spec §5, §9).
// Por isso `CAPACIDADES_SENSIVEIS` é subtraída da matriz padrão mesmo quando o perfil pareceria
// autorizá-la: sem concessão explícita no banco, o guard nega.

export const PERFIS_TENANT = [
  'ADMINISTRADOR',
  'GESTOR_HABITACAO',
  'TECNICO_SOCIAL',
  'ATENDENTE',
  'FISCAL_OBRAS',
  'ANALISTA_MUTUARIO',
  'JURIDICO',
  'FISCAL_AUDITOR',
  // Setores externos: entram pelo encaminhamento e não alcançam fila nem ficha social.
  'DEFESA_CIVIL',
  'SETOR_PARCEIRO',
] as const;

export type PerfilTenant = (typeof PERFIS_TENANT)[number];

export const CAPACIDADES = [
  /**
   * Leitura do módulo de Habitação (famílias, fila, programas, painel).
   *
   * Existe para que a porta não abra para quem não é da Habitação. A RLS já devolveria lista
   * vazia ao setor externo, mas "200 com nada dentro" é resposta que confunde e que um dia
   * alguém interpreta como bug e "conserta" afrouxando o escopo.
   */
  'ACESSAR_HABITACAO',
  // Administração do município
  'GERIR_USUARIOS',
  'GERIR_CAPACIDADES',
  'GERIR_PARAMETROS',
  'GERIR_INTEGRACAO_REURB',
  'LER_AUDITORIA',
  // Famílias e ficha social
  'CADASTRAR_FAMILIA',
  'EDITAR_FICHA_SOCIAL',
  'REGISTRAR_VISITA_DOMICILIAR',
  'VER_PARECER_SOCIAL',
  'CONSULTAR_REURB',
  // Fila
  'INSCREVER_FAMILIA',
  'VALIDAR_DOCUMENTACAO',
  'GERIR_PROGRAMA',
  'PUBLICAR_CRITERIO',
  'RECALCULAR_PONTUACAO',
  'RECALCULAR_PONTUACAO_LOTE',
  'PUBLICAR_RANKING',
  'EMITIR_CONVOCACAO',
  'CONVOCAR_FORA_DE_ORDEM',
  'DECLARAR_CONTEMPLACAO',
  'JULGAR_RECURSO',
  // Produção habitacional
  'GERIR_CONVENIO',
  'GERIR_OBRA',
  'REGISTRAR_MEDICAO',
  'ENTREGAR_UNIDADE',
  // Mutuários
  'GERIR_CONTRATO',
  'BAIXAR_PAGAMENTO',
  'VER_DADO_FINANCEIRO',
  'RENEGOCIAR_CONTRATO',
  'TRANSFERIR_TITULARIDADE',
  // Aluguel social
  'ABRIR_PEDIDO_AUXILIO',
  'TRIAR_AUXILIO',
  'CONCEDER_AUXILIO',
  'RENOVAR_AUXILIO',
  'CORTAR_AUXILIO',
  // Tramitação entre setores
  'ENCAMINHAR_SETOR',
  'RESPONDER_ENCAMINHAMENTO',
  'EMITIR_LAUDO_RISCO',
  // Pós-entrega
  'ACOMPANHAR_POS_ENTREGA',
  /**
   * Decidir o rumo de uma ocorrência de uso: notificar, encerrar ou encaminhar ao Jurídico.
   *
   * Separada de REGISTRAR_OCORRENCIA de propósito — quem constata em campo não decide sozinho o
   * que acontece com a moradia da família. É a mesma segregação que vale entre medir e aprovar
   * medição.
   */
  'DECIDIR_OCORRENCIA',
  // Jurídico e fiscalização
  'EMITIR_PARECER_JURIDICO',
  'REGISTRAR_OCORRENCIA',
  'REGISTRAR_VISTORIA',
] as const;

export type Capacidade = (typeof CAPACIDADES)[number];

/**
 * Ações que a spec §5 exige que sejam concedidas explicitamente, nunca implícitas no cargo.
 * Cada uma delas move um bem de alto valor ou desfaz uma decisão publicada.
 */
export const CAPACIDADES_SENSIVEIS: readonly Capacidade[] = [
  'RECALCULAR_PONTUACAO_LOTE',
  'CONVOCAR_FORA_DE_ORDEM',
  'CORTAR_AUXILIO',
  'TRANSFERIR_TITULARIDADE',
];

/**
 * Capacidades ordinárias por perfil.
 *
 * O ADMINISTRADOR configura o município e lê a trilha, mas não opera a fila nem o contrato: a
 * §5 não lhe impõe limite explícito, e a escolha de manter a segregação vale ser confirmada com
 * o dono do produto — um município pequeno pode precisar do administrador operando o balcão.
 */
const MATRIZ_PADRAO: Readonly<Record<PerfilTenant, readonly Capacidade[]>> = {
  ADMINISTRADOR: [
    'ACESSAR_HABITACAO',
    'GERIR_USUARIOS',
    'GERIR_CAPACIDADES',
    'GERIR_PARAMETROS',
    'GERIR_INTEGRACAO_REURB',
    'LER_AUDITORIA',
  ],
  GESTOR_HABITACAO: [
    'ACESSAR_HABITACAO',
    'GERIR_PROGRAMA',
    'PUBLICAR_CRITERIO',
    'RECALCULAR_PONTUACAO',
    'PUBLICAR_RANKING',
    'EMITIR_CONVOCACAO',
    'DECLARAR_CONTEMPLACAO',
    'JULGAR_RECURSO',
    'VER_PARECER_SOCIAL',
    'CONSULTAR_REURB',
    'GERIR_CONVENIO',
    'GERIR_OBRA',
    'DECIDIR_OCORRENCIA',
    'ENCAMINHAR_SETOR',
    'LER_AUDITORIA',
  ],
  TECNICO_SOCIAL: [
    'ACESSAR_HABITACAO',
    'CADASTRAR_FAMILIA',
    'EDITAR_FICHA_SOCIAL',
    'REGISTRAR_VISITA_DOMICILIAR',
    'VER_PARECER_SOCIAL',
    'CONSULTAR_REURB',
    'TRIAR_AUXILIO',
    'RENOVAR_AUXILIO',
    'ACOMPANHAR_POS_ENTREGA',
    'REGISTRAR_OCORRENCIA',
    'ENCAMINHAR_SETOR',
  ],
  ATENDENTE: [
    'ACESSAR_HABITACAO',
    'CADASTRAR_FAMILIA',
    'INSCREVER_FAMILIA',
    'VALIDAR_DOCUMENTACAO',
    'ABRIR_PEDIDO_AUXILIO',
    'CONSULTAR_REURB',
    'ENCAMINHAR_SETOR',
  ],
  FISCAL_OBRAS: [
    'ACESSAR_HABITACAO',
    'GERIR_OBRA',
    'REGISTRAR_MEDICAO',
    'ENTREGAR_UNIDADE',
    'REGISTRAR_OCORRENCIA',
    'RESPONDER_ENCAMINHAMENTO',
  ],
  ANALISTA_MUTUARIO: [
    'ACESSAR_HABITACAO',
    'GERIR_CONTRATO',
    'BAIXAR_PAGAMENTO',
    'VER_DADO_FINANCEIRO',
    'RENEGOCIAR_CONTRATO',
  ],
  JURIDICO: [
    'ACESSAR_HABITACAO',
    'EMITIR_PARECER_JURIDICO',
    'DECIDIR_OCORRENCIA',
    'JULGAR_RECURSO',
    'VER_PARECER_SOCIAL',
    'RESPONDER_ENCAMINHAMENTO',
    'LER_AUDITORIA',
  ],
  // Auditor lê tudo e não escreve nada — inclusive o financeiro, que é onde a prestação de
  // contas do convênio precisa fechar (spec §8).
  FISCAL_AUDITOR: ['ACESSAR_HABITACAO', 'LER_AUDITORIA', 'VER_PARECER_SOCIAL', 'VER_DADO_FINANCEIRO'],
  // Defesa Civil responde encaminhamento e emite laudo — nada além. O laudo é a evidência que
  // sustenta a prioridade de risco na fila, e é por isso que ele nasce fora da Habitação.
  DEFESA_CIVIL: ['RESPONDER_ENCAMINHAMENTO', 'EMITIR_LAUDO_RISCO', 'REGISTRAR_VISTORIA'],
  SETOR_PARCEIRO: ['RESPONDER_ENCAMINHAMENTO'],
};

export interface SobrescritaCapacidades {
  concedidas?: readonly Capacidade[];
  revogadas?: readonly Capacidade[];
}

export function isCapacidadeSensivel(capacidade: Capacidade): boolean {
  return CAPACIDADES_SENSIVEIS.includes(capacidade);
}

export function capacidadesPadrao(perfil: PerfilTenant): readonly Capacidade[] {
  return MATRIZ_PADRAO[perfil];
}

/**
 * Capacidades efetivas do usuário: matriz do perfil menos as sensíveis, mais as concedidas
 * explicitamente pela prefeitura, menos as revogadas. Revogação vence concessão — desligar
 * um acesso precisa ser sempre a operação mais forte.
 */
export function resolverCapacidades(
  perfil: PerfilTenant,
  sobrescrita: SobrescritaCapacidades = {},
): Set<Capacidade> {
  const efetivas = new Set<Capacidade>(
    capacidadesPadrao(perfil).filter((capacidade) => !isCapacidadeSensivel(capacidade)),
  );

  for (const capacidade of sobrescrita.concedidas ?? []) {
    efetivas.add(capacidade);
  }
  for (const capacidade of sobrescrita.revogadas ?? []) {
    efetivas.delete(capacidade);
  }

  return efetivas;
}

export function temCapacidade(
  perfil: PerfilTenant,
  capacidade: Capacidade,
  sobrescrita: SobrescritaCapacidades = {},
): boolean {
  return resolverCapacidades(perfil, sobrescrita).has(capacidade);
}
