// Ports do assistente. O domínio pede "rascunhe isto"; quem sabe falar com um modelo é o infra.

export const MOTOR_IA = Symbol('MotorIA');

export interface PedidoAoModelo {
  /** Instrução de sistema: o papel, o tom e os limites. */
  papel: string;
  /** O conteúdo já mascarado — nenhum identificador chega aqui. */
  conteudo: string;
  /** Imagem ou PDF em base64, para leitura de documento. */
  documento?: { midia: string; dados: string };
  /** Teto de tamanho da resposta. Parecer não é tese. */
  maximoTokens?: number;
  /** Modelo específico para este pedido. Tarefa mecânica não precisa do modelo mais caro. */
  modelo?: string;
}

export interface RespostaDoModelo {
  texto: string;
  modelo: string;
}

/**
 * Motor de linguagem. A interface é estreita de propósito: uma função que recebe texto e devolve
 * texto. Nada que o produto faça depende de qual modelo está atrás — trocar de fornecedor é
 * trocar o adaptador, e o domínio não fica sabendo.
 */
export interface MotorIA {
  disponivel(): boolean;
  gerar(pedido: PedidoAoModelo): Promise<RespostaDoModelo>;
}
