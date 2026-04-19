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
    { find: /^@craftworks\/claws-serve\/(.+)$/, replacement: resolve(__dirname, '../claws-serve/src/$1') },
    // ── Bare specifiers ─────────────────────────────────────────────────
    { find: '@bic/claws-sdk', replacement: resolve(__dirname, 'src') },
    { find: '@craftworks/compiler-sdk', replacement: resolve(__dirname, '../compiler-sdk/src') },
    { find: '@craftworks/agent-sdk', replacement: resolve(__dirname, '../agent-sdk/src') },
    { find: '@bic/claws-test', replacement: resolve(__dirname, '../claws-test/src') },
    { find: '@bic/claws-serve', replacement: resolve(__dirname, '../claws-serve/src') },
    // ── LSP package (for acceptance tests) ─────────────────────────────
    { find: /^@bic\/openclaw-lsp\/(.+)$/, replacement: resolve(__dirname, '../claws-lsp/src/$1') },
    { find: '@bic/openclaw-lsp', replacement: resolve(__dirname, '../claws-lsp/src') },
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
  '**/*.tmpl',
  '**/*.tmpl.*',
];

export default defineConfig({
  resolve: sharedResolve,
  test: {
    include: ['tests/**/*.test.ts'],
    forceExit: true,
    // Windows filesystem + full-suite parallel load (4695 tests across
    // 4 projects, tmpdir crypto/IO-heavy tests) pushes well past the
    // 5s vitest default. 15s gives real hangs room to surface while
    // absorbing cross-project thrash. e2e keeps its 60s override below.
    testTimeout: 15_000,
    exclude: sharedExclude,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        // ── Consolidated sub-packages own their own coverage gates ────────
        // `claws-sdk/packages/{workspace,guardrails,policy,snap}/` each run
        // vitest independently with per-file 95/90/95/95 thresholds; the
        // parent claws-sdk suite must NOT double-count their source.
        'packages/**',
        // ── Pure-type files (no runtime code) ─────────────────────────────
        // protect/types.ts has runtime functions, so it is NOT excluded.
        'src/compile/types.ts',
        'src/compile/llm/types.ts',
        'src/config/types.ts',
        'src/detect/types.ts',
        'src/fleet/types.ts',
        'src/governance/types.ts',
        'src/keys/types.ts',
        'src/watch/watcher.ts',
        'src/compile/llm/anthropic-provider.ts',
        'src/ir/mechanical-intent.ts',
        'src/snapshot/provenance.ts',
        'src/types/loss-matrix.ts',
        'src/types/platform.ts',
        'src/maker/types.ts',
        'src/maker/badge-types.ts',
        'src/compiler/ir/field-types.ts',
        'src/compiler/ir/workspace-ir.ts',
        'src/compiler/enforce/types.ts',
        'src/compiler/emit/types.ts',
        'src/compiler/cache/types.ts',
        'src/compiler/host/types.ts',
        'src/compiler/fleet/types.ts',
        'src/workspace/schema-types.ts',
        'tests/**',
        // ── Template source files (scaffolding output, not runtime) ──────
        '**/*.tmpl',
        '**/*.tmpl.*',
        '**/*.ts.tmpl',
        'src/emit/templates/**',
      ],
      // ── Dual-coverage CI gate ──────────────────────────────────────────
      // Unit:        npx vitest run --project unit --coverage
      //              95/90/95/95 per-file (statements/branches/functions/lines)
      // Integration: npx vitest run --project integration --coverage
      //              85/70/80/85 whole-package (uses thresholds below when
      //              integration tests are present; per-file still applies)
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
          testTimeout: 15_000,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'integration',
          include: ['tests/**/*.integration.test.ts'],
          forceExit: true,
          testTimeout: 15_000,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'e2e',
          include: ['tests/**/*.e2e.test.ts'],
          forceExit: true,
          testTimeout: 60_000,
          exclude: sharedExclude,
        },
      }),
      defineProject({
        resolve: sharedResolve,
        test: {
          name: 'accept',
          include: ['tests/**/*.accept.test.ts'],
          forceExit: true,
          testTimeout: 15_000,
          exclude: sharedExclude,
        },
      }),
    ],
  },
});
