/**
 * L0: check command edge cases — mocked SDK for branch coverage on
 * violation exit code path.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@bic/claws-sdk/compile', () => ({
  parse: vi.fn(),
  extractAllIntents: vi.fn(),
  buildGovernanceAST: vi.fn(),
  extract: vi.fn(),
  buildCapabilityManifest: vi.fn(),
  analyze: vi.fn(),
  ExtractorLLM: class {
    get available() { return false; }
    get modelId() { return 'none'; }
  },
}));

vi.mock('@bic/claws-sdk/governance', () => ({
  createDefaultRegistry: vi.fn(),
}));

vi.mock('../../src/core/audit.js', () => ({
  writeBypassAuditEvent: vi.fn(),
}));

import {
  parse,
  extractAllIntents,
  buildGovernanceAST,
  extract,
  buildCapabilityManifest,
  analyze,
} from '@bic/claws-sdk/compile';
import { createDefaultRegistry } from '@bic/claws-sdk/governance';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runCheck } from '../../src/commands/check.js';

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

function setupMocks(violations: unknown[] = []) {
  vi.mocked(parse).mockResolvedValue({
    shouldHalt: false, entries: [], presentCount: 1, absentCount: 0,
  } as Awaited<ReturnType<typeof parse>>);
  vi.mocked(extractAllIntents).mockReturnValue([] as ReturnType<typeof extractAllIntents>);
  vi.mocked(buildGovernanceAST).mockReturnValue({} as ReturnType<typeof buildGovernanceAST>);
  vi.mocked(extract).mockReturnValue({} as ReturnType<typeof extract>);
  vi.mocked(buildCapabilityManifest).mockReturnValue({} as ReturnType<typeof buildCapabilityManifest>);
  vi.mocked(createDefaultRegistry).mockReturnValue({} as ReturnType<typeof createDefaultRegistry>);
  vi.mocked(analyze).mockReturnValue({ violations } as ReturnType<typeof analyze>);
}

describe('claws check — edge-case branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns exit 1 when violations are present', async () => {
    const ctx = makeCtx();
    setupMocks([
      { ruleId: 'GOV-001', level: 'error', message: 'Missing risk', target: 'TOOLS.md', diagnosticCode: 'D001' },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: false, verbose: false, color: false });
      expect(exitCode).toBe(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 0 when no violations', async () => {
    const ctx = makeCtx();
    setupMocks([]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('returns exit 1 with JSON when violations are present', async () => {
    const ctx = makeCtx();
    setupMocks([
      { ruleId: 'GOV-001', level: 'error', message: 'Missing risk', target: 'TOOLS.md', diagnosticCode: 'D001' },
    ]);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const exitCode = await runCheck(ctx, { json: true, verbose: false, color: false });
      expect(exitCode).toBe(1);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
