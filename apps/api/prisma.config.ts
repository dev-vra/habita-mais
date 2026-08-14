import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7: a conexão da CLI/migrate vive aqui (saiu do schema). O runtime usa driver adapter no
// PrismaClient — e com a URL do papel de aplicação, não com esta. Ver src/prisma/prisma.service.ts.
//
// process.env direto em vez do env() que lança: `prisma generate` roda no postinstall, quando o
// .env pode nem existir ainda; só migrate/db precisam de URL de fato.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
