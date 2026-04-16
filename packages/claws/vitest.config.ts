import { defineConfig, defineProject } from 'vitest/config';
import { resolve } from 'node:path';

const sharedResolve = {
  alias: [
    // ── Self-source ─────────────────────────────────────────────────────
    { find: /^#src\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    // ── Sub-path exports (must come before bare specifiers) ─────────────
    { find: /^@craftworks\/claws-cli\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^@craftworks\/claws-sdk\/(.+)$/, replacement: resolve(__dirname, '../claws-sdk/src/$1') },
    // ── Bare specifiers ─────────────────────────────────────────────────
    { find: '@bic/claws-cli', replacement: resolve(__dirname, 'src') },
    { find: '@bic/claws-sdk', replacement: resolve(__dirname, '../claws-sdk/src') },
    { find: /^@craftworks\/claws-serve\/(.+)$/, replacement: resolve(__dirname, '../claws-serve/src/$1') },
    { find: '@bic/claws-serve', replacement: resolve(__dirname, '../claws-serve/src') },
  ],
  dedupe: [
    'yaml',
    'zod',
  ],
};

const sharedExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.stress.ts',
];

export default defineConfig({
  resolve: sharedResolve,
  test: {
    include: ['tests/**/*.test.ts'],
    forceExit: true,
    exclude: sharedExclude,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/**/index.ts',
        'src/cli.ts',  // Commander.js wiring — tested via e2e, not unit
        'src/version.ts',  // 3-line env resolution — no testable logic
        'tests/**',  // test utilities are not production code
      ],
      thresholds: {
        perFile: true,
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
    projects: [
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'default',
          include: ['tests/**/*.test.ts'],
          forceExit: true,
          testTimeout: 15_000,
          exclude: [
            ...sharedExclude,
            'tests/**/*.unit.test.ts',
            'tests/**/*.integration.test.ts',
            'tests/**/*.e2e.test.ts',
            'tests/**/*.cli.accept.test.ts',
            'tests/**/*.accept.test.ts',
          ],
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'unit',
          include: ['tests/**/*.unit.test.ts'],
          forceExit: true,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'integration',
          include: ['tests/**/*.integration.test.ts'],
          forceExit: true,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'e2e',
          include: ['tests/**/*.e2e.test.ts'],
          forceExit: true,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'accept',
          include: ['tests/**/*.cli.accept.test.ts'],
          forceExit: true,
          exclude: sharedExclude,
          testTimeout: 60_000,
        },
      }),
    ],
  },
});
