/**
 * L0: Amendment pipeline — unit tests for validate, preview, apply, and recompile steps.
 *
 * Each test uses minimal in-memory fixtures. Apply tests use tmp dirs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { validateAmendment } from '../../src/amend/validate.js';
import type { Amendment } from '../../src/amend/validate.js';
import { previewAmendment } from '../../src/amend/preview.js';
import { applyAmendment } from '../../src/amend/apply.js';
import type { RecompileFn } from '../../src/amend/apply.js';
import { runAmendPipeline } from '../../src/amend/amend.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

/**
 * Build a minimal GovernanceIR for testing.
 */
function buildTestIR(overrides?: Partial<GovernanceIR>): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'read-file',
          description: 'Read a file from disk',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'filesystem',
        },
        {
          name: 'execute-shell',
          description: 'Execute a shell command',
          riskLevel: 'critical',
          oboFlag: false,
          classification: 'execution',
        },
        {
          name: 'send-email',
          description: 'Send an email',
          riskLevel: 'high',
          oboFlag: true,
          classification: 'communication',
        },
        {
          name: 'write-data',
          description: 'Write data to store',
          riskLevel: 'medium',
          oboFlag: false,
          classification: 'data',
        },
      ],
      skills: [
        {
          name: 'file-search',
          description: 'Search files in workspace',
          requiredTools: ['read-file'],
          governanceLevel: 1,
        },
      ],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      totalCount: 0,
      maxSeverity: 'low',
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-13T00:00:00.000Z',
      schemaVersion: 1,
    },
    ...overrides,
  };
}

// ── validate ─────────────────────────────────────────────────────────────

