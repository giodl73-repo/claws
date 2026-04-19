import { defineConfig, defineProject } from 'vitest/config';
import { resolve } from 'node:path';

const sharedResolve = {
  alias: [
    // -- Self-source --------------------------------------------------------
    { find: /^#src\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^#fixtures\/(.+)$/, replacement: resolve(__dirname, 'tests/fixtures/$1') },
    // -- Sub-path exports (must come before bare specifiers) ----------------
    { find: /^@bic\/openclaw-lsp\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^@craftworks\/claws-sdk\/(.+)$/, replacement: resolve(__dirname, '../claws-sdk/src/$1') },
    // -- Bare specifiers ----------------------------------------------------
    { find: '@bic/openclaw-lsp', replacement: resolve(__dirname, 'src') },
    { find: '@bic/claws-sdk', replacement: resolve(__dirname, '../claws-sdk/src') },
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
        'src/**/index.ts',
        'tests/**',
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
          exclude: [
            ...sharedExclude,
            'tests/**/*.unit.test.ts',
            'tests/**/*.integration.test.ts',
            'tests/**/*.e2e.test.ts',
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
          include: ['tests/**/*.accept.test.ts'],
          forceExit: true,
          exclude: sharedExclude,
        },
      }),
    ],
  },
});
