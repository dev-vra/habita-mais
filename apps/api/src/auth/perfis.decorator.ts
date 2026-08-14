import { SetMetadata } from '@nestjs/common';
import { PerfilTenant } from '@prisma/client';

export const PERFIS_KEY = 'perfis';

/** Restringe a rota a perfis de tenant. Combine com PerfilGuard. */
export const Perfis = (...perfis: PerfilTenant[]) => SetMetadata(PERFIS_KEY, perfis);
