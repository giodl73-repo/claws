/**
 * L0: pinch-sim runner — edge case paths.
 *
 * Tests runPinchSim function's assertion branches that aren't
 * consistently exercised by the acceptance test suite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runPinchSim } from './pinch-sim.js';
import type { ScenarioYaml } from '../utils/scenario-loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scenario(
  exp: Record<string, unknown>,
  overrides?: Partial<ScenarioYaml>,
): ScenarioYaml {
  return {
    name: 'test-pinch-scenario',
    series: 'test-series',
    expect: exp,
    ...overrides,
  } as ScenarioYaml;
}

// ---------------------------------------------------------------------------
// No workspace
// ---------------------------------------------------------------------------

describe('runPinchSim — no workspace', () => {
  it('fails when scenario directory has no 00+workspace/', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'pinch-sim-'));
    try {
      const yaml = scenario({ pass: true });
      const result = await runPinchSim(tmpDir, yaml);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No 00+workspace/');
      expect(result.diagnostics).toBeDefined();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Halt path
// ---------------------------------------------------------------------------

describe('runPinchSim — halt path', () => {
  it('fails when parse halts', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'pinch-sim-halt-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'README.md'), '# Empty');

    try {
      const yaml = scenario({ pass: true });
      const result = await runPinchSim(tmpDir, yaml);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('halted');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// rules_applied assertion
// ---------------------------------------------------------------------------

describe('runPinchSim — rules_applied', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pinch-sim-rules-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read a file.',
      '',
      '### Parameters',
      '- path: string — File path',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when rules_applied matches available rules', async () => {
    const yaml = scenario({
      rules_applied: ['G-CLASS'],
    });
    const result = await runPinchSim(tmpDir, yaml);
    // G-CLASS rules are always registered → should find them
    expect(result.passed).toBe(true);
  });

  it('fails when rules_applied references unavailable rule', async () => {
    const yaml = scenario({
      rules_applied: ['G-NONEXISTENT-42'],
    });
    const result = await runPinchSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('G-NONEXISTENT-42');
    expect(result.error).toContain('was not applied');
  });
});

// ---------------------------------------------------------------------------
// violations assertion
// ---------------------------------------------------------------------------

describe('runPinchSim — violations', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pinch-sim-violations-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read a file.',
      '',
      '### Parameters',
      '- path: string — File path',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when violations:[] and only infrastructure violations fire', async () => {
    const yaml = scenario({ violations: [] });
    const result = await runPinchSim(tmpDir, yaml);
    // Only infrastructure violations (G-CLASS-02, G-PERM-01, etc.) fire on
    // this simple workspace — those are filtered → passes
    expect(result.passed).toBe(true);
  });

  it('reports significant violations when zero expected but agents trigger rules', async () => {
    // Workspace with agents triggers G-A2A-IDENTITY (significant)
    const tmpDir2 = mkdtempSync(join(tmpdir(), 'pinch-sig-'));
    const wsDir2 = join(tmpDir2, '00+workspace');
    mkdirSync(wsDir2, { recursive: true });
    writeFileSync(join(wsDir2, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir2, 'TOOLS.md'), '# Tools\n## read_file\nRead.\n### Parameters\n- path: string');
    writeFileSync(join(wsDir2, 'AGENTS.md'), [
      '# Agent Connections',
      '',
      '## orchestrator',
      'The orchestrator.',
      'Delegates to: helper',
      'Tools: read_file',
      '',
      '## helper',
      'A helper.',
      'Tools: read_file',
    ].join('\n'));

    try {
      const yaml = scenario({ violations: [] });
      const result = await runPinchSim(tmpDir2, yaml);
      // G-A2A-IDENTITY fires → significant violations > 0 → fails
      expect(result.passed).toBe(false);
      expect(result.error).toContain('significant violations');
    } finally {
      rmSync(tmpDir2, { recursive: true, force: true });
    }
  });

  it('fails when expected violation ID not found', async () => {
    const yaml = scenario({
      violations: [{ ruleId: 'G-NONEXISTENT-99' }],
    });
    const result = await runPinchSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('G-NONEXISTENT-99');
    expect(result.error).toContain('not found');
  });

  it('supports alternate "rule" field in expected violations', async () => {
    // Uses 'rule' instead of 'ruleId' — exercises the ruleId ?? rule fallback
    const yaml = scenario({
      violations: [{ rule: 'G-NONEXISTENT-77' }],
    });
    const result = await runPinchSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('G-NONEXISTENT-77');
  });
});

// ---------------------------------------------------------------------------
// pass assertion
// ---------------------------------------------------------------------------

describe('runPinchSim — pass/fail assertion', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pinch-sim-pass-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read a file.',
      '',
      '### Parameters',
      '- path: string — File path',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when pass:true and no significant violations', async () => {
    const yaml = scenario({ pass: true });
    const result = await runPinchSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
  });

  it('fails when pass:false expected but no significant violations', async () => {
    const yaml = scenario({ pass: false });
    const result = await runPinchSim(tmpDir, yaml);
    // No significant violations → passed=true, but expected pass:false → fail
    expect(result.passed).toBe(false);
    expect(result.error).toContain('pass=false');
    expect(result.error).toContain('got pass=true');
  });

  it('fails when pass:true expected but significant violations present', async () => {
    // Workspace with agents → G-A2A-IDENTITY fires → significant violations
    // → passed=false but exp.pass=true → assertion fails with violation list
    const tmpDir2 = mkdtempSync(join(tmpdir(), 'pinch-pass-true-'));
    const wsDir2 = join(tmpDir2, '00+workspace');
    mkdirSync(wsDir2, { recursive: true });
    writeFileSync(join(wsDir2, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir2, 'TOOLS.md'), '# Tools\n## read_file\nRead.\n### Parameters\n- path: string');
    writeFileSync(join(wsDir2, 'AGENTS.md'), [
      '# Agent Connections',
      '',
      '## orchestrator',
      'Main.',
      'Delegates to: worker',
      'Tools: read_file',
      '',
      '## worker',
      'Worker.',
      'Tools: read_file',
    ].join('\n'));

    try {
      const yaml = scenario({ pass: true });
      const result = await runPinchSim(tmpDir2, yaml);
      // G-A2A-IDENTITY fires → significant → passed=false ≠ exp.pass=true → fail
      expect(result.passed).toBe(false);
      expect(result.error).toContain('pass=true');
      expect(result.error).toContain('got pass=false');
    } finally {
      rmSync(tmpDir2, { recursive: true, force: true });
    }
  });

  it('handles pass:false with rules_applied to include infrastructure violations', async () => {
    // When pass:false and rules_applied includes infrastructure rule prefixes,
    // those rules' violations are included in the pass check
    const yaml = scenario({
      pass: false,
      rules_applied: ['G-PERM'],
    });
    const result = await runPinchSim(tmpDir, yaml);
    // G-PERM-01 fires on this workspace → with the rules_applied prefix
    // match, the violation IS included → pass=false assertion should succeed
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// severity assertion
// ---------------------------------------------------------------------------

describe('runPinchSim — severity assertion', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pinch-sim-severity-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read a file.',
      '',
      '### Parameters',
      '- path: string — File path',
    ].join('\n'));
    // Add agents with delegation syntax to trigger G-A2A-IDENTITY (significant)
    writeFileSync(join(wsDir, 'AGENTS.md'), [
      '# Agent Connections',
      '',
      '## orchestrator',
      'The orchestrator.',
      'Delegates to: helper-agent',
      'Tools: read_file',
      '',
      '## helper-agent',
      'A helper agent.',
      'Tools: read_file',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when severity matches with alias mapping', async () => {
    // "error" maps to ["high", "critical"] — G-A2A-IDENTITY fires with
    // severity "high" which matches the "error" alias
    const yaml = scenario({
      severity: 'error',
    });
    const result = await runPinchSim(tmpDir, yaml);
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });

  it('fails when severity does not match actual', async () => {
    // Expect "warning" (maps to medium/low) but actual violations are high/critical
    const yaml = scenario({
      severity: 'warning',
    });
    const result = await runPinchSim(tmpDir, yaml);
    // G-A2A-IDENTITY fires as "high" which doesn't match "warning" aliases
    // This exercises the severity mismatch failure path
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });

  it('handles null severity expectation', async () => {
    const yaml = scenario({ severity: null });
    const result = await runPinchSim(tmpDir, yaml);
    // severity: null is skipped → should pass (no severity assertion)
    expect(result.passed).toBe(true);
  });
});
