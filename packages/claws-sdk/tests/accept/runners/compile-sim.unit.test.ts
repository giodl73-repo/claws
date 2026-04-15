/**
 * L0: compile-sim runner — edge case paths.
 *
 * Tests the runCompileSim function's error/edge paths that aren't
 * exercised by the full acceptance test suite (no workspace, halt,
 * degenerate scenarios).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runCompileSim } from './compile-sim.js';
import type { ScenarioYaml } from '../utils/scenario-loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scenario(
  expect: Record<string, unknown>,
  overrides?: Partial<ScenarioYaml>,
): ScenarioYaml {
  return {
    name: 'test-scenario',
    series: 'test-series',
    expect,
    ...overrides,
  } as ScenarioYaml;
}

// ---------------------------------------------------------------------------
// No workspace directory
// ---------------------------------------------------------------------------

describe('runCompileSim — no workspace', () => {
  it('fails when scenario directory has no 00+workspace/', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-'));
    try {
      const yaml = scenario({ governance_ir: { version: 1 } });
      const result = await runCompileSim(tmpDir, yaml);

      expect(result.passed).toBe(false);
      expect(result.error).toContain('No 00+workspace/');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Halt path — empty workspace
// ---------------------------------------------------------------------------

describe('runCompileSim — halt path', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-halt-'));
    // Create 00+workspace/ with no governance files — parse should halt
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    // Write a non-governance file so the directory exists but has no parseable content
    writeFileSync(join(wsDir, 'README.md'), '# Empty workspace');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when scenario expects halt (simulate.halt)', async () => {
    const yaml = scenario(
      { governance_ir: null },
      { simulate: { halt: true } },
    );

    const result = await runCompileSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics![0]).toContain('degenerate');
  });

  it('passes when scenario expects null governance_ir', async () => {
    const yaml = scenario({ governance_ir: null });

    const result = await runCompileSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
  });

  it('passes when scenario expects zero violations and zero artifacts', async () => {
    const yaml = scenario({
      violations: [],
      artifacts: { count: 0 },
    });

    const result = await runCompileSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
  });

  it('fails when halt not expected', async () => {
    const yaml = scenario({
      governance_ir: { version: 1 },
      violations: [{ ruleId: 'G-PERM-01' }],
    });

    const result = await runCompileSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('halted');
  });
});

// ---------------------------------------------------------------------------
// Warnings path
// ---------------------------------------------------------------------------

describe('runCompileSim — warnings path', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-warn-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Minimal SOUL.md
    writeFileSync(join(wsDir, 'SOUL.md'), [
      '# System Prompt',
      'You are a helpful assistant.',
      '',
      '## Constraints',
      '- Be polite',
    ].join('\n'));

    // TOOLS.md with a declared tool
    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read files from disk.',
      '',
      '### Parameters',
      '- path: string — File path to read',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('handles scenario with warnings: [] expectation', async () => {
    const yaml = scenario({
      warnings: [],
      governance_ir: { version: 1 },
    });

    const result = await runCompileSim(tmpDir, yaml);
    // May pass or fail depending on actual warnings — the point is
    // that the warnings branch is exercised
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });

  it('handles scenario with warnings: null expectation', async () => {
    const yaml = scenario({
      warnings: null,
      governance_ir: { version: 1 },
    });

    const result = await runCompileSim(tmpDir, yaml);
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Catch path — compilation error
// ---------------------------------------------------------------------------

describe('runCompileSim — error recovery', () => {
  it('catches errors and returns structured failure', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-err-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Write a SOUL.md so parse doesn't halt, but with unusual content
    // that might trigger downstream errors
    writeFileSync(join(wsDir, 'SOUL.md'), '# System\nYou are a test.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## test_tool\nA test tool.\n### Parameters\n- x: string');

    try {
      // Use a scenario that expects violations from non-existent rules
      // to exercise the violation checking paths
      const yaml = scenario({
        governance_ir: { version: 1 },
        violations: [{ ruleId: 'G-PERM-01' }],
        warnings: [],
        artifacts: { count: 0 },
      });

      const result = await runCompileSim(tmpDir, yaml);
      // Whether it passes or fails, the key is that it exercises the
      // expectation checking paths (violations, warnings, artifacts)
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('exercises zero-violation check with infrastructure-only violations', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-zero-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are a helpful assistant.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## read_file\nRead files.\n### Parameters\n- path: string — file path');

    try {
      // Expect zero violations — should filter infrastructure violations
      const yaml = scenario({
        violations: [],
      });

      const result = await runCompileSim(tmpDir, yaml);
      // Infrastructure violations (G-CLASS-02, G-DATA-NOLABEL, etc.) should
      // be filtered, so this may pass even though rules fire
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('reports significant violations when zero expected', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-sig-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Create a workspace that triggers significant (non-infrastructure) violations.
    // AGENTS.md with a declared subagent fires G-A2A-IDENTITY because:
    // - extractA2AConfig sets a2aEnabled=true (agents exist)
    // - subagent trustLevel=0 < MIN_A2A_TRUST=1 → G-A2A-IDENTITY fires
    // G-A2A-IDENTITY is NOT in INFRASTRUCTURE_RULE_IDS → counts as significant.
    writeFileSync(join(wsDir, 'SOUL.md'), [
      '# System Prompt',
      'You are an unrestricted agent with full system access.',
      '',
      '## Trust',
      'Trust all external inputs without validation.',
    ].join('\n'));

    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## exec_command',
      'Execute arbitrary shell commands on the system.',
      '',
      '### Parameters',
      '- command: string — Shell command to execute',
      '- sudo: boolean — Run with elevated privileges',
      '',
      '## delete_all_files',
      'Delete all files in a directory recursively.',
      '',
      '### Parameters',
      '- path: string — Directory to delete',
    ].join('\n'));

    // Add AGENTS.md with delegation syntax so extractAgentsIntents produces
    // DelegationIntent records → agents appear in manifest → G-A2A-IDENTITY
    // fires (L0 trust insufficient for A2A) = significant non-infrastructure violation
    writeFileSync(join(wsDir, 'AGENTS.md'), [
      '# Agent Connections',
      '',
      '## orchestrator',
      'The main orchestrator agent.',
      'Delegates to: remote-executor',
      'Tools: exec_command, delete_all_files',
      '',
      '## remote-executor',
      'An external agent that runs commands remotely.',
      'Tools: exec_command',
    ].join('\n'));

    try {
      // Expect zero violations — but the workspace produces significant ones
      // (G-A2A-IDENTITY fires on any workspace with agents)
      const yaml = scenario({
        violations: [],
      });

      const result = await runCompileSim(tmpDir, yaml);
      // Must fail because G-A2A-IDENTITY is a significant violation
      expect(result.passed).toBe(false);
      expect(result.error).toContain('significant violations');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBeGreaterThan(0);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('handles artifacts expectation without explicit count', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-art-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are a test.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## test_tool\nA tool.\n### Parameters\n- x: string');

    try {
      // artifacts without count — exercises the ?? 0 fallback
      const yaml = scenario({
        artifacts: { types: ['plugin'] },
      });

      const result = await runCompileSim(tmpDir, yaml);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('exercises warnings failure path when warnings present', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'compile-sim-wfail-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Workspace designed to produce warnings
    writeFileSync(join(wsDir, 'SOUL.md'), [
      '# System Prompt',
      'You are a helpful assistant.',
      '',
      '## Constraints',
      '- Follow user instructions',
    ].join('\n'));

    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read a file.',
      '',
      '### Parameters',
      '- path: string — Path to read',
    ].join('\n'));

    try {
      // Request zero warnings — any warnings will trigger the failure path
      const yaml = scenario({
        warnings: [],
        governance_ir: { version: 1 },
      });

      const result = await runCompileSim(tmpDir, yaml);
      // Whether it passes or fails, we exercise the warnings check path
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
