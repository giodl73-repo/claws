import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@bic/oc-paths-substrate': resolve(HERE, '../oc-paths-substrate/src/index.ts'),
      '@bic/pinch': resolve(HERE, '../pinch/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
  },
});
