import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CapacidadesService } from '../auth/capacidades.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { PosEntregaQueryService } from '../pos-entrega/infra/pos-entrega.query-service';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { OficioService } from '../pdf/oficio.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConvocarFamiliaUseCase } from './application/convocar-familia.use-case';
import { PendenciasUseCase } from './application/pendencias.use-case';
import { RecadastramentoUseCase } from './application/recadastramento.use-case';
import { InscreverFamiliaUseCase } from './application/inscrever-familia.use-case';
import { PublicarRankingUseCase } from './application/publicar-ranking.use-case';
import { RecalcularPontuacaoUseCase } from './application/recalcular-pontuacao.use-case';
import { RecursosUseCase } from './application/recursos.use-case';
import { RegistrarDesfechoUseCase } from './application/registrar-desfecho.use-case';
import {
  AbrirPendenciaDto,
  BaixaRecadastramentoDto,
  ConvocarDto,
  DecidirRecursoDto,
  DesfechoConvocacaoDto,
  InscreverFamiliaDto,
  InterporRecursoDto,
  PublicarRankingDto,
  ResolverPendenciaDto,
} from './dto/fila.dto';
import { DecisoesQueryService } from './infra/decisoes.query-service';
import { FilaQueryService } from './infra/fila.query-service';

