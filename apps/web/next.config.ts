import { resolve } from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // O browser fala só com o web: a API Nest é interna e alcançada pelo BFF (lib/api/server.ts).
  // Nenhum token de acesso chega ao cliente — os cookies são httpOnly.
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
};

export default config;
