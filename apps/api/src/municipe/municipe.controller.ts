import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsDate, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../auth/current-user.decorator';
import { Esferas } from '../auth/esfera.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { RecursosUseCase } from '../fila/application/recursos.use-case';
import { MunicipeQueryService } from './municipe.query-service';

/** Prazo padrão de resposta ao recurso. Publicado no regulamento; parametrizável depois. */
const DIAS_PARA_RESPONDER_RECURSO = 7;

export class InterporRecursoMunicipeDto {
  @IsString()
  @MinLength(20, { message: 'Conte o que aconteceu, com pelo menos uma frase.' })
  motivo!: string;
}

export class ConsultaDto {
  @Type(() => Date)
  @IsDate()
  referencia!: Date;
}

/**
 * Central do munícipe — o outro lado do balcão.
 *
 * Toda rota é da esfera MUNICIPE, e a RLS já escopa à própria família: nome, CPF ou pontuação de
 * terceiro não são acessíveis nem por URL adivinhada. O que aparece aqui é o que a família tem
 * direito de saber sobre si (spec §8).
 */
@Esferas('MUNICIPE')
@Controller('minha-inscricao')
export class MunicipeController {
  constructor(
    private readonly consulta: MunicipeQueryService,
    private readonly recursos: RecursosUseCase,
  ) {}

  @Get()
  minhaSituacao(@CurrentUser() user: AuthUser) {
    return this.consulta.situacao(user.familiaId ?? '');
  }

  @Post('recursos')
  async interpor(@CurrentUser() user: AuthUser, @Body() dto: InterporRecursoMunicipeDto) {
    const inscricaoId = await this.consulta.inscricaoAtiva(user.familiaId ?? '');
    const agora = new Date();
    const prazo = new Date(agora);
    prazo.setDate(prazo.getDate() + DIAS_PARA_RESPONDER_RECURSO);

    return this.recursos.interpor({
      inscricaoId,
      motivo: dto.motivo,
      apresentadoPor: `${user.nome} (central do munícipe)`,
      prazoRespostaAte: prazo,
      agora,
    });
  }
}
