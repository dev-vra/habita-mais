import { Controller, Get, Module, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { br } from '@habita/shared';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { CepGateway } from './cep.gateway';
import { CpfGateway } from './cpf.gateway';
import { HubClient } from './hub.client';

/** Consulta a provedor externo é paga e auditada: teto apertado, bem abaixo do global. */
const LIMITE_CONSULTAS = { default: { limit: 30, ttl: 60_000 } };

@Controller('integracoes')
export class IntegracoesController {
  constructor(
    private readonly cpf: CpfGateway,
    private readonly cep: CepGateway,
    private readonly hub: HubClient,
  ) {}

  /**
   * Situação cadastral do CPF.
   *
   * Responde sempre 200, com `encontrado: false` quando não achou — do ponto de vista do balcão,
   * "não encontrei" não é erro: é informação, e o atendente segue digitando à mão.
   */
  @RequerCapacidade('CADASTRAR_FAMILIA', 'EDITAR_FICHA_SOCIAL', 'INSCREVER_FAMILIA')
  @Throttle(LIMITE_CONSULTAS)
  @Get('cpf/:cpf')
  async consultarCpf(@Param('cpf') cpf: string, @Query('nascimento') nascimento?: string) {
    if (!br.isValidCpf(cpf)) {
      return { encontrado: false, motivo: 'cpf_invalido' as const, configurado: this.hub.configurado };
    }

    const dados = await this.cpf.consultar(cpf, nascimento);
    return dados
      ? { encontrado: true, dados }
      : {
          encontrado: false,
          motivo: this.hub.configurado ? ('nao_encontrado' as const) : ('sem_integracao' as const),
          configurado: this.hub.configurado,
        };
  }

  @RequerCapacidade('CADASTRAR_FAMILIA', 'EDITAR_FICHA_SOCIAL', 'INSCREVER_FAMILIA')
  @Throttle(LIMITE_CONSULTAS)
  @Get('cep/:cep')
  async consultarCep(@Param('cep') cep: string) {
    const endereco = await this.cep.consultar(cep);
    return endereco ? { encontrado: true, dados: endereco } : { encontrado: false };
  }

  /** A interface usa isto para não oferecer um botão de busca que não funcionaria. */
  @Get('situacao')
  situacao() {
    return { hubConfigurado: this.hub.configurado };
  }
}

@Module({
  controllers: [IntegracoesController],
  providers: [HubClient, CpfGateway, CepGateway],
  exports: [CpfGateway, CepGateway],
})
export class IntegracoesModule {}