describe('validateAmendment', () => {
  it('rejects add-skill that would violate trust tier constraints (R5 tool at T2)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'dangerous-skill',
      value: {
        description: 'A skill that needs dangerous tools',
        requiredTools: ['execute-shell'],
      },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V002');
    expect(result.violations[0]!.message).toContain('execute-shell');
    expect(result.violations[0]!.message).toContain('trust tier T2');
  });

  it('accepts add-skill consistent with GovernanceIR constraints', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'safe-skill',
      value: {
        description: 'A skill that needs safe tools',
        requiredTools: ['read-file'],
      },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('rejects add-skill requiring a nonexistent tool (AMEND-V001)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'ghost-skill',
      value: {
        description: 'Needs a tool that does not exist',
        requiredTools: ['nonexistent-tool'],
      },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V001');
    expect(result.violations[0]!.message).toContain('nonexistent-tool');
    expect(result.violations[0]!.message).toContain('does not exist');
  });

  it('accepts add-skill with no requiredTools', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'standalone-skill',
      value: {
        description: 'No tools needed',
        requiredTools: [],
      },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('accepts add-skill when requiredTools is not an array', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'no-tools-skill',
      value: { description: 'Missing requiredTools field' },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('skips non-string entries in requiredTools', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'mixed-skill',
      value: {
        description: 'Has non-string tool entries',
        requiredTools: [42, 'read-file', null],
      },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('accepts add-skill with medium-risk tool at tier 2', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'medium-skill',
      value: {
        description: 'Uses medium risk tool',
        requiredTools: ['write-data'],
      },
    };

    // T2 max risk = 3 (high), medium = 2 — should pass
    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('accepts add-skill with high-risk tool at tier 3', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'email-skill',
      value: {
        description: 'Uses high risk tool',
        requiredTools: ['send-email'],
      },
    };

    // T3 max risk = 4 (critical), high = 3 — should pass
    const result = validateAmendment(amendment, ir, 3);
    expect(result.valid).toBe(true);
  });

  it('rejects add-skill with high-risk tool at tier 1', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'risky-at-t1',
      value: {
        description: 'Uses high risk tool at low tier',
        requiredTools: ['send-email'],
      },
    };

    // T1 max risk = 1 (low), high = 3 — should fail
    const result = validateAmendment(amendment, ir, 1);
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V002');
  });

  it('accepts add-skill with critical tool at tier 4', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'critical-at-t4',
      value: {
        description: 'Uses critical tool at high tier',
        requiredTools: ['execute-shell'],
      },
    };

    // T4 max risk = 5, critical = 4 — should pass
    const result = validateAmendment(amendment, ir, 4);
    expect(result.valid).toBe(true);
  });

  it('accepts add-skill at tier 5 (all risk levels allowed)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'all-allowed',
      value: {
        description: 'Everything allowed at T5',
        requiredTools: ['execute-shell'],
      },
    };

    const result = validateAmendment(amendment, ir, 5);
    expect(result.valid).toBe(true);
  });

  it('uses fallback max risk for unknown trust tier', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'unknown-tier',
      value: {
        description: 'Unknown tier falls back to 2',
        requiredTools: ['send-email'],
      },
    };

    // Unknown tier → fallback maxRisk = 2, high = 3 — should fail
    const result = validateAmendment(amendment, ir, 99);
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V002');
  });

  it('rejects remove-tool when a skill depends on the tool', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'read-file',
      value: {},
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V003');
    expect(result.violations[0]!.message).toContain('file-search');
  });

  it('accepts remove-tool when no skill depends on it', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'execute-shell',
      value: {},
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('rejects update-policy with unrecognized field', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'nonexistentField',
      value: { nonexistentField: 'bad' },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V004');
  });

  it('accepts update-policy with recognized field (suppressions)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'suppressions',
      value: { suppressions: ['G-CLASS-01'] },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('accepts update-policy for trustTier with valid value', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 3 },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('rejects update-policy for trustTier with out-of-range value (AMEND-V005)', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 99 },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V005');
  });

  it('rejects update-policy for trustTier with non-number value', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 'high' },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V005');
  });

  it('rejects update-policy for trustTier below 1', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 0 },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.ruleId).toBe('AMEND-V005');
  });

  it('accepts update-policy for failMode field', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'failMode',
      value: { failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' } },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('accepts update-policy for auditLevel field', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'auditLevel',
      value: { auditLevel: 'summary' },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });

  it('accepts update-policy for policySet field', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'policySet',
      value: { policySet: 'soc2' },
    };

    const result = validateAmendment(amendment, ir, 2);
    expect(result.valid).toBe(true);
  });
});

// ── preview ──────────────────────────────────────────────────────────────

describe('previewAmendment', () => {
  it('generates add diff for a new skill', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'new-skill',
      value: {
        description: 'A new skill',
        requiredTools: ['read-file'],
        governanceLevel: 2,
      },
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.change).toBe('add');
    expect(result.diffs[0]!.path).toContain('new-skill');
    expect(result.diffs[0]!.before).toBeUndefined();
    expect(result.diffs[0]!.after).toBeDefined();
    expect(result.summary).toContain('+');
  });

  it('generates modify diff for an existing skill', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'file-search',
      value: {
        description: 'Updated file search',
        requiredTools: ['read-file', 'write-data'],
      },
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.change).toBe('modify');
    expect(result.diffs[0]!.before).toBeDefined();
    expect(result.diffs[0]!.after).toBeDefined();
    expect(result.summary).toContain('~');
  });

  it('generates add diff for skill with defaults when no description/tools provided', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'bare-skill',
      value: {},
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.change).toBe('add');
    const after = result.diffs[0]!.after as { description: string; requiredTools: string[]; governanceLevel: number };
    expect(after.description).toBe('');
    expect(after.requiredTools).toEqual([]);
    expect(after.governanceLevel).toBe(1);
  });

  it('generates modify diff preserving existing skill fields when amendment has no overrides', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'file-search',
      value: {},
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.change).toBe('modify');
    const after = result.diffs[0]!.after as { description: string; requiredTools: readonly string[] };
    expect(after.description).toBe('Search files in workspace');
    expect(after.requiredTools).toEqual(['read-file']);
  });

  it('generates remove diff for remove-tool', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'read-file',
      value: {},
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.change).toBe('remove');
    expect(result.diffs[0]!.before).toBeDefined();
    expect(result.diffs[0]!.after).toBeUndefined();
    expect(result.summary).toContain('-');
  });

  it('generates empty diff for remove-tool when tool does not exist', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'nonexistent-tool',
      value: {},
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(0);
    expect(result.summary).toBe('No changes detected.');
  });

  it('generates modify diff for update-policy', () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 4 },
    };

    const result = previewAmendment(amendment, ir);
    expect(result.diffs).toHaveLength(1);
    expect(result.diffs[0]!.change).toBe('modify');
    expect(result.summary).toContain('~');
  });
});

