import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RequerCapacidade } from '../auth/capacidade.decorator';
import { AtualizarFichaUseCase } from './application/atualizar-ficha.use-case';
import { CadastrarFamiliaUseCase } from './application/cadastrar-familia.use-case';
import { RegistrarMembroVisitaUseCase } from './application/registrar-membro-visita.use-case';
import { CadastrarFamiliaDto, FichaSocialDto, MembroDto, VisitaDto } from './dto/familias.dto';
import { FamiliasQueryService } from './infra/familias.query-service';

@Controller('familias')
export class FamiliasController {
  constructor(
    private readonly consulta: FamiliasQueryService,
    private readonly cadastrar: CadastrarFamiliaUseCase,
    private readonly atualizarFicha: AtualizarFichaUseCase,
    private readonly membrosVisitas: RegistrarMembroVisitaUseCase,
  ) {}

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get()
  listar(@Query('busca') busca?: string, @Query('pagina') pagina?: string) {
    return this.consulta.listar(busca, Number(pagina ?? 1));
  }

  @RequerCapacidade('ACESSAR_HABITACAO')
  @Get(':familiaId')
  visao360(@Param('familiaId') familiaId: string) {
    return this.consulta.visao360(familiaId);
  }

  @RequerCapacidade('CADASTRAR_FAMILIA')
  @Post()
  cadastrarFamilia(@Body() dto: CadastrarFamiliaDto) {
    return this.cadastrar.executar({
      responsavel: dto.responsavel,
      ficha: dto.ficha,
      agora: new Date(),
    });
  }

  @RequerCapacidade('EDITAR_FICHA_SOCIAL')
  @Post(':familiaId/fichas')
  novaFicha(@Param('familiaId') familiaId: string, @Body() dto: FichaSocialDto) {
    return this.atualizarFicha.executar(familiaId, dto);
  }

  @RequerCapacidade('CADASTRAR_FAMILIA', 'EDITAR_FICHA_SOCIAL')
  @Post(':familiaId/membros')
  adicionarMembro(@Param('familiaId') familiaId: string, @Body() dto: MembroDto) {
    return this.membrosVisitas.adicionarMembro(familiaId, dto);
  }

  @RequerCapacidade('REGISTRAR_VISITA_DOMICILIAR')
  @Post(':familiaId/visitas')
  registrarVisita(@Param('familiaId') familiaId: string, @Body() dto: VisitaDto) {
    return this.membrosVisitas.registrarVisita(familiaId, { ...dto, fotos: dto.fotos ?? [] });
  }
}
