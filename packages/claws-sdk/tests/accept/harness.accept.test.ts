/**
 * Acceptance harness infrastructure self-tests.
 *
 * Validates that the harness itself works correctly:
 * - Scenario loader discovers scenarios from docs/scenarios/
 * - Manifest runner dispatches to the correct runner type
 * - Workspace builder loads minimal fixtures
 * - IR assertion helpers correctly validate/reject GovernanceIR
 * - Fleet-sim runner skips with clear message
 *
 * @module claws-sdk/tests/accept/harness
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

import { discoverClawsScenarios, loadScenarioYaml } from './utils/scenario-loader.js';
import { getRunnerForType, CLAWS_RUNNER_TYPES } from './utils/manifest-runner.js';
import { buildWorkspace, type WorkspaceResult } from './utils/workspace-builder.js';
import {
  expectGovernanceIR,
  expectViolations,
  expectArtifacts,
  expectNoForbiddenImports,
} from './utils/expect-ir.js';

// ---------------------------------------------------------------------------
// Scenario Loader
// ---------------------------------------------------------------------------

describe('Scenario Loader', () => {
  const basePath = resolve(__dirname, '../../../..', 'docs', 'scenarios');

  it('discovers 331 scenarios across 30 series', () => {
    const scenarios = discoverClawsScenarios({ basePath });
    // The pulse says 331 across 30 series — allow some tolerance for growth
    expect(scenarios.length).toBeGreaterThanOrEqual(331);
  });

  it('discovers compile-pipeline series with at least 8 scenarios', () => {
    const scenarios = discoverClawsScenarios({ basePath, series: 'compile-pipeline' });
    expect(scenarios.length).toBeGreaterThanOrEqual(8);
  });

  it('discovers governance-rules series with at least 12 scenarios', () => {
    const scenarios = discoverClawsScenarios({ basePath, series: 'governance-rules' });
    expect(scenarios.length).toBeGreaterThanOrEqual(12);
  });

  it('parses scenario.yaml with Zod validation', () => {
    const scenarios = discoverClawsScenarios({ basePath, series: 'compile-pipeline' });
    expect(scenarios.length).toBeGreaterThan(0);

    const first = scenarios[0]!;
    const parsed = loadScenarioYaml(first.dir);
    expect(parsed).toBeDefined();
    expect(parsed!.name).toBeDefined();
    expect(parsed!.series).toBe('compile-pipeline');
    expect(parsed!.expect).toBeDefined();
  });

  it('returns null for scenario without scenario.yaml', () => {
    const parsed = loadScenarioYaml('/nonexistent/path');
    expect(parsed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Manifest Runner
// ---------------------------------------------------------------------------

describe('Manifest Runner', () => {
  it('has runners for all 5 claws runner types', () => {
    expect(CLAWS_RUNNER_TYPES).toContain('compile-sim');
    expect(CLAWS_RUNNER_TYPES).toContain('pinch-sim');
    expect(CLAWS_RUNNER_TYPES).toContain('emit-sim');
    expect(CLAWS_RUNNER_TYPES).toContain('fleet-sim');
    expect(CLAWS_RUNNER_TYPES).toContain('security-sim');
  });

  it('dispatches to correct runner type', () => {
    const compileSim = getRunnerForType('compile-sim');
    expect(compileSim).toBeDefined();
    expect(compileSim.name).toBe('compile-sim');

    const pinchSim = getRunnerForType('pinch-sim');
    expect(pinchSim).toBeDefined();
    expect(pinchSim.name).toBe('pinch-sim');

    const emitSim = getRunnerForType('emit-sim');
    expect(emitSim).toBeDefined();
    expect(emitSim.name).toBe('emit-sim');

    const fleetSim = getRunnerForType('fleet-sim');
    expect(fleetSim).toBeDefined();
    expect(fleetSim.name).toBe('fleet-sim');

    const secSim = getRunnerForType('security-sim');
    expect(secSim).toBeDefined();
    expect(secSim.name).toBe('security-sim');
  });
});

// ---------------------------------------------------------------------------
// Workspace Builder
// ---------------------------------------------------------------------------

describe('Workspace Builder', () => {
  it('returns null when 00+workspace/ does not exist', () => {
    const result = buildWorkspace('/nonexistent/scenario/dir');
    expect(result).toBeNull();
  });

  it('loads minimal fixture (SOUL.md + TOOLS.md)', () => {
    // Use existing minimal fixture in claws-sdk tests
    const fixtureDir = resolve(__dirname, '../fixtures/minimal');
    const result = buildWorkspace(fixtureDir, { fixtureSubdir: '.' });
    expect(result).not.toBeNull();
    expect(result!.workspacePath).toBeDefined();
    expect(result!.files.has('SOUL.md')).toBe(true);
    expect(result!.files.has('TOOLS.md')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IR Assertion Helpers
// ---------------------------------------------------------------------------

describe('IR Assertion Helpers', () => {
  it('expectGovernanceIR validates matching IR', () => {
    const actual = {
      compiler: { compilerVersion: '0.1.0', compiledAt: '2026-01-01T00:00:00Z', schemaVersion: 1 },
      capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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
        haltReason: null,
        hasOboWithoutElicit: false,
        totalConflicts: 0,
      },
    };

    // Should not throw — partial match on version
    expect(() => {
      expectGovernanceIR(actual, { version: 1 });
    }).not.toThrow();
  });

  it('expectGovernanceIR rejects mismatched IR', () => {
    const actual = {
      compiler: { compilerVersion: '0.1.0', compiledAt: '2026-01-01T00:00:00Z', schemaVersion: 2 },
      capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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
        haltReason: null,
        hasOboWithoutElicit: false,
        totalConflicts: 0,
      },
    };

    expect(() => {
      expectGovernanceIR(actual, { version: 1 });
    }).toThrow();
  });

  it('expectViolations matches violation IDs and severities', () => {
    const actual = [
      { ruleId: 'G-CLASS-01', level: 3, message: 'test', target: 'TOOLS.md', diagnosticCode: 'CLAWS-G-CLASS-01', fixSuggestions: [], toolFuzzyMatches: [] },
    ];

    // Match by ruleId
    expect(() => {
      expectViolations(actual, [{ ruleId: 'G-CLASS-01' }]);
    }).not.toThrow();

    // Reject missing ruleId
    expect(() => {
      expectViolations(actual, [{ ruleId: 'G-PERM-01' }]);
    }).toThrow();
  });

  it('expectViolations handles undefined vs empty array', () => {
    // undefined should be treated as empty
    expect(() => {
      expectViolations(undefined, []);
    }).not.toThrow();

    // empty should be treated as empty
    expect(() => {
      expectViolations([], []);
    }).not.toThrow();
  });

  it('expectArtifacts validates count', () => {
    expect(() => {
      expectArtifacts({ count: 3, types: ['plugin', 'skill', 'exec-approvals'] }, { count: 3 });
    }).not.toThrow();

    expect(() => {
      expectArtifacts({ count: 3, types: ['plugin', 'skill', 'exec-approvals'] }, { count: 4 });
    }).toThrow();
  });

  it('expectNoForbiddenImports passes clean code', () => {
    expect(() => {
      expectNoForbiddenImports('const x = 1;\nfunction foo() {}');
    }).not.toThrow();
  });

  it('expectNoForbiddenImports catches @craftworks/ imports', () => {
    expect(() => {
      expectNoForbiddenImports('import { x } from "@craftworks/compiler-sdk";');
    }).toThrow();
  });

  it('expectNoForbiddenImports catches @claws/ imports', () => {
    expect(() => {
      expectNoForbiddenImports('import { x } from "@claws/governance";');
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Fleet-Sim Runner Skip
// ---------------------------------------------------------------------------

describe('Fleet-Sim Runner', () => {
  it('is registered but marked as stub', () => {
    const runner = getRunnerForType('fleet-sim');
    expect(runner).toBeDefined();
    expect(runner.stub).toBe(true);
  });
});
