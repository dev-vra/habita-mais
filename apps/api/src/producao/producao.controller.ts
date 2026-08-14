import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { MedicoesUseCase } from './application/medicoes.use-case';
import { ProducaoUseCase } from './application/producao.use-case';
import { UnidadesUseCase } from './application/unidades.use-case';
import {
  CriarConvenioDto,
  CriarEmpreendimentoDto,
  CriarMedicaoDto,
  CriarObraDto,
  CriarUnidadeDto,
  DefinirEtapasDto,
  EncerrarMedicaoDto,
  ExecucaoEtapaDto,
  GerarUnidadesDto,
  MoverUnidadeDto,
  SituacaoObraDto,
} from './dto/producao.dto';
import { ProducaoQueryService } from './infra/producao.query-service';

/**
 * Produção habitacional. Controller fino: quem decide é o caso de uso.
 *
 * A separação de capacidades segue quem responde pelo ato: obra e convênio são do gestor,
 * medição é do fiscal, entrega de unidade é ato próprio — quem mede não entrega sozinho.
 */
@Controller('producao')
export class ProducaoController {
  constructor(
    private readonly consulta: ProducaoQueryService,
    private readonly producao: ProducaoUseCase,
    private readonly medicoes: MedicoesUseCase,
    private readonly unidades: UnidadesUseCase,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('convenios')
  listarConvenios() {
    return this.consulta.listarConvenios();
  }

  @RequerCapacidade('GERIR_CONVENIO')
  @Post('convenios')
  criarConvenio(@Body() dto: CriarConvenioDto) {
    return this.producao.criarConvenio({
      ...dto,
      valorContrapartida: dto.valorContrapartida ?? 0,
    });
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('empreendimentos')
  listarEmpreendimentos() {
    return this.consulta.listarEmpreendimentos();
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('empreendimentos/:slug')
  detalhe(@Param('slug') slug: string) {
    return this.consulta.detalheEmpreendimento(slug);
  }

  @RequerCapacidade('GERIR_OBRA')
  @Post('empreendimentos')
  criarEmpreendimento(@Body() dto: CriarEmpreendimentoDto) {
    return this.producao.criarEmpreendimento(dto);
  }

  @RequerCapacidade('GERIR_OBRA')
  @Post('obras')
  criarObra(@Body() dto: CriarObraDto) {
    return this.producao.criarObra(dto);
  }

  @RequerCapacidade('GERIR_OBRA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('obras/:obraId/etapas')
  definirEtapas(@Param('obraId') obraId: string, @Body() dto: DefinirEtapasDto) {
    return this.producao.definirEtapas(obraId, dto.etapas);
  }

  @RequerCapacidade('REGISTRAR_MEDICAO')
  @Patch('etapas/:etapaId')
  registrarExecucao(@Param('etapaId') etapaId: string, @Body() dto: ExecucaoEtapaDto) {
    return this.producao.registrarExecucao(etapaId, dto.executado);
  }

  @RequerCapacidade('GERIR_OBRA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('obras/:obraId/situacao')
  situacaoObra(@Param('obraId') obraId: string, @Body() dto: SituacaoObraDto) {
    return this.producao.definirSituacaoObra(obraId, dto.situacao, dto.motivo);
  }

  @RequerCapacidade('REGISTRAR_MEDICAO')
  @Post('obras/:obraId/medicoes')
  criarMedicao(@Param('obraId') obraId: string, @Body() dto: CriarMedicaoDto) {
    return this.medicoes.criar(obraId, dto);
  }

  // Aprovar medição libera pagamento: fica com quem responde pela obra, não com quem mediu.
  @RequerCapacidade('GERIR_OBRA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('medicoes/:medicaoId/aprovar')
  aprovarMedicao(@Param('medicaoId') medicaoId: string) {
    return this.medicoes.aprovar(medicaoId);
  }

  @RequerCapacidade('GERIR_OBRA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('medicoes/:medicaoId/encerrar')
  encerrarMedicao(@Param('medicaoId') medicaoId: string, @Body() dto: EncerrarMedicaoDto) {
    return this.medicoes.encerrar(medicaoId, dto.situacao, dto.motivo);
  }

  @RequerCapacidade('GERIR_OBRA')
  @Post('unidades')
  criarUnidade(@Body() dto: CriarUnidadeDto) {
    return this.unidades.criar(dto);
  }

  @RequerCapacidade('GERIR_OBRA')
  @Post('empreendimentos/:empreendimentoId/unidades/lote')
  async gerarUnidades(
    @Param('empreendimentoId') empreendimentoId: string,
    @Body() dto: GerarUnidadesDto,
  ) {
    const detalhe = await this.consulta.detalheEmpreendimentoPorId(empreendimentoId);
    return this.unidades.gerarEmLote(empreendimentoId, {
      ...dto,
      endereco: detalhe.endereco,
      cep: detalhe.cep ?? undefined,
    });
  }

  @RequerCapacidade('ENTREGAR_UNIDADE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('unidades/:unidadeId/situacao')
  moverUnidade(@Param('unidadeId') unidadeId: string, @Body() dto: MoverUnidadeDto) {
    return this.unidades.mover(unidadeId, dto.situacao, dto.motivo, dto.familiaId);
  }
}
