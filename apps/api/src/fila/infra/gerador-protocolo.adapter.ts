import { Injectable } from '@nestjs/common';
import type { SerieProtocolo } from '@prisma/client';
import { getActiveContext } from '../../context/request-context';
import { proximoProtocolo } from '../../common/protocolo';
import { PrismaService } from '../../prisma/prisma.service';
import type { GeradorProtocolo } from '../domain/ports';

@Injectable()
export class GeradorProtocoloAdapter implements GeradorProtocolo {
  constructor(private readonly prisma: PrismaService) {}

  async proximo(serie: SerieProtocolo, ano: number): Promise<string> {
    const { tenantId } = getActiveContext();
    if (!tenantId) {
      throw new Error('Protocolo exige tenant no contexto — a numeração é por prefeitura.');
    }
    return proximoProtocolo(this.prisma.tx, tenantId, serie, ano);
  }
}
