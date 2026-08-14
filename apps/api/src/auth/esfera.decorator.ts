import { SetMetadata } from '@nestjs/common';
import type { Esfera } from './jwt.strategy';

export const ESFERAS_KEY = 'esferas';

/**
 * Esferas que podem acessar a rota. Sem o decorador, valem PLATAFORMA e TENANT — o munícipe
 * precisa de autorização explícita para cada rota, nunca por omissão.
 */
export const Esferas = (...esferas: Esfera[]) => SetMetadata(ESFERAS_KEY, esferas);
