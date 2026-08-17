// Política de uso de IA no Habita+.
//
// A regra é uma só: **a IA propõe, a pessoa assina, e o sistema registra quem assinou.**
//
// Um número que muda a vida de uma família não pode sair de um modelo que ninguém consegue
// reproduzir dois anos depois, na auditoria. Por isso a lista de usos permitidos é fechada e mora
// aqui — no domínio, junto das outras regras — e não na configuração de quem hospeda o sistema.
// Ligar um uso novo é mudança de código, revisada, e não um campo que alguém marca no painel.

export const USOS_IA = [
  'RASCUNHO_PARECER_VISITA',
  'RASCUNHO_PARECER_SOCIAL',
  'RASCUNHO_FUNDAMENTACAO_RECURSO',
  'RESUMO_ENCAMINHAMENTO',
  'EXTRACAO_DOCUMENTO',
] as const;

export type UsoIA = (typeof USOS_IA)[number];

/**
 * Onde a IA NUNCA entra. Existe como lista escrita, e não como ausência, porque ausência não se
 * revisa: alguém, um dia, vai propor "só uma sugestãozinha de pontuação" — e a resposta precisa
 * estar no código, não na memória de quem estava na reunião.
 */
export const USOS_PROIBIDOS = [
  'Calcular ou sugerir pontuação',
  'Ordenar ou reordenar a fila',
  'Decidir contemplação',
  'Decidir corte ou concessão de benefício',
  'Decidir retomada de unidade',
  'Julgar recurso',
  'Aprovar medição de obra',
] as const;

export interface DescricaoUso {
  rotulo: string;
  /** O que o modelo produz. Sempre um rascunho para alguém editar. */
  produz: string;
  /** Quem revisa antes de virar ato. */
  revisadoPor: string;
}

export const DESCRICAO_USOS: Readonly<Record<UsoIA, DescricaoUso>> = {
  RASCUNHO_PARECER_VISITA: {
    rotulo: 'Rascunho do parecer da visita',
    produz: 'Texto do parecer a partir do que foi marcado nos eixos e no roteiro da visita.',
    revisadoPor: 'Técnico social que visitou',
  },
  RASCUNHO_PARECER_SOCIAL: {
    rotulo: 'Rascunho do parecer social da ficha',
    produz: 'Síntese da situação da família a partir dos dados já cadastrados.',
    revisadoPor: 'Técnico social',
  },
  RASCUNHO_FUNDAMENTACAO_RECURSO: {
    rotulo: 'Rascunho da fundamentação do recurso',
    produz: 'Texto que cita os itens da pontuação e o que o recorrente alegou.',
    revisadoPor: 'Gestor que julga',
  },
  RESUMO_ENCAMINHAMENTO: {
    rotulo: 'Resumo para o encaminhamento',
    produz: 'Resumo do caso para o setor que vai receber.',
    revisadoPor: 'Quem encaminha',
  },
  EXTRACAO_DOCUMENTO: {
    rotulo: 'Extração de dados do documento',
    produz: 'Campos lidos do documento anexado, para conferência antes de gravar.',
    revisadoPor: 'Quem confere a documentação',
  },
};

export const DESFECHOS_SUGESTAO = ['PROPOSTA', 'ACEITA', 'EDITADA', 'REJEITADA'] as const;
export type DesfechoSugestao = (typeof DESFECHOS_SUGESTAO)[number];

/**
 * O que sai do produto rumo ao modelo passa por aqui.
 *
 * Mandar ficha social para um serviço externo é tratamento de dado pessoal (LGPD art. 5º, X). O
 * texto que sai daqui não leva CPF, NIS, telefone nem endereço — nada disso melhora um rascunho de
 * parecer, e todos aumentam o estrago se o dado vazar do outro lado.
 */
export function mascararParaEnvio(texto: string): string {
  return texto
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[CNPJ]')
    .replace(/\b\d{11}\b/g, '[DOCUMENTO]')
    .replace(/\b\d{5}-?\d{3}\b/g, '[CEP]')
    .replace(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[TELEFONE]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]');
}

/** Conectivos não viram inicial: "Marlene Aparecida dos Santos" é M.A.S., não M.A.D.S. */
const CONECTIVOS_NOME = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Nome próprio vira iniciais: o rascunho fala de "M.A.S." e quem revisa sabe de quem se trata,
 * porque está olhando a ficha. O modelo não precisa saber.
 */
export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 1 && !CONECTIVOS_NOME.has(parte.toLowerCase()))
    .map((parte) => `${parte[0]?.toUpperCase()}.`)
    .join('');
}

export interface AvisoDeUso {
  titulo: string;
  texto: string;
}

/** O aviso que acompanha toda sugestão na tela. Mesma frase em todo lugar, de propósito. */
export const AVISO_PADRAO: AvisoDeUso = {
  titulo: 'Rascunho gerado por IA',
  texto:
    'Leia e edite antes de salvar. O texto é uma proposta: quem responde pelo conteúdo é quem assina.',
};
