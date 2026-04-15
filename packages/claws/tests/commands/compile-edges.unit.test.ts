/**
 * L0: compile command edge cases — mocked SDK for branch coverage on
 * conflict count rendering.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@bic/claws-sdk/compile', () => ({
  parse: vi.fn(),
  extractAllIntents: vi.fn(),
  buildGovernanceAST: vi.fn(),
  extract: vi.fn(),
  detectConflicts: vi.fn(),
  buildCapabilityManifest: vi.fn(),
  toIRConflictReport: vi.fn(),
  COMPILER_VERSION: '0.36.0',
  SCHEMA_VERSION: 1,
  analyze: vi.fn(),
  ExtractorLLM: class {
    get available() { return false; }
    get modelId() { return 'none'; }
  },
}));

vi.mock('@bic/claws-sdk/governance', () => ({
  createDefaultRegistry: vi.fn(),
}));

vi.mock('@bic/claws-sdk/ir', () => ({
  serialize: vi.fn().mockReturnValue('{}'),
}));

vi.mock('../../src/core/cache.js', () => ({
  checkBuildCache: vi.fn(),
  storeBuildCache: vi.fn(),
}));

vi.mock('../../src/core/audit.js', () => ({
  writeBypassAuditEvent: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  detectConflicts,
  buildCapabilityManifest,
  toIRConflictReport,
  analyze,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import { checkBuildCache, storeBuildCache } from '../../src/core/cache.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCompile } from '../../src/commands/compile.js';

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

/** Set up mocks for a full compile pipeline. */
function setupMocks(opts: { violations?: unknown[]; conflicts?: unknown[] } = {}) {
  vi.mocked(checkBuildCache).mockResolvedValue({ skip: false, message: '' });
  vi.mocked(storeBuildCache).mockResolvedValue(undefined);
  vi.mocked(parse).mockResolvedValue({
    shouldHalt: false, entries: [], presentCount: 1, absentCount: 0,
  } as Awaited<ReturnType<typeof parse>>);
  vi.mocked(extractAllIntents).mockReturnValue([] as ReturnType<typeof extractAllIntents>);
  vi.mocked(buildGovernanceAST).mockReturnValue({} as ReturnType<typeof buildGovernanceAST>);
  vi.mocked(extract).mockReturnValue({} as ReturnType<typeof extract>);
  vi.mocked(detectConflicts).mockReturnValue({
    conflicts: opts.conflicts ?? [],
  } as ReturnType<typeof detectConflicts>);
  vi.mocked(buildCapabilityManifest).mockReturnValue({} as ReturnType<typeof buildCapabilityManifest>);
  vi.mocked(toIRConflictReport).mockReturnValue({
    conflicts: opts.conflicts ?? [],
  } as ReturnType<typeof toIRConflictReport>);
  vi.mocked(createDefaultRegistry).mockReturnValue({} as ReturnType<typeof createDefaultRegistry>);
  vi.mocked(analyze).mockReturnValue({
    violations: opts.violations ?? [],
  } as ReturnType<typeof analyze>);
}

describe('claws compile — edge-case branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('text output includes conflict count when conflicts are detected', async () => {
    const ctx = makeCtx();
    setupMocks({
      conflicts: [
        { type: 'allow-deny', sourceA: 'SOUL.md', sourceB: 'TOOLS.md' },
      ],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('1 conflict(s) detected');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('JSON output includes conflict count when conflicts are detected', async () => {
    const ctx = makeCtx();
    setupMocks({
      conflicts: [
        { type: 'allow-deny', sourceA: 'SOUL.md', sourceB: 'TOOLS.md' },
        { type: 'scope', sourceA: 'AGENTS.md', sourceB: 'TOOLS.md' },
      ],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: true, verbose: false });
      expect(exitCode).toBe(0);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.conflicts).toBe(2);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 1 when violations exist', async () => {
    const ctx = makeCtx();
    setupMocks({
      violations: [{ ruleId: 'GOV-001', level: 'error', message: 'test' }],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCompile(ctx, { force: true, json: false, verbose: false });
      expect(exitCode).toBe(1);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('1 violation(s) found');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
