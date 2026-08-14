import { SetMetadata } from '@nestjs/common';
import type { Capacidade } from '@habita/shared/habitacao';

export const CAPACIDADES_KEY = 'capacidades';

/** Exige ao menos uma das capacidades declaradas. Combine com CapacidadeGuard. */
export const RequerCapacidade = (...capacidades: Capacidade[]) =>
  SetMetadata(CAPACIDADES_KEY, capacidades);
