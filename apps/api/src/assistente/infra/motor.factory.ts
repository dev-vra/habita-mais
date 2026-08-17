import type { Provider } from '@nestjs/common';
import { MOTOR_IA, type MotorIA } from '../domain/ports';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';

/**
 * Escolhe o motor pela chave que a prefeitura configurou.
 *
 * O produto não tem opinião sobre fornecedor: quem decide é quem paga a conta e quem responde pelo
 * tratamento do dado. Sem nenhuma chave, devolve um motor que diz educadamente que não está
 * disponível — nada quebra, só o atalho do rascunho some.
 */
export const motorIaProvider: Provider = {
  provide: MOTOR_IA,
  useFactory: (): MotorIA => {
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return new GeminiAdapter();
    return new AnthropicAdapter();
  },
};
