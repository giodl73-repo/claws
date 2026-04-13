import { defineConfig, defineProject } from 'vitest/config';
import { resolve } from 'node:path';

const sharedResolve = {
  alias: [
    { find: /^#src\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^#fixtures\/(.+)$/, replacement: resolve(__dirname, 'tests/fixtures/$1') },
    { find: /^@claws\/skill-kit\/(.+)$/, replacement: resolve(__dirname, 'src/$1') },
    { find: /^@craftworks\/claws-sdk\/(.+)$/, replacement: resolve(__dirname, '../claws-sdk/src/$1') },
    { find: '@bic/claws-skill-kit', replacement: resolve(__dirname, 'src') },
    { find: '@bic/claws-sdk', replacement: resolve(__dirname, '../claws-sdk/src') },
  ],
};

const sharedExclude = [
  '**/node_modules/**',
  '**/dist/**',
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
      ],
      thresholds: {
        perFile: true,
        statements: 90,
        branches: 83,
        functions: 80,
        lines: 90,
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
    ],
  },
});
