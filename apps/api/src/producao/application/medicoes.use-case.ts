import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { habitacao } from '@habita/shared';
import { actorId, getActiveContext } from '../../context/request-context';
import {
  GERADOR_PROTOCOLO,
  TRILHA_AUDITORIA,
  type GeradorProtocolo,
  type TrilhaAuditoria,
} from '../../common/ports';
import { PRODUCAO_REPOSITORY, type DadosMedicao, type ProducaoRepository } from '../domain/ports';

/**
 * Medição de obra.
 *
 * Medição é ordem de pagamento com outro nome, e por isso nasce em RASCUNHO com protocolo próprio:
 * o número existe desde o primeiro rascunho para que uma medição rejeitada continue tendo história.
 * Aprovada, não se edita — para mudar, cancela-se com motivo e faz-se outra.
 */
@Injectable()
export class MedicoesUseCase {
  constructor(
    @Inject(PRODUCAO_REPOSITORY) private readonly producao: ProducaoRepository,
    @Inject(TRILHA_AUDITORIA) private readonly trilha: TrilhaAuditoria,
    @Inject(GERADOR_PROTOCOLO) private readonly protocolo: GeradorProtocolo,
  ) {}

  async criar(
    obraId: string,
    dados: Omit<DadosMedicao, 'obraId'>,
  ): Promise<{ id: string; protocolo: string; numero: number }> {
    const estado = await this.producao.estadoParaMedicao(obraId);
    if (!estado) throw new NotFoundException('Obra não encontrada.');

    if (estado.situacao === 'RESCINDIDA' || estado.situacao === 'CONCLUIDA') {
      throw new BadRequestException(
        `Obra ${estado.situacao.toLowerCase()} não recebe medição nova.`,
      );
    }
    if (dados.periodoFim < dados.periodoInicio) {
      throw new BadRequestException('O período da medição termina antes de começar.');
    }

    const impedimentos = habitacao.impedimentosDaMedicao({
      proposta: { percentualAcumulado: dados.percentualAcumulado, valor: dados.valor },
      percentualAcumuladoAnterior: estado.percentualAcumuladoAnterior,
      valorMedidoAcumulado: estado.valorMedidoAcumulado,
      valorContrato: estado.valorContrato,
      percentualFisicoDasEtapas: habitacao.avancoFisico(estado.etapas),
    });

    if (impedimentos.length > 0) {
      throw new BadRequestException(impedimentos.map((item) => item.mensagem));
    }

    const protocolo = await this.protocolo.proximo('MED', new Date().getFullYear());
    const medicao = await this.producao.criarMedicao(protocolo, estado.proximoNumero, {
      ...dados,
      obraId,
    });

    await this.trilha.registrar({
      operacao: 'INSERT',
      entidade: 'Medicao',
      entidadeId: medicao.id,
      diff: {
        protocolo,
        numero: estado.proximoNumero,
        obraId,
        percentualAcumulado: dados.percentualAcumulado,
        valor: dados.valor,
        fiscalNome: dados.fiscalNome,
      },
    });

    return { id: medicao.id, protocolo, numero: estado.proximoNumero };
  }

  /**
   * Aprovar é o ato que libera pagamento. Revalida os impedimentos no momento da aprovação porque
   * o cronograma pode ter mudado desde o rascunho — e o que valia na quinta pode não valer na
   * segunda.
   */
  async aprovar(medicaoId: string): Promise<void> {
    const medicao = await this.producao.medicao(medicaoId);
    if (!medicao) throw new NotFoundException('Medição não encontrada.');
    if (medicao.situacao !== 'RASCUNHO') {
      throw new BadRequestException(`Medição ${medicao.situacao.toLowerCase()} não pode ser aprovada.`);
    }

    const estado = await this.producao.estadoParaMedicao(medicao.obraId);
    if (!estado) throw new NotFoundException('Obra não encontrada.');

    const impedimentos = habitacao.impedimentosDaMedicao({
      proposta: { percentualAcumulado: medicao.percentualAcumulado, valor: medicao.valor },
      percentualAcumuladoAnterior: estado.percentualAcumuladoAnterior,
      valorMedidoAcumulado: estado.valorMedidoAcumulado,
      valorContrato: estado.valorContrato,
      percentualFisicoDasEtapas: habitacao.avancoFisico(estado.etapas),
    });

    if (impedimentos.length > 0) {
      throw new BadRequestException(impedimentos.map((item) => item.mensagem));
    }

    const ctx = getActiveContext();
    await this.producao.aprovarMedicao(medicaoId, ctx.userNome ?? actorId());

    // O acumulado da obra é materializado: a lista de obras não pode somar medições a cada leitura.
    const somas = await this.producao.somarMedicoesAprovadas(medicao.obraId);
    await this.producao.registrarAcumuladoDaObra(medicao.obraId, somas.valor);

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Medicao',
      entidadeId: medicaoId,
      diff: {
        situacao: 'APROVADA',
        valor: medicao.valor,
        percentualAcumulado: medicao.percentualAcumulado,
        valorMedidoObra: somas.valor,
      },
    });
  }

  async encerrar(
    medicaoId: string,
    situacao: 'REJEITADA' | 'CANCELADA',
    motivo: string,
  ): Promise<void> {
    const medicao = await this.producao.medicao(medicaoId);
    if (!medicao) throw new NotFoundException('Medição não encontrada.');

    if (situacao === 'REJEITADA' && medicao.situacao !== 'RASCUNHO') {
      throw new BadRequestException('Só medição em rascunho pode ser rejeitada. Aprovada, cancele.');
    }
    if (situacao === 'CANCELADA' && medicao.situacao === 'CANCELADA') {
      throw new BadRequestException('Esta medição já está cancelada.');
    }

    await this.producao.encerrarMedicao(medicaoId, situacao, motivo);

    // Cancelar medição aprovada devolve o valor ao saldo: sem isso a obra continuaria "paga" no
    // relatório mesmo depois de a prefeitura desfazer o ato.
    if (medicao.situacao === 'APROVADA') {
      const somas = await this.producao.somarMedicoesAprovadas(medicao.obraId);
      await this.producao.registrarAcumuladoDaObra(medicao.obraId, somas.valor);
    }

    await this.trilha.registrar({
      operacao: 'UPDATE',
      entidade: 'Medicao',
      entidadeId: medicaoId,
      diff: { situacao, motivo, situacaoAnterior: medicao.situacao },
    });
  }
}
