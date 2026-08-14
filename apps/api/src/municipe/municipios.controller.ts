import { Controller, Get, Injectable } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MunicipiosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Municípios atendidos. Roda em contexto de plataforma porque a rota é pública e não há sessão —
   * e devolve só o que já é público: nome, município e UF. Nada de dado de família passa por aqui.
   */
  listar() {
    return this.prisma.runWithContext({ isPlatform: true }, ({ tx }) =>
      tx.tenant.findMany({
        where: { ativo: true, deletedAt: null },
        orderBy: { municipio: 'asc' },
        select: { id: true, nome: true, municipio: true, uf: true },
      }),
    );
  }
}

@Controller('municipios')
export class MunicipiosController {
  constructor(private readonly municipios: MunicipiosService) {}

  @Public()
  @Get()
  listar() {
    return this.municipios.listar();
  }
}
