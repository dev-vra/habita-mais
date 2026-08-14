import { Injectable } from '@nestjs/common';
import type { SerieProtocolo } from '@prisma/client';
import { getActiveContext } from '../context/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { proximoProtocolo } from './protocolo';
import type { GeradorProtocolo, SerieProtocoloDominio } from './ports';

@Injectable()
export class GeradorProtocoloAdapter implements GeradorProtocolo {
  constructor(private readonly prisma: PrismaService) {}

  async proximo(serie: SerieProtocoloDominio, ano: number): Promise<string> {
    const { tenantId } = getActiveContext();
    if (!tenantId) {
      throw new Error('Protocolo exige tenant no contexto — a numeração é por prefeitura.');
    }
    return proximoProtocolo(this.prisma.tx, tenantId, serie as SerieProtocolo, ano);
  }
}
