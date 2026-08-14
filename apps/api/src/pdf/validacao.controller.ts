import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { lerComprovante } from './validacao';

@Controller('validacao')
export class ValidacaoController {
  /**
   * Conferência pública. Sem sessão e sem banco: a assinatura do comprovante é a prova, e o
   * conteúdo devolvido é o mesmo que está impresso — nada além.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':token')
  validar(@Param('token') token: string) {
    const comprovante = lerComprovante(token);
    if (!comprovante) {
      throw new NotFoundException('Documento não confere. Verifique o código com a prefeitura.');
    }

    return { autentico: true, documento: comprovante };
  }
}