// ── apply ────────────────────────────────────────────────────────────────

describe('applyAmendment', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'claws-amend-'));
    await mkdir(join(tmpDir, '.claws', 'staging'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes add-skill to .claws/staging/amendments.json', async () => {
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'test-skill',
      value: { description: 'Test', requiredTools: [] },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toContain('.claws/staging/amendments.json');

    const raw = await readFile(join(tmpDir, '.claws', 'staging', 'amendments.json'), 'utf-8');
    const records = JSON.parse(raw) as Array<{ type: string; target: string; appliedAt: string }>;
    expect(records).toHaveLength(1);
    expect(records[0]!.type).toBe('add-skill');
    expect(records[0]!.target).toBe('test-skill');
    expect(records[0]!.appliedAt).toBeDefined();
  });

  it('writes remove-tool to .claws/staging/amendments.json', async () => {
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'execute-shell',
      value: {},
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toContain('.claws/staging/amendments.json');

    const raw = await readFile(join(tmpDir, '.claws', 'staging', 'amendments.json'), 'utf-8');
    const records = JSON.parse(raw) as Array<{ type: string; target: string }>;
    expect(records).toHaveLength(1);
    expect(records[0]!.type).toBe('remove-tool');
    expect(records[0]!.target).toBe('execute-shell');
  });

  it('writes update-policy to claws.json', async () => {
    await writeFile(join(tmpDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 4 },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    expect(result.modifiedFiles).toContain('claws.json');

    const raw = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    const config = JSON.parse(raw) as { trustTier: number };
    expect(config.trustTier).toBe(4);
  });

  it('creates claws.json when it does not exist for update-policy', async () => {
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 3 },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    const raw = await readFile(join(tmpDir, 'claws.json'), 'utf-8');
    const config = JSON.parse(raw) as { trustTier: number };
    expect(config.trustTier).toBe(3);
  });

  it('appends to existing amendments.json', async () => {
    // Pre-populate with an existing amendment
    const existing = [{ type: 'add-skill', target: 'old-skill', value: {}, appliedAt: '2026-04-12T00:00:00Z' }];
    await writeFile(
      join(tmpDir, '.claws', 'staging', 'amendments.json'),
      JSON.stringify(existing),
      'utf-8',
    );

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'new-skill',
      value: { description: 'New' },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    const raw = await readFile(join(tmpDir, '.claws', 'staging', 'amendments.json'), 'utf-8');
    const records = JSON.parse(raw) as Array<{ target: string }>;
    expect(records).toHaveLength(2);
    expect(records[1]!.target).toBe('new-skill');
  });

  it('returns failure when recompile fails', async () => {
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'fail-skill',
      value: { description: 'Will fail', requiredTools: [] },
    };

    const recompile: RecompileFn = async () => ({
      success: false,
      error: 'parse error',
    });

    const result = await applyAmendment(tmpDir, amendment, recompile);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Recompilation failed');
    expect(result.error).toContain('parse error');
  });

  it('returns failure when recompile fails without error message', async () => {
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'fail-skill',
      value: { description: 'Will fail', requiredTools: [] },
    };

    const recompile: RecompileFn = async () => ({
      success: false,
    });

    const result = await applyAmendment(tmpDir, amendment, recompile);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Recompilation failed');
    expect(result.error).toContain('unknown error');
  });

  it('returns failure when staging dir cannot be created', async () => {
    // Write a file where the staging dir should be, blocking mkdir
    await rm(join(tmpDir, '.claws'), { recursive: true, force: true });
    await writeFile(join(tmpDir, '.claws'), 'blocking file', 'utf-8');

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'blocked-skill',
      value: {},
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles corrupted amendments.json gracefully', async () => {
    await writeFile(
      join(tmpDir, '.claws', 'staging', 'amendments.json'),
      'not valid json',
      'utf-8',
    );

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'recover-skill',
      value: { description: 'Recovers' },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    const raw = await readFile(join(tmpDir, '.claws', 'staging', 'amendments.json'), 'utf-8');
    const records = JSON.parse(raw) as Array<{ target: string }>;
    expect(records).toHaveLength(1);
    expect(records[0]!.target).toBe('recover-skill');
  });

  it('handles amendments.json containing non-array JSON', async () => {
    await writeFile(
      join(tmpDir, '.claws', 'staging', 'amendments.json'),
      '{"not": "array"}',
      'utf-8',
    );

    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'some-tool',
      value: {},
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await applyAmendment(tmpDir, amendment, recompile);

    expect(result.success).toBe(true);
    const raw = await readFile(join(tmpDir, '.claws', 'staging', 'amendments.json'), 'utf-8');
    const records = JSON.parse(raw) as Array<{ target: string }>;
    expect(records).toHaveLength(1);
  });
});