/** Controller fino: traduz request em caso de uso. Regra de negócio nenhuma mora aqui. */
@Controller()
export class FilaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacidades: CapacidadesService,
    private readonly consulta: FilaQueryService,
    private readonly inscrever: InscreverFamiliaUseCase,
    private readonly recalcular: RecalcularPontuacaoUseCase,
    private readonly publicarRanking: PublicarRankingUseCase,
    private readonly convocar: ConvocarFamiliaUseCase,
    private readonly desfecho: RegistrarDesfechoUseCase,
    private readonly recursos: RecursosUseCase,
    private readonly pendencias: PendenciasUseCase,
    private readonly oficios: OficioService,
    private readonly decisoes: DecisoesQueryService,
    private readonly recadastramento: RecadastramentoUseCase,
    private readonly posEntrega: PosEntregaQueryService,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('painel')
  async painel() {
    const [resumo, agenda] = await Promise.all([
      this.consulta.resumo(),
      this.posEntrega.agenda(),
    ]);

    return { ...resumo, visitasVencidas: agenda.resumo.vencidas };
  }

  /** O que espera decisão hoje — a lista que abre o painel do gestor. */
  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('painel/decisoes')
  decisoesPendentes() {
    return this.decisoes.pendentes(new Date());
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('busca')
  buscar(@Query('q') termo: string) {
    return this.decisoes.buscar(termo ?? '');
  }

  @RequerCapacidade('GERIR_PROGRAMA')
  @Get('programas/:programaId/recadastramento')
  candidatasABaixa(@Param('programaId') programaId: string) {
    return this.recadastramento.candidatas(programaId, new Date());
  }

  @RequerCapacidade('GERIR_PROGRAMA')
  @HttpCode(HttpStatus.OK)
  @Post('programas/:programaId/recadastramento')
  baixarPorRecadastramento(
    @Param('programaId') programaId: string,
    @Body() dto: BaixaRecadastramentoDto,
  ) {
    return this.recadastramento.baixar(programaId, dto.inscricoes, new Date());
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('inscricoes/:inscricaoId')
  inscricao(@Param('inscricaoId') inscricaoId: string) {
    return this.consulta.inscricao(inscricaoId);
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('pendencias')
  pendenciasAbertas() {
    return this.consulta.pendenciasAbertas();
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO')
  @Post('inscricoes/:inscricaoId/pendencias')
  abrirPendencia(@Param('inscricaoId') inscricaoId: string, @Body() dto: AbrirPendenciaDto) {
    return this.pendencias.abrir({ inscricaoId, ...dto });
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO')
  @HttpCode(HttpStatus.OK)
  @Post('pendencias/:pendenciaId/resolver')
  resolverPendencia(
    @Param('pendenciaId') pendenciaId: string,
    @Body() dto: ResolverPendenciaDto,
  ) {
    return this.pendencias.resolver(pendenciaId, dto.desfecho, dto.arquivoKey);
  }

  /** Aceita id ou slug do programa. */
  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('programas/:programa/fila')
  fila(@Param('programa') programa: string) {
    return this.consulta.doPrograma(programa);
  }

  @RequerCapacidade('INSCREVER_FAMILIA')
  @Post('programas/:programaId/inscricoes')
  inscreverFamilia(@Param('programaId') programaId: string, @Body() dto: InscreverFamiliaDto) {
    return this.inscrever.executar({
      programaId,
      familiaId: dto.familiaId,
      agora: new Date(),
    });
  }

  @RequerCapacidade('RECALCULAR_PONTUACAO')
  @HttpCode(HttpStatus.OK)
  @Post('programas/:programaId/inscricoes/:inscricaoId/recalcular')
  recalcularUma(
    @Param('programaId') programaId: string,
    @Param('inscricaoId') inscricaoId: string,
  ) {
    return this.recalcular.umaInscricao(inscricaoId, programaId, new Date());
  }

  /**
   * Recálculo em lote é capacidade sensível (§5): o guard barra pelo token e aqui a concessão é
   * reconfirmada no banco, dentro da transação — access token curto ainda é uma janela.
   */
  @RequerCapacidade('RECALCULAR_PONTUACAO_LOTE')
  @HttpCode(HttpStatus.OK)
  @Post('programas/:programaId/recalcular')
  async recalcularLote(@Param('programaId') programaId: string, @CurrentUser() user: AuthUser) {
    await this.confirmarSensivel(user, 'RECALCULAR_PONTUACAO_LOTE');
    const resultados = await this.recalcular.programaInteiro(programaId, new Date());
    return { recalculadas: resultados.length, resultados };
  }

  @RequerCapacidade('PUBLICAR_RANKING')
  @Post('programas/:programaId/ranking')
  publicar(@Param('programaId') programaId: string, @Body() dto: PublicarRankingDto) {
    return this.publicarRanking.executar(programaId, dto.prazoRecursoAte);
  }

  @RequerCapacidade('EMITIR_CONVOCACAO')
  @Post('inscricoes/:inscricaoId/convocacoes')
  async convocarFamilia(
    @Param('inscricaoId') inscricaoId: string,
    @Body() dto: ConvocarDto,
    @CurrentUser() user: AuthUser,
  ) {
    const foraDeOrdem = dto.foraDeOrdem ?? false;
    if (foraDeOrdem) {
      await this.confirmarSensivel(user, 'CONVOCAR_FORA_DE_ORDEM');
    }

    return this.convocar.executar({
      inscricaoId,
      prazoComparecimentoAte: dto.prazoComparecimentoAte,
      agora: new Date(),
      foraDeOrdem,
      motivoExcecao: dto.motivoExcecao,
    });
  }

  /** Ofício em PDF: o ato que a família recebe, arquivado no storage na primeira emissão. */
  @RequerCapacidade('EMITIR_CONVOCACAO')
  @Get('convocacoes/:convocacaoId/oficio')
  async oficio(@Param('convocacaoId') convocacaoId: string, @Res() res: Response) {
    const { pdf, nome } = await this.oficios.convocacao(convocacaoId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nome}"`);
    res.send(pdf);
  }

  @RequerCapacidade('DECLARAR_CONTEMPLACAO')
  @HttpCode(HttpStatus.OK)
  @Post('convocacoes/:convocacaoId/desfecho')
  registrarDesfecho(
    @Param('convocacaoId') convocacaoId: string,
    @Body() dto: DesfechoConvocacaoDto,
  ) {
    return this.desfecho.executar({
      convocacaoId,
      desfecho: dto.desfecho,
      motivo: dto.motivo,
    });
  }

  @RequerCapacidade('VALIDAR_DOCUMENTACAO', 'JULGAR_RECURSO')
  @Post('inscricoes/:inscricaoId/recursos')
  interporRecurso(
    @Param('inscricaoId') inscricaoId: string,
    @Body() dto: InterporRecursoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recursos.interpor({
      inscricaoId,
      motivo: dto.motivo,
      apresentadoPor: user.nome,
      prazoRespostaAte: dto.prazoRespostaAte,
      agora: new Date(),
    });
  }

  @RequerCapacidade('JULGAR_RECURSO')
  @HttpCode(HttpStatus.OK)
  @Post('recursos/:recursoId/decisao')
  decidirRecurso(@Param('recursoId') recursoId: string, @Body() dto: DecidirRecursoDto) {
    return this.recursos.decidir({
      recursoId,
      decisao: dto.decisao,
      fundamentacao: dto.fundamentacao,
    });
  }

  private async confirmarSensivel(
    user: AuthUser,
    capacidade: Parameters<CapacidadesService['confirmar']>[3],
  ): Promise<void> {
    if (!user.perfil) return;
    await this.capacidades.confirmar(this.prisma.tx, user.userId, user.perfil, capacidade);
  }
}
