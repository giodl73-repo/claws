import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/cli-handlers/router.ts',
        'src/cli-handlers/shared.ts',
        'src/cli-handlers/generate.ts',
        'src/cli-handlers/verify.ts',
        'src/ops/types.ts',
      ],
      thresholds: {
        perFile: true,
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
