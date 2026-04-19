import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/ast/generated/**',
        'src/ast/ast-types.ts',
        'src/ast/grammars.generated.ts',
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
