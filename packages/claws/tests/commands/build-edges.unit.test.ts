/**
 * L0: build command edge cases — mocked SDK for branch coverage on
 * no-adapter, warnings, and violation output paths.
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

vi.mock('@bic/claws-sdk/emit', () => ({
  getAdapter: vi.fn(),
}));

vi.mock('../../src/core/platform-detect.js', () => ({
  detectPlatform: vi.fn(),
  VALID_PLATFORMS: new Set(['openclaw', 'cursor', 'claude-code', 'github-copilot', 'bedrock', 'langgraph', 'crewai']),
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
import { getAdapter } from '@bic/claws-sdk/emit';
import { checkBuildCache, storeBuildCache } from '../../src/core/cache.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runBuild } from '../../src/commands/build.js';

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

/** Set up mocks for a successful pipeline through analyze. */
function setupPipelineMocks(violations: unknown[] = []) {
  vi.mocked(checkBuildCache).mockResolvedValue({ skip: false, message: '' });
  vi.mocked(storeBuildCache).mockResolvedValue(undefined);
  vi.mocked(parse).mockResolvedValue({
    shouldHalt: false, entries: [], presentCount: 1, absentCount: 0,
  } as Awaited<ReturnType<typeof parse>>);
  vi.mocked(extractAllIntents).mockReturnValue([] as ReturnType<typeof extractAllIntents>);
  vi.mocked(buildGovernanceAST).mockReturnValue({} as ReturnType<typeof buildGovernanceAST>);
  vi.mocked(extract).mockReturnValue({} as ReturnType<typeof extract>);
  vi.mocked(detectConflicts).mockReturnValue({ conflicts: [] } as ReturnType<typeof detectConflicts>);
  vi.mocked(buildCapabilityManifest).mockReturnValue({} as ReturnType<typeof buildCapabilityManifest>);
  vi.mocked(toIRConflictReport).mockReturnValue({ conflicts: [] } as ReturnType<typeof toIRConflictReport>);
  vi.mocked(createDefaultRegistry).mockReturnValue({} as ReturnType<typeof createDefaultRegistry>);
  vi.mocked(analyze).mockReturnValue({ violations } as ReturnType<typeof analyze>);
}

describe('claws build — edge-case branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns exit 3 when getAdapter returns undefined (no adapter)', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(getAdapter).mockReturnValue(undefined);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join(' ');
      expect(output).toContain('No adapter for platform');
    } finally {
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('returns exit 3 with JSON when getAdapter returns undefined', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(getAdapter).mockReturnValue(undefined);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: true, verbose: false }, 'openclaw');
      expect(exitCode).toBe(3);

      const output = consoleSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.error.code).toBe('OC-POLICY-E020');
    } finally {
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it('text output renders warnings from emit result', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(getAdapter).mockReturnValue({
      platform: 'openclaw',
      emit: () => ({
        platform: 'openclaw',
        artifacts: [{ path: 'rules.yaml', content: 'content' }],
        warnings: ['Missing optional field X', 'Deprecated rule Y'],
      }),
    } as ReturnType<typeof getAdapter>);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(0);

      const warnOutput = warnSpy.mock.calls.flat().join(' ');
      expect(warnOutput).toContain('Warning: Missing optional field X');
      expect(warnOutput).toContain('Warning: Deprecated rule Y');
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('JSON output includes warnings array', async () => {
    const ctx = makeCtx();
    setupPipelineMocks();
    vi.mocked(getAdapter).mockReturnValue({
      platform: 'openclaw',
      emit: () => ({
        platform: 'openclaw',
        artifacts: [{ path: 'rules.yaml', content: 'content' }],
        warnings: ['Some warning'],
      }),
    } as ReturnType<typeof getAdapter>);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: true, verbose: false }, 'openclaw');
      expect(exitCode).toBe(0);

      const output = logSpy.mock.calls.flat().join('');
      const parsed = JSON.parse(output);
      expect(parsed.warnings).toEqual(['Some warning']);
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('returns exit 1 when violations are present', async () => {
    const ctx = makeCtx();
    setupPipelineMocks([{ ruleId: 'GOV-001', level: 'error', message: 'test violation' }]);
    vi.mocked(getAdapter).mockReturnValue({
      platform: 'openclaw',
      emit: () => ({
        platform: 'openclaw',
        artifacts: [{ path: 'rules.yaml', content: 'content' }],
        warnings: [],
      }),
    } as ReturnType<typeof getAdapter>);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const exitCode = await runBuild(ctx, { force: true, json: false, verbose: false }, 'openclaw');
      expect(exitCode).toBe(1);

      const output = logSpy.mock.calls.flat().join(' ');
      expect(output).toContain('1 violation(s) found');
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
