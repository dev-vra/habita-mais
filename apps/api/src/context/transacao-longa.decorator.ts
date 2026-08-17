import { SetMetadata } from '@nestjs/common';

export const TRANSACAO_LONGA = 'transacaoLonga';

/**
 * Estende o teto da transação da rota.
 *
 * Existe por uma rota só: a que fala com o modelo de IA. A chamada leva segundos, e o teto padrão
 * de 5s do Prisma derrubava a gravação DEPOIS de o modelo já ter respondido — a prefeitura pagava
 * a chamada e não recebia o texto.
 *
 * É paliativo consciente: segurar conexão do pool enquanto se espera rede externa não é bom
 * desenho. O certo é a chamada acontecer fora do caminho transacional, e isso pede reorganizar o
 * interceptor. Enquanto não vem, o teto maior fica restrito às rotas que precisam — e visível no
 * controller, onde alguém tropeça nele.
 */
export const TransacaoLonga = (ms: number) => SetMetadata(TRANSACAO_LONGA, ms);
