import { defineConfig } from 'vitest/config';

// Gate de cobertura (ADR-022): mín. 80% em domínio/lógica.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.test.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
