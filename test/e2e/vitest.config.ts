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

// Modules whose code only runs when spawning / tearing down real child
// processes. Exercised exclusively by *.integration.test.ts tiers — exclude
// from the unit-project coverage gate so its per-file thresholds apply
// only to pure modules that unit tests can fully cover.
const unitCoverageExclude = [
  ...coverageExclude,
  'harness/snap-runner.ts',
  'harness/policy-runner.ts',
  'harness/presuite-hygiene.ts',
];

// Integration coverage applies per-file to modules whose real code paths
// require spawning child processes or other OS-level side effects that
// unit tests deliberately do not exercise. Pure modules (parsers,
// signers, stores) are unit-tiered and excluded here so per-file
// thresholds don't penalize integration runs for missing their
// unit-level coverage.
const integrationCoverageInclude = [
  'harness/lifecycle.ts',
  'harness/snap-runner.ts',
  'harness/policy-runner.ts',
  'harness/presuite-hygiene.ts',
];

export default defineConfig({
  resolve: sharedResolve,
  test: {
    forceExit: true,
    exclude: sharedExclude,
    // Build dist once before any project starts so integration tests
    // spawning `node packages/claws/bin/claws.js` don't race the
    // accept suite's rebuild (tsup `clean: true` briefly removes
    // dist/cli.js mid-build).
    globalSetup: [resolve(ROOT, 'global-setup.ts')],
    projects: [
      defineProject({
        resolve: sharedResolve,
        root: ROOT,
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
            exclude: unitCoverageExclude,
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
        root: ROOT,
        test: {
          name: 'integration',
          include: ['harness/__tests__/**/*.integration.test.ts'],
          forceExit: true,
          testTimeout: 30_000,
          // Serialize file execution within this project. Integration files
          // spawn real child processes (snap serve, policy generate) that
          // contend for OS resources (ephemeral ports, process table) when
          // run in parallel with each other AND the accept project. Keeps
          // per-file behavior deterministic without losing parallelism across
          // unit/integration projects (vitest runs projects in parallel by
          // default).
          fileParallelism: false,
          exclude: sharedExclude,
          coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage/integration',
            include: integrationCoverageInclude,
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
        root: ROOT,
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
        root: ROOT,
        test: {
          name: 'accept',
          include: ['accept/**/*.accept.test.ts'],
          forceExit: true,
          testTimeout: 120_000,
          // Serialize file execution within this project. Accept files spawn
          // real `claws` binaries via `process.execPath` — 4 fixtures × 2
          // spawn modes × 22 verbs = up to 176 process spawns. Parallel file
          // execution on top of that overloads the Windows process table and
          // ephemeral-port pool. Per-file serial + project-level parallel
          // (with integration) is the safe sweet spot.
          fileParallelism: false,
          exclude: sharedExclude,
        },
      }),
    ],
  },
});
