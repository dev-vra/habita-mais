import { Injectable, Logger } from '@nestjs/common';
import { AuditOperation } from '@prisma/client';
import { br } from '@habita/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { HubClient } from './hub.client';

export interface DadosCpf {
  cpf: string;
  nome: string;
  situacaoCadastral: string;
  dataNascimento: string;
}

/** Campos do endpoint `cpf` do Hub. */
interface HubCpf {
  nome_da_pf?: string;
  situacao_cadastral?: string;
  data_nascimento?: string;
}

/**
 * Gateway de CPF (camada anticorrupção). Provedor: Hub do Desenvolvedor, a mesma escolha do
 * Regulariza+ — dois produtos, um contrato de integração.
 *
 * Toda consulta é auditada AQUI, antes de devolver o dado: consultar CPF de munícipe é acesso a
 * dado pessoal sob a LGPD, e deixar a auditoria a cargo de quem chama significa que um dia alguém
 * esquece. O CPF entra na trilha mascarado.
 */
@Injectable()
export class CpfGateway {
  private readonly logger = new Logger(CpfGateway.name);
  private static readonly TIMEOUT_MS = 20_000;

  constructor(
    private readonly hub: HubClient,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Situação cadastral do CPF na Receita. `dataNascimento` (dd/mm/aaaa) refina a busca quando o
   * provedor exige. Devolve null para inválido, não encontrado ou indisponível — a tela continua
   * aceitando digitação manual, porque cadastro não pode parar por indisponibilidade de terceiro.
   */
  async consultar(cpfBruto: string, dataNascimento?: string): Promise<DadosCpf | null> {
    const cpf = br.onlyDigits(cpfBruto);
    if (!br.isValidCpf(cpf)) return null;

    await this.audit.log(this.prisma.tx, {
      operation: AuditOperation.READ,
      entity: 'ConsultaCpf',
      entityId: br.mascararCpfParcial(cpf),
      diff: { finalidade: 'conferência cadastral no atendimento' },
    });

    const params: Record<string, string> = { cpf };
    if (dataNascimento) params.data = dataNascimento;

    const resposta = await this.hub.consultar<HubCpf>('cpf', params, CpfGateway.TIMEOUT_MS);
    if (!resposta.ok) return null;

    return {
      cpf,
      nome: resposta.result.nome_da_pf ?? '',
      situacaoCadastral: resposta.result.situacao_cadastral ?? '',
      dataNascimento: resposta.result.data_nascimento ?? '',
    };
  }
}
