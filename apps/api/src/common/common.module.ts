import { Global, Module } from '@nestjs/common';
import { GeradorProtocoloAdapter } from './gerador-protocolo.adapter';
import { GERADOR_PROTOCOLO, TRILHA_AUDITORIA } from './ports';
import { TrilhaAuditoriaAdapter } from './trilha-auditoria.adapter';

/** Trilha e numeração são infraestrutura de todo módulo de domínio. */
@Global()
@Module({
  providers: [
    { provide: TRILHA_AUDITORIA, useClass: TrilhaAuditoriaAdapter },
    { provide: GERADOR_PROTOCOLO, useClass: GeradorProtocoloAdapter },
  ],
  exports: [TRILHA_AUDITORIA, GERADOR_PROTOCOLO],
})
export class CommonModule {}
