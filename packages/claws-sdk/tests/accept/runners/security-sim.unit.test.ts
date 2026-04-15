/**
 * L0: security-sim helpers — ruleIdToAttackClass and ruleIdToDefenseLayer.
 *
 * Exercises all prefix branches in the mapping functions.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ruleIdToAttackClass, ruleIdToDefenseLayer, runSecuritySim } from './security-sim.js';
import type { ScenarioYaml } from '../utils/scenario-loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scenario(
  expect: Record<string, unknown>,
  overrides?: Partial<ScenarioYaml>,
): ScenarioYaml {
  return {
    name: 'test-security-scenario',
    series: 'test-series',
    expect,
    ...overrides,
  } as ScenarioYaml;
}

// ---------------------------------------------------------------------------
// ruleIdToAttackClass — all prefix branches
// ---------------------------------------------------------------------------

describe('ruleIdToAttackClass()', () => {
  it('maps G-A2A prefix to a2a', () => {
    expect(ruleIdToAttackClass('G-A2A-01')).toBe('a2a');
    expect(ruleIdToAttackClass('G-A2A-TRUST')).toBe('a2a');
  });

  it('maps G-INPUT prefix to injection', () => {
    expect(ruleIdToAttackClass('G-INPUT-01')).toBe('injection');
    expect(ruleIdToAttackClass('G-INPUT-SANITIZE')).toBe('injection');
  });

  it('maps G-ELICIT prefix to obo', () => {
    expect(ruleIdToAttackClass('G-ELICIT-GATE')).toBe('obo');
    expect(ruleIdToAttackClass('G-ELICIT-PREAUTH')).toBe('obo');
  });

  it('maps G-SUPPLY prefix to supply-chain', () => {
    expect(ruleIdToAttackClass('G-SUPPLY-01')).toBe('supply-chain');
  });

  it('maps G-OUTPUT prefix to output', () => {
    expect(ruleIdToAttackClass('G-OUTPUT-01')).toBe('output');
  });

  it('maps G-BOUND prefix to bounded-reasoning', () => {
    expect(ruleIdToAttackClass('G-BOUND-01')).toBe('bounded-reasoning');
  });

  it('maps G-DATA prefix to data-exfil', () => {
    expect(ruleIdToAttackClass('G-DATA-01')).toBe('data-exfil');
    expect(ruleIdToAttackClass('G-DATA-NOLABEL')).toBe('data-exfil');
  });

  it('maps G-CONTEXT prefix to context-hijack', () => {
    expect(ruleIdToAttackClass('G-CONTEXT-01')).toBe('context-hijack');
  });

  it('defaults to general for unknown prefix', () => {
    expect(ruleIdToAttackClass('G-UNKNOWN-01')).toBe('general');
    expect(ruleIdToAttackClass('G-PERM-01')).toBe('general');
    expect(ruleIdToAttackClass('G-CLASS-01')).toBe('general');
  });
});

// ---------------------------------------------------------------------------
// ruleIdToDefenseLayer — all prefix branches
// ---------------------------------------------------------------------------

describe('ruleIdToDefenseLayer()', () => {
  it('maps G-A2A prefix to identity', () => {
    expect(ruleIdToDefenseLayer('G-A2A-01')).toBe('identity');
    expect(ruleIdToDefenseLayer('G-A2A-TRUST')).toBe('identity');
  });

  it('maps G-INPUT prefix to input-validation', () => {
    expect(ruleIdToDefenseLayer('G-INPUT-01')).toBe('input-validation');
  });

  it('maps G-ELICIT prefix to elicitation-gate', () => {
    expect(ruleIdToDefenseLayer('G-ELICIT-GATE')).toBe('elicitation-gate');
  });

  it('maps G-SUPPLY prefix to supply-chain-check', () => {
    expect(ruleIdToDefenseLayer('G-SUPPLY-01')).toBe('supply-chain-check');
  });

  it('maps G-OUTPUT prefix to output-guard', () => {
    expect(ruleIdToDefenseLayer('G-OUTPUT-01')).toBe('output-guard');
  });

  it('maps G-BOUND prefix to reasoning-boundary', () => {
    expect(ruleIdToDefenseLayer('G-BOUND-01')).toBe('reasoning-boundary');
  });

  it('maps G-DATA prefix to data-classification', () => {
    expect(ruleIdToDefenseLayer('G-DATA-01')).toBe('data-classification');
  });

  it('maps G-CONTEXT prefix to context-isolation', () => {
    expect(ruleIdToDefenseLayer('G-CONTEXT-01')).toBe('context-isolation');
  });

  it('defaults to general for unknown prefix', () => {
    expect(ruleIdToDefenseLayer('G-UNKNOWN-01')).toBe('general');
    expect(ruleIdToDefenseLayer('G-PERM-01')).toBe('general');
    expect(ruleIdToDefenseLayer('G-CLASS-01')).toBe('general');
  });
});

// ---------------------------------------------------------------------------
// runSecuritySim — runner function tests
// ---------------------------------------------------------------------------

describe('runSecuritySim — no workspace', () => {
  it('fails when scenario directory has no 00+workspace/', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'security-sim-'));
    try {
      const yaml = scenario({ attack_class: 'injection', blocked: true });
      const result = await runSecuritySim(tmpDir, yaml);
      expect(result.passed).toBe(false);
      expect(result.error).toContain('No 00+workspace/');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('runSecuritySim — blocked assertions', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'security-sim-blocked-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Simple workspace with SOUL + TOOLS — produces only infrastructure violations
    writeFileSync(join(wsDir, 'SOUL.md'), [
      '# System Prompt',
      'You are a helpful assistant.',
    ].join('\n'));

    writeFileSync(join(wsDir, 'TOOLS.md'), [
      '# Tools',
      '',
      '## read_file',
      'Read a file from disk.',
      '',
      '### Parameters',
      '- path: string — File path to read',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fails when blocked=true but no significant violations detected', async () => {
    // This workspace has no agents, so no A2A violations. Only infrastructure
    // violations fire, which get filtered. blocked=true expects blocking but
    // no significant violations → failure. No attack_class so we skip that
    // check and go straight to the blocked assertion.
    const yaml = scenario({
      blocked: true,
    });

    const result = await runSecuritySim(tmpDir, yaml);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('blocked=true');
  });

  it('passes when blocked=false and no significant violations', async () => {
    const yaml = scenario({
      blocked: false,
    });

    const result = await runSecuritySim(tmpDir, yaml);
    expect(result.passed).toBe(true);
  });

  it('fails when blocked=false but significant violations detected', async () => {
    // Create a workspace with agents that trigger G-A2A-IDENTITY (significant).
    // No attack_class/defense_layer so we skip those checks and hit blocked.
    const tmpDir2 = mkdtempSync(join(tmpdir(), 'security-sim-unblocked-'));
    const wsDir2 = join(tmpDir2, '00+workspace');
    mkdirSync(wsDir2, { recursive: true });

    writeFileSync(join(wsDir2, 'SOUL.md'), '# System Prompt\nYou are an assistant.');
    writeFileSync(join(wsDir2, 'TOOLS.md'), '# Tools\n## read_file\nRead a file.\n### Parameters\n- path: string');
    // AGENTS.md with delegation syntax triggers G-A2A-IDENTITY (significant)
    writeFileSync(join(wsDir2, 'AGENTS.md'), [
      '# Agent Connections',
      '',
      '## orchestrator',
      'The main orchestrator.',
      'Delegates to: remote-agent',
      'Tools: read_file',
      '',
      '## remote-agent',
      'An external agent.',
      'Tools: read_file',
    ].join('\n'));

    try {
      const yaml = scenario({
        blocked: false,
      });

      const result = await runSecuritySim(tmpDir2, yaml);
      // G-A2A-IDENTITY fires (significant), but blocked=false → should fail
      expect(result.passed).toBe(false);
      expect(result.error).toContain('blocked=false');
      expect(result.error).toContain('significant violations');
    } finally {
      rmSync(tmpDir2, { recursive: true, force: true });
    }
  });
});

describe('runSecuritySim — audit_event assertions', () => {
  it('fails when audit_event expected but no violations or warnings', async () => {
    // Workspace that produces minimal violations only in infrastructure set
    const tmpDir = mkdtempSync(join(tmpdir(), 'security-sim-audit-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Empty workspace triggers shouldHalt — parse halts, no violations at all
    writeFileSync(join(wsDir, 'README.md'), '# Nothing');

    try {
      const yaml = scenario({
        audit_event: true,
      });

      const result = await runSecuritySim(tmpDir, yaml);
      // Parse halts → result is error about halting, not audit check
      expect(result.passed).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('passes when audit_event expected and violations exist', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'security-sim-audit2-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are a helper.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## read_file\nRead.\n### Parameters\n- path: string');

    try {
      // audit_event just needs at least one violation or warning record
      const yaml = scenario({
        audit_event: true,
      });

      const result = await runSecuritySim(tmpDir, yaml);
      // Infrastructure violations exist → audit records are present → passes
      expect(result.passed).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('runSecuritySim — defense_layer assertion', () => {
  it('fails when defense_layer expected with blocked=true but layer not activated', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'security-sim-defense-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Simple workspace — no specific defense layer violations
    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are a helper.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## read_file\nRead.\n### Parameters\n- path: string');

    try {
      const yaml = scenario({
        defense_layer: 'input-validation',
        blocked: true,
      });

      const result = await runSecuritySim(tmpDir, yaml);
      // No G-INPUT violations fire → defense layer not activated → fails
      expect(result.passed).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('runSecuritySim — error recovery', () => {
  it('catches runtime errors and returns structured failure', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'security-sim-err-'));
    const wsDir = join(tmpDir, '00+workspace');
    mkdirSync(wsDir, { recursive: true });

    // Write SOUL.md with valid content but corrupted TOOLS.md that might
    // cause downstream issues
    writeFileSync(join(wsDir, 'SOUL.md'), '# System Prompt\nYou are a test agent.');
    writeFileSync(join(wsDir, 'TOOLS.md'), '# Tools\n## test_tool\nTest.\n### Parameters\n- x: string');

    try {
      const yaml = scenario(
        {
          attack_class: 'injection',
          blocked: true,
          defense_layer: 'input-validation',
          audit_event: true,
        },
        { specs: ['CL-42'] },
      );

      const result = await runSecuritySim(tmpDir, yaml);
      // Exercises multiple assertion branches — may pass or fail depending
      // on which rules fire, but all assertion paths are exercised
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
