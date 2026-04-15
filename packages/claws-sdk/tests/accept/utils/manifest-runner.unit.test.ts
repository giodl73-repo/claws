/**
 * L0: manifest-runner — runner dispatch, compatibility checks, and single scenario execution.
 *
 * Tests manifest-runner utility functions in isolation. Does not require
 * the real design/claws/scenarios/ manifest — uses synthetic scenarios.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getRunnerForType,
  isCompatible,
  runSingleScenario,
  runFromManifest,
  discoverSeriesScenarios,
  CLAWS_RUNNER_TYPES,
  type ClawsRunnerType,
} from './manifest-runner.js';
import type { ScenarioYaml } from './scenario-loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scenario(expect: Record<string, unknown>, overrides?: Partial<ScenarioYaml>): ScenarioYaml {
  return {
    name: 'test-scenario',
    series: 'test-series',
    expect,
    ...overrides,
  } as ScenarioYaml;
}

// ---------------------------------------------------------------------------
// isCompatible
// ---------------------------------------------------------------------------

describe('isCompatible()', () => {
  describe('compile-sim', () => {
    it('compatible when governance_ir is present', () => {
      expect(isCompatible('compile-sim', scenario({ governance_ir: { version: 1 } }))).toBe(true);
    });

    it('compatible when violations is present', () => {
      expect(isCompatible('compile-sim', scenario({ violations: [] }))).toBe(true);
    });

    it('compatible when artifacts is present', () => {
      expect(isCompatible('compile-sim', scenario({ artifacts: { count: 2 } }))).toBe(true);
    });

    it('incompatible when none of the expected fields present', () => {
      expect(isCompatible('compile-sim', scenario({ pass: true }))).toBe(false);
    });
  });

  describe('pinch-sim', () => {
    it('compatible when rules_applied is present', () => {
      expect(isCompatible('pinch-sim', scenario({ rules_applied: ['G-PERM-01'] }))).toBe(true);
    });

    it('compatible when pass is present', () => {
      expect(isCompatible('pinch-sim', scenario({ pass: false }))).toBe(true);
    });

    it('incompatible without pinch-specific fields', () => {
      expect(isCompatible('pinch-sim', scenario({ governance_ir: {} }))).toBe(false);
    });
  });

  describe('emit-sim', () => {
    it('compatible when artifacts is present', () => {
      expect(isCompatible('emit-sim', scenario({ artifacts: { count: 3 } }))).toBe(true);
    });

    it('compatible when plugin_hooks is present', () => {
      expect(isCompatible('emit-sim', scenario({ plugin_hooks: ['onToolCall'] }))).toBe(true);
    });

    it('compatible when skill_content is present', () => {
      expect(isCompatible('emit-sim', scenario({ skill_content: 'some content' }))).toBe(true);
    });

    it('compatible when approvals is present', () => {
      expect(isCompatible('emit-sim', scenario({ approvals: [] }))).toBe(true);
    });

    it('incompatible without emit-specific fields', () => {
      expect(isCompatible('emit-sim', scenario({ pass: true }))).toBe(false);
    });
  });

  describe('fleet-sim', () => {
    it('compatible when workspaces is present', () => {
      expect(isCompatible('fleet-sim', scenario({ workspaces: { count: 5 } }))).toBe(true);
    });

    it('incompatible without workspaces', () => {
      expect(isCompatible('fleet-sim', scenario({ governance_ir: {} }))).toBe(false);
    });
  });

  describe('security-sim', () => {
    it('compatible when attack_class is present', () => {
      expect(isCompatible('security-sim', scenario({ attack_class: 'injection' }))).toBe(true);
    });

    it('compatible when defense_layer is present', () => {
      expect(isCompatible('security-sim', scenario({ defense_layer: 'input-validation' }))).toBe(true);
    });

    it('compatible when blocked is present', () => {
      expect(isCompatible('security-sim', scenario({ blocked: true }))).toBe(true);
    });

    it('incompatible without security-specific fields', () => {
      expect(isCompatible('security-sim', scenario({ governance_ir: {} }))).toBe(false);
    });
  });

  it('returns false for unknown runner type', () => {
    // Force a type cast to test the default branch
    expect(isCompatible('unknown-sim' as ClawsRunnerType, scenario({ governance_ir: {} }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRunnerForType
// ---------------------------------------------------------------------------

describe('getRunnerForType()', () => {
  it('returns registration for each runner type', () => {
    for (const type of CLAWS_RUNNER_TYPES) {
      const runner = getRunnerForType(type);
      expect(runner).toBeDefined();
      expect(runner.name).toBe(type);
    }
  });

  it('throws for unknown runner type', () => {
    expect(() => getRunnerForType('bogus-sim' as ClawsRunnerType)).toThrow(
      'Unknown runner type: bogus-sim',
    );
  });

  it('marks fleet-sim as stub', () => {
    const runner = getRunnerForType('fleet-sim');
    expect(runner.stub).toBe(true);
  });

  it('marks compile-sim as not stub', () => {
    const runner = getRunnerForType('compile-sim');
    expect(runner.stub).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runSingleScenario
// ---------------------------------------------------------------------------

describe('runSingleScenario()', () => {
  it('returns skip result for stub runner (fleet-sim)', async () => {
    const yaml = scenario({ workspaces: { count: 2 } });
    const result = await runSingleScenario('/some/dir', yaml, 'fleet-sim');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.some(d => d.includes('SKIPPED'))).toBe(true);
  });

  it('returns skip result for incompatible runner', async () => {
    // compile-sim is not compatible with a scenario that only has pass
    const yaml = scenario({ pass: true });
    const result = await runSingleScenario('/some/dir', yaml, 'compile-sim');
    expect(result.passed).toBe(true);
    expect(result.diagnostics!.some(d => d.includes('not compatible'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// discoverSeriesScenarios — uses real manifest
// ---------------------------------------------------------------------------

describe('discoverSeriesScenarios()', () => {
  it('discovers compile-pipeline series scenarios', () => {
    const scenarios = discoverSeriesScenarios('compile-pipeline');
    expect(scenarios.length).toBeGreaterThanOrEqual(8);
    // Each scenario has info, yaml, and runners
    for (const s of scenarios) {
      expect(s.info).toBeDefined();
      expect(s.info.series).toBe('compile-pipeline');
      expect(s.runners).toContain('compile-sim');
    }
  });

  it('discovers governance-rules series scenarios', () => {
    const scenarios = discoverSeriesScenarios('governance-rules');
    expect(scenarios.length).toBeGreaterThanOrEqual(12);
    for (const s of scenarios) {
      expect(s.runners).toContain('pinch-sim');
    }
  });

  it('loads yaml for each scenario', () => {
    const scenarios = discoverSeriesScenarios('compile-pipeline');
    const withYaml = scenarios.filter(s => s.yaml !== null);
    expect(withYaml.length).toBeGreaterThan(0);
    // First scenario with yaml should have name and expect
    const first = withYaml[0]!;
    expect(first.yaml!.name).toBeDefined();
    expect(first.yaml!.expect).toBeDefined();
  });

  it('throws for nonexistent series', () => {
    expect(() => discoverSeriesScenarios('nonexistent-series')).toThrow(
      'Series "nonexistent-series" not found',
    );
  });

  it('accepts custom basePath', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'manifest-runner-'));
    try {
      // Empty base path — should return empty but not throw
      const scenarios = discoverSeriesScenarios('compile-pipeline', { basePath: tmpDir });
      expect(scenarios).toEqual([]);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// runFromManifest — exercises the full manifest runner loop
// ---------------------------------------------------------------------------

describe('runFromManifest()', () => {
  it('throws for nonexistent series', async () => {
    await expect(runFromManifest('nonexistent-series')).rejects.toThrow(
      'Series "nonexistent-series" not found',
    );
  });

  it('runs compile-pipeline series and returns results', async () => {
    // Run with default basePath (real scenarios). This exercises the full
    // runFromManifest loop including runner dispatch, compatibility checks,
    // and result collection.
    const results = await runFromManifest('compile-pipeline');

    expect(results.length).toBeGreaterThanOrEqual(8);
    for (const r of results) {
      expect(r.scenario).toBeDefined();
      expect(r.scenario.series).toBe('compile-pipeline');
      expect(typeof r.passed).toBe('boolean');
      expect(typeof r.skipped).toBe('boolean');
      expect(r.results.length).toBeGreaterThan(0);
    }
  }, 30_000); // 30s timeout for full pipeline execution

  it('throws when series has fewer scenarios than min', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'manifest-min-'));
    try {
      // Empty basePath has zero scenarios but compile-pipeline requires min 8
      await expect(
        runFromManifest('compile-pipeline', { basePath: tmpDir }),
      ).rejects.toThrow('requires min');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