// ── pipeline (recompile step) ────────────────────────────────────────────

describe('runAmendPipeline — recompile step', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'claws-pipeline-'));
    await mkdir(join(tmpDir, '.claws', 'staging'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('succeeds after valid amendment with successful recompile', async () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'safe-skill',
      value: { description: 'Safe', requiredTools: ['read-file'] },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await runAmendPipeline(tmpDir, amendment, ir, 2, recompile);

    expect(result.success).toBe(true);
    expect(result.step).toBe('done');
    expect(result.validation.valid).toBe(true);
    expect(result.preview).toBeDefined();
    expect(result.apply).toBeDefined();
    expect(result.apply!.success).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('aborts at validate step when amendment is invalid (no files modified)', async () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'bad-skill',
      value: { description: 'Bad', requiredTools: ['execute-shell'] },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await runAmendPipeline(tmpDir, amendment, ir, 2, recompile);

    expect(result.success).toBe(false);
    expect(result.step).toBe('validate');
    expect(result.validation.valid).toBe(false);
    expect(result.preview).toBeUndefined();
    expect(result.apply).toBeUndefined();
  });

  it('supports dry-run mode (stops after preview, no files modified)', async () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'preview-skill',
      value: { description: 'Preview only', requiredTools: ['read-file'] },
    };

    const recompile: RecompileFn = async () => ({ success: true });
    const result = await runAmendPipeline(tmpDir, amendment, ir, 2, recompile, { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.step).toBe('preview');
    expect(result.preview).toBeDefined();
    expect(result.apply).toBeUndefined();
  });

  it('returns apply failure when recompile fails in pipeline', async () => {
    const ir = buildTestIR();
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'fail-recompile',
      value: { description: 'Will fail recompile', requiredTools: ['read-file'] },
    };

    const recompile: RecompileFn = async () => ({ success: false, error: 'IR mismatch' });
    const result = await runAmendPipeline(tmpDir, amendment, ir, 2, recompile);

    expect(result.success).toBe(false);
    expect(result.step).toBe('apply');
    expect(result.validation.valid).toBe(true);
    expect(result.preview).toBeDefined();
    expect(result.apply).toBeDefined();
    expect(result.apply!.success).toBe(false);
  });
});
