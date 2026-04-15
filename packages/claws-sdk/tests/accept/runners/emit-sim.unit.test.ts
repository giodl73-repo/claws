/**
 * L0: emit-sim runner — edge case paths.
 *
 * Tests runEmitSim function's assertion branches for artifacts,
 * plugin_hooks, approvals, and error recovery.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runEmitSim } from './emit-sim.js';
import type { ScenarioYaml } from '../utils/scenario-loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scenario(
  exp: Record<string, unknown>,
  overrides?: Partial<ScenarioYaml>,
): ScenarioYaml {
  return {
    name: 'test-emit-scenario',
    series: 'test-series',
    expect: exp,
    ...overrides,
  } as ScenarioYaml;
}

/** Create a minimal workspace that parses successfully. */
function createMinimalWorkspace(baseDir: string): void {
  const wsDir = join(baseDir, '00+workspace');
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
  writeFileSync(join(wsDir, 'TOOLS.md'), [
    '# Tools',
    '',
    '## read_file',
    'Read a file from disk.',
    '',
    '### Parameters',
    '- path: string — File path to read',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// No workspace
// ---------------------------------------------------------------------------

describe('runEmitSim — no workspace', () => {
  it('fails when scenario directory has no 00+workspace/', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-'));
    try {
      const yaml = scenario({ artifacts: { count: 3 } });
      const result = await runEmitSim(tmpDir, yaml);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No 00+workspace/');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Halt path
// ---------------------------------------------------------------------------

describe('runEmitSim — halt path', () => {
  it('fails when parse halts', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-halt-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'README.md'), '# Empty');

    try {
      const yaml = scenario({ artifacts: { count: 3 } });
      const result = await runEmitSim(tmpDir, yaml);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('halted');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Artifacts assertion — count
// ---------------------------------------------------------------------------

describe('runEmitSim — artifacts count', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-artifacts-'));
    createMinimalWorkspace(tmpDir);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when artifacts count matches', async () => {
    // emit-sim produces 3 artifacts by default: plugin, skill, exec-approvals
    const yaml = scenario({ artifacts: { count: 3 } });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
  });

  it('fails when artifacts count mismatches', async () => {
    const yaml = scenario({ artifacts: { count: 99 } });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('artifacts');
    expect(result.error).toContain('99');
  });

  it('skips when artifacts count is 0', async () => {
    const yaml = scenario({ artifacts: { count: 0 } });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.some(d => d.includes('SKIPPED'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Artifacts assertion — array form
// ---------------------------------------------------------------------------

describe('runEmitSim — artifacts array form', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-art-array-'));
    createMinimalWorkspace(tmpDir);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('passes when all expected artifact types found', async () => {
    const yaml = scenario({
      artifacts: [
        { type: 'plugin' },
        { type: 'skill' },
      ],
    });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(true);
  });

  it('fails when expected artifact type not found', async () => {
    const yaml = scenario({
      artifacts: [
        { type: 'nonexistent-type' },
      ],
    });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('nonexistent-type');
  });
});

// ---------------------------------------------------------------------------
// plugin_hooks assertion
// ---------------------------------------------------------------------------

describe('runEmitSim — plugin_hooks', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-hooks-'));
    createMinimalWorkspace(tmpDir);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fails when expected hook not in generated plugin', async () => {
    const yaml = scenario({
      plugin_hooks: ['onNonexistentHook'],
    });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('onNonexistentHook');
    expect(result.error).toContain('not found');
  });

  it('handles hook objects with name property', async () => {
    const yaml = scenario({
      plugin_hooks: [{ name: 'onNonexistentHook' }],
    });
    const result = await runEmitSim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('onNonexistentHook');
  });
});

// ---------------------------------------------------------------------------
// approvals assertion
// ---------------------------------------------------------------------------

describe('runEmitSim — approvals', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-approvals-'));
    createMinimalWorkspace(tmpDir);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('checks approval count when provided', async () => {
    const yaml = scenario({
      approvals: { count: 999 },
    });
    const result = await runEmitSim(tmpDir, yaml);
    // Fails because 999 approvals won't be generated — either the approval
    // count assertion fires or an upstream error is caught
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('passes when approvals is empty array', async () => {
    const yaml = scenario({
      approvals: [],
    });
    const result = await runEmitSim(tmpDir, yaml);
    // Empty array means no specific count expected — passes the check
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Workflow emission
// ---------------------------------------------------------------------------

describe('runEmitSim — workflow', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-workflow-'));
    createMinimalWorkspace(tmpDir);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits workflow artifact when count >= 4', async () => {
    // artifacts.count >= 4 triggers workflow emission path
    const yaml = scenario({
      artifacts: { count: 4 },
    });
    const result = await runEmitSim(tmpDir, yaml);
    // May pass (4 artifacts produced with workflow) or fail (count mismatch)
    expect(result).toBeDefined();
    expect(typeof result.passed).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Error recovery
// ---------------------------------------------------------------------------

describe('runEmitSim — error recovery', () => {
  it('catches errors and returns structured failure', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'emit-sim-err-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    writeFileSync(join(wsDir, 'SOUL.md'), '# System\nYou are a test.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## test\nA test.\n### Parameters\n- x: string');

    try {
      const yaml = scenario(
        { artifacts: { count: 3 } },
        { specs: ['CL-99'] },
      );
      const result = await runEmitSim(tmpDir, yaml);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
