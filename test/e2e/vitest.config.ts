import { defineConfig, defineProject } from 'vitest/config';
import { resolve } from 'node:path';

const ROOT = __dirname;

const sharedResolve = {
  alias: [
    { find: /^#harness\/(.+)$/, replacement: resolve(ROOT, 'harness/$1') },
    { find: /^#fixtures\/(.+)$/, replacement: resolve(ROOT, 'fixtures/$1') },
    { find: '#harness', replacement: resolve(ROOT, 'harness') },
  ],
};

const sharedExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.failures/**',
  '**/.teardown-reports/**',
];

const coverageInclude = ['harness/**/*.ts'];
const coverageExclude = [
  'harness/**/*.d.ts',
  'harness/index.ts',
  'harness/**/__tests__/**',
];

export default defineConfig({
  resolve: sharedResolve,
  test: {
    forceExit: true,
    exclude: sharedExclude,
    projects: [
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'unit',
          include: ['harness/__tests__/**/*.unit.test.ts'],
          forceExit: true,
          testTimeout: 15_000,
          exclude: sharedExclude,
          coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/unit',
            include: coverageInclude,
            exclude: coverageExclude,
            thresholds: {
              perFile: true,
              statements: 95,
              branches: 90,
              functions: 95,
              lines: 95,
            },
          },
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'integration',
          include: ['harness/__tests__/**/*.integration.test.ts'],
          forceExit: true,
          testTimeout: 30_000,
          exclude: sharedExclude,
          coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/integration',
            include: coverageInclude,
            exclude: coverageExclude,
            thresholds: {
              perFile: true,
              statements: 90,
              branches: 85,
              functions: 90,
              lines: 90,
            },
          },
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'e2e',
          include: ['scenarios/**/*.e2e.test.ts'],
          forceExit: true,
          testTimeout: 60_000,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'accept',
          include: ['accept/**/*.accept.test.ts'],
          forceExit: true,
          testTimeout: 120_000,
          exclude: sharedExclude,
        },
      }),
    ],
  },
});
