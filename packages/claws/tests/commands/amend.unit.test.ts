/**
 * L0: amend command — subcommand parsing, pipeline wiring, JSON/text output, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockRunAmendPipeline = vi.fn();

vi.mock('@bic/claws-sdk/amend', () => ({
  runAmendPipeline: (...args: unknown[]) => mockRunAmendPipeline(...args),
}));

const mockParse = vi.fn();

vi.mock('@bic/claws-sdk/compile', () => ({
  parse: (...args: unknown[]) => mockParse(...args),
  extractAllIntents: vi.fn().mockReturnValue([]),
  buildGovernanceAST: vi.fn().mockReturnValue({}),
  extract: vi.fn().mockReturnValue({}),
  detectConflicts: vi.fn().mockReturnValue([]),
  buildCapabilityManifest: vi.fn().mockReturnValue({}),
  toIRConflictReport: vi.fn().mockReturnValue({ totalConflicts: 0, conflicts: [] }),
  analyze: vi.fn().mockReturnValue({}),
  COMPILER_VERSION: '0.36.0',
  SCHEMA_VERSION: 1,
}));

vi.mock('@bic/claws-sdk/governance', () => ({
  createDefaultRegistry: vi.fn(),
}));

vi.mock('@bic/claws-sdk/ir', () => ({
  serialize: vi.fn((v: unknown) => JSON.stringify(v)),
  deserialize: vi.fn((s: string) => JSON.parse(s)),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

import { readFile } from 'node:fs/promises';
import type { PlatformContext } from '../../src/hooks/pre-command.js';
import { runAmendCmd } from '../../src/commands/amend.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<PlatformContext> = {}): PlatformContext {
  return {
    workspaceRoot: '/tmp/fake-ws',
    hasConfig: true,
    config: { trustTier: 2 },
    bypass: false,
    suppressedRules: [],
    ...overrides,
  };
}

const defaultOpts = {
  subcommand: 'add-skill',
  target: 'code-review',
  value: { description: 'Reviews code' },
  dryRun: false,
  json: false,
  color: false,
};

function mockIrOnDisk() {
  (readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
    JSON.stringify({
      capabilities: {},
      analysis: {},
      intents: [],
      delegationMap: [],
      conflicts: { totalConflicts: 0, conflicts: [] },
      compiler: { compilerVersion: '0.36.0', compiledAt: '2025-01-01', schemaVersion: 1 },
    }),
  );
}

function successResult() {
  return {
    step: 'done' as const,
    success: true,
    validation: { valid: true, violations: [] },
    preview: {
      amendment: { type: 'add-skill', target: 'code-review', value: {} },
      diffs: [],
      summary: 'Added skill code-review',
    },
    apply: {
      success: true,
      modifiedFiles: ['claws.json', '.claws/compiled/governance-ir.json'],
    },
    durationMs: 42,
  };
}

function validationFailResult() {
  return {
    step: 'validate' as const,
    success: false,
    validation: {
      valid: false,
      violations: [
        { ruleId: 'TIER-001', message: 'Skill exceeds trust tier', field: 'target' },
      ],
    },
    durationMs: 5,
  };
}

function applyFailResult() {
  return {
    step: 'apply' as const,
    success: false,
    validation: { valid: true, violations: [] },
    preview: {
      amendment: { type: 'add-skill', target: 'code-review', value: {} },
      diffs: [],
      summary: 'Added skill code-review',
    },
    apply: {
      success: false,
      modifiedFiles: [],
      error: 'EACCES: permission denied',
    },
    durationMs: 10,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('claws amend', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockRunAmendPipeline.mockReset();
    mockParse.mockReset();
  });

  // ── No workspace ────────────────────────────────────────────────────────

  it('returns exit 3 when no workspace is detected (text)', async () => {
    const ctx = makeCtx({ hasConfig: false });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(3);
      expect(spy.mock.calls.flat().join(' ')).toContain('OC-POLICY-E010');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns exit 3 when no workspace is detected (json)', async () => {
    const ctx = makeCtx({ hasConfig: false });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, json: true });
      expect(code).toBe(3);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.error.code).toBe('OC-POLICY-E010');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Unknown subcommand ──────────────────────────────────────────────────

  it('returns exit 3 for unknown subcommand (text)', async () => {
    mockIrOnDisk();
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, subcommand: 'bogus' });
      expect(code).toBe(3);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Unknown amendment type');
      expect(output).toContain('bogus');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns exit 3 for unknown subcommand (json)', async () => {
    mockIrOnDisk();
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, subcommand: 'bogus', json: true });
      expect(code).toBe(3);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.error).toContain('Unknown amendment type');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Missing GovernanceIR ────────────────────────────────────────────────

  it('returns exit 3 when GovernanceIR is missing (text)', async () => {
    (readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(3);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('No compiled GovernanceIR');
      expect(output).toContain('claws compile');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns exit 3 when GovernanceIR is missing (json)', async () => {
    (readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, json: true });
      expect(code).toBe(3);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.error).toContain('No compiled GovernanceIR');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Successful amendment ────────────────────────────────────────────────

  it('returns 0 on successful amendment (text)', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(0);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('claws amend');
      expect(output).toContain('Amendment applied successfully');
      expect(output).toContain('Added skill code-review');
      expect(output).toContain('Modified files');
      expect(output).toContain('Duration');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns 0 on successful amendment (json)', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, json: true });
      expect(code).toBe(0);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.success).toBe(true);
      expect(parsed.step).toBe('done');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Validation failure ──────────────────────────────────────────────────

  it('returns 1 on validation failure (text)', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(validationFailResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(1);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Pipeline stopped at: validate');
      expect(output).toContain('Validation failed');
      expect(output).toContain('TIER-001');
      expect(output).toContain('Skill exceeds trust tier');
    } finally {
      spy.mockRestore();
    }
  });

  it('returns 1 on validation failure (json)', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(validationFailResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, json: true });
      expect(code).toBe(1);
      const parsed = JSON.parse(spy.mock.calls.flat().join(''));
      expect(parsed.success).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  // ── Apply failure ───────────────────────────────────────────────────────

  it('returns 1 on apply failure (text)', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(applyFailResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(1);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Pipeline stopped at: apply');
      expect(output).toContain('Apply failed');
      expect(output).toContain('EACCES: permission denied');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Subcommand parsing ──────────────────────────────────────────────────

  it('accepts remove-tool subcommand', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, subcommand: 'remove-tool' });
      expect(code).toBe(0);
      expect(mockRunAmendPipeline).toHaveBeenCalled();
      const amendment = mockRunAmendPipeline.mock.calls[0][1];
      expect(amendment.type).toBe('remove-tool');
    } finally {
      spy.mockRestore();
    }
  });

  it('accepts update-policy subcommand', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts, subcommand: 'update-policy' });
      expect(code).toBe(0);
      const amendment = mockRunAmendPipeline.mock.calls[0][1];
      expect(amendment.type).toBe('update-policy');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Trust tier from config ──────────────────────────────────────────────

  it('passes trustTier from config to pipeline', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx({ config: { trustTier: 4 } });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runAmendCmd(ctx, { ...defaultOpts });
      const trustTier = mockRunAmendPipeline.mock.calls[0][3];
      expect(trustTier).toBe(4);
    } finally {
      spy.mockRestore();
    }
  });

  it('defaults trustTier to 2 when config is null', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx({ config: null });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runAmendCmd(ctx, { ...defaultOpts });
      const trustTier = mockRunAmendPipeline.mock.calls[0][3];
      expect(trustTier).toBe(2);
    } finally {
      spy.mockRestore();
    }
  });

  // ── Dry run ─────────────────────────────────────────────────────────────

  it('passes dryRun option to pipeline', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue(successResult());
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runAmendCmd(ctx, { ...defaultOpts, dryRun: true });
      const options = mockRunAmendPipeline.mock.calls[0][5];
      expect(options.dryRun).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  // ── Success with no preview/apply ───────────────────────────────────────

  it('renders success without preview or apply sections', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue({
      step: 'done',
      success: true,
      validation: { valid: true, violations: [] },
      durationMs: 3,
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(0);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Amendment applied successfully');
      expect(output).not.toContain('Changes:');
      expect(output).not.toContain('Modified files');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Failure without validation/apply detail ─────────────────────────────

  it('renders failure without validation or apply detail', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue({
      step: 'recompile',
      success: false,
      validation: { valid: true, violations: [] },
      durationMs: 8,
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(1);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Pipeline stopped at: recompile');
      expect(output).not.toContain('Validation failed');
      expect(output).not.toContain('Apply failed');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Apply failure with no error message ─────────────────────────────────

  it('renders apply failure with "unknown" when no error message', async () => {
    mockIrOnDisk();
    mockRunAmendPipeline.mockResolvedValue({
      step: 'apply',
      success: false,
      validation: { valid: true, violations: [] },
      apply: { success: false, modifiedFiles: [] },
      durationMs: 6,
    });
    const ctx = makeCtx();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runAmendCmd(ctx, { ...defaultOpts });
      expect(code).toBe(1);
      const output = spy.mock.calls.flat().join(' ');
      expect(output).toContain('Apply failed: unknown');
    } finally {
      spy.mockRestore();
    }
  });

  // ── Recompile callback ──────────────────────────────────────────────────

  describe('recompile callback', () => {
    /** Extract the recompile callback passed to runAmendPipeline. */
    async function captureRecompile(): Promise<(root: string) => Promise<{ success: boolean; error?: string }>> {
      mockIrOnDisk();
      mockRunAmendPipeline.mockResolvedValue(successResult());
      const ctx = makeCtx();
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      try {
        await runAmendCmd(ctx, { ...defaultOpts });
      } finally {
        spy.mockRestore();
      }
      const recompileFn = mockRunAmendPipeline.mock.calls[0][4];
      expect(typeof recompileFn).toBe('function');
      return recompileFn;
    }

    it('returns success when compile pipeline succeeds', async () => {
      mockParse.mockResolvedValue({
        entries: [{ source: 'TOOLS.md', status: 'present' }],
        presentCount: 1,
        shouldHalt: false,
      });

      const recompileFn = await captureRecompile();
      const result = await recompileFn('/tmp/fake-ws');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns error when parse shouldHalt', async () => {
      mockParse.mockResolvedValue({
        entries: [],
        presentCount: 0,
        shouldHalt: true,
      });

      const recompileFn = await captureRecompile();
      const result = await recompileFn('/tmp/fake-ws');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No source files found');
    });

    it('returns error when pipeline throws', async () => {
      mockParse.mockRejectedValue(new Error('disk full'));

      const recompileFn = await captureRecompile();
      const result = await recompileFn('/tmp/fake-ws');
      expect(result.success).toBe(false);
      expect(result.error).toBe('disk full');
    });

    it('returns error string when pipeline throws non-Error', async () => {
      mockParse.mockRejectedValue('unexpected string error');

      const recompileFn = await captureRecompile();
      const result = await recompileFn('/tmp/fake-ws');
      expect(result.success).toBe(false);
      expect(result.error).toBe('unexpected string error');
    });
  });
});
