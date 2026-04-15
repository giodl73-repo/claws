import { defineConfig, defineProject } from 'vitest/config';
import { resolve } from 'node:path';

const sharedResolve = {
  alias: [
    // ── Self-source ─────────────────────────────────────────────────────
    { find: /^#src\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^#fixtures\/(.+)$/, replacement: resolve(__dirname, 'tests/fixtures/$1') },
    // ── Sub-path exports (must come before bare specifiers) ─────────────
    { find: /^@craftworks\/claws-sdk\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^@craftworks\/compiler-sdk\/(.+)$/, replacement: resolve(__dirname, '../compiler-sdk/src/$1') },
    { find: /^@craftworks\/agent-sdk\/(.+)$/, replacement: resolve(__dirname, '../agent-sdk/src/$1') },
    { find: /^@claws\/test\/(.+)$/, replacement: resolve(__dirname, '../claws-test/src/$1') },
    // ── Bare specifiers ─────────────────────────────────────────────────
    { find: '@bic/claws-sdk', replacement: resolve(__dirname, 'src') },
    { find: '@craftworks/compiler-sdk', replacement: resolve(__dirname, '../compiler-sdk/src') },
    { find: '@craftworks/agent-sdk', replacement: resolve(__dirname, '../agent-sdk/src') },
    { find: '@bic/claws-test', replacement: resolve(__dirname, '../claws-test/src') },
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
        'src/watch/watcher.ts',
        'src/compile/llm/anthropic-provider.ts',
        'src/ir/mechanical-intent.ts',
        'src/snapshot/provenance.ts',
        'src/types/loss-matrix.ts',
        'src/types/platform.ts',
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
          include: ['tests/accept/**/*.accept.test.ts'],
          forceExit: true,
          exclude: sharedExclude,
        },
      }),
    ],
  },
});
