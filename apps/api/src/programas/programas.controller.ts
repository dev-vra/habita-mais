import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import type { DefinicaoCriterio } from '@habita/shared/habitacao';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { CriteriosUseCase } from './application/criterios.use-case';
import { ProgramasUseCase } from './application/programas.use-case';
import {
  AtualizarProgramaDto,
  CriarProgramaDto,
  EditarCriteriosDto,
  RascunhoCriterioDto,
  SituacaoProgramaDto,
} from './dto/programas.dto';
import { ProgramasQueryService } from './infra/programas.query-service';

@Controller('programas')
export class ProgramasController {
  constructor(
    private readonly consulta: ProgramasQueryService,
    private readonly programas: ProgramasUseCase,
    private readonly criterios: CriteriosUseCase,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get()
  listar() {
    return this.consulta.listar();
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get('parametros')
  parametros() {
    return this.consulta.salarioMinimo().then((salarioMinimo) => ({ salarioMinimo }));
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get(':programa/detalhe')
  detalhe(@Param('programa') programa: string) {
    return this.consulta.detalhe(programa);
  }

  @RequerCapacidade('GERIR_PROGRAMA')
  @Post()
  criar(@Body() dto: CriarProgramaDto) {
    return this.programas.criar(dto);
  }

  @RequerCapacidade('GERIR_PROGRAMA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':programaId')
  atualizar(@Param('programaId') programaId: string, @Body() dto: AtualizarProgramaDto) {
    return this.programas.atualizar(programaId, dto);
  }

  @RequerCapacidade('GERIR_PROGRAMA')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':programaId/situacao')
  async situacao(@Param('programaId') programaId: string, @Body() dto: SituacaoProgramaDto) {
    if (dto.situacao !== 'INSCRICOES_ABERTAS') {
      return this.programas.definirSituacao(programaId, dto.situacao);
    }

    const detalhe = await this.consulta.detalhe(programaId);
    const publicada = detalhe.versoes.some((versao) => versao.situacao === 'PUBLICADA');
    return this.programas.abrirInscricoes(programaId, publicada);
  }

  @RequerCapacidade('PUBLICAR_CRITERIO')
  @Post(':programaId/criterios')
  criarRascunho(@Param('programaId') programaId: string, @Body() dto: RascunhoCriterioDto) {
    return this.criterios.criarRascunho(programaId, dto);
  }

}

/**
 * Versões de critério em rota própria: aninhá-las sob /programas/:id colidiria com o parâmetro
 * do programa, e a versão tem identidade própria — é ela que o snapshot referencia.
 */
@Controller('criterios')
export class CriteriosController {
  constructor(private readonly criterios: CriteriosUseCase) {}

  @RequerCapacidade('PUBLICAR_CRITERIO')
  @HttpCode(HttpStatus.OK)
  @Patch(':versaoId')
  async editarRascunho(@Param('versaoId') versaoId: string, @Body() dto: EditarCriteriosDto) {
    const avisos = await this.criterios.editarRascunho(
      versaoId,
      dto.criterios as unknown as DefinicaoCriterio[],
    );
    return { avisos };
  }

  @RequerCapacidade('PUBLICAR_CRITERIO')
  @HttpCode(HttpStatus.OK)
  @Post(':versaoId/publicar')
  publicar(@Param('versaoId') versaoId: string) {
    return this.criterios.publicar(versaoId, new Date());
  }
}
