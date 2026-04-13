/**
 * L0: analyze() unit tests — governance analysis orchestrator.
 *
 * Covers:
 * 1. analyze() with empty registry returns empty analysis
 * 2. analyze() maps violations from rule results with correct severity levels
 * 3. severityToLevel maps all 5 severity strings (critical/high/medium/low/unknown)
 * 4. Multiple rules with multiple violations are flattened correctly
 */

import { describe, it, expect } from 'vitest';
import { analyze } from '../../src/compile/analyze.js';
import { createRegistry } from '../../src/governance/rule-registry.js';
import type { CapabilityManifest } from '../../src/ir/capability-manifest.js';
import type { GovernanceRule, RuleResult } from '../../src/governance/types.js';

function makeManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return {
    tools: [],
    skills: [],
    agents: [],
    workflows: [],
    ...overrides,
  };
}

function makeRule(id: string, violations: Array<{ severity: string; message: string }>): GovernanceRule {
  return {
    id,
    name: `Rule ${id}`,
    description: `Test rule ${id}`,
    evaluate(): RuleResult {
      return {
        ruleId: id,
        passed: violations.length === 0,
        violations: violations.map((v, i) => ({
          ruleId: id,
          severity: v.severity as 'critical' | 'high' | 'medium' | 'low',
          file: 'TOOLS.md',
          line: i + 1,
          message: v.message,
          remediation: 'Fix it',
        })),
      };
    },
  };
}

describe('analyze()', () => {
  it('returns empty analysis with no registered rules', () => {
    const registry = createRegistry();
    const manifest = makeManifest();

    const result = analyze(manifest, registry);

    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.enforcementPlan.blockedTools).toEqual([]);
    expect(result.enforcementPlan.requiredApprovals).toEqual([]);
    expect(result.enforcementPlan.auditOnlyRules).toEqual([]);
    expect(result.enforcementPlan.channelRedactions).toEqual([]);
    expect(result.enforcementPlan.ruleSuppressions).toEqual([]);
    expect(result.reclassificationTable).toEqual([]);
    expect(result.effectiveR5Count).toEqual({ derived: 0, overridden: 0, total: 0 });
  });

  it('maps critical severity to level 5', () => {
    const registry = createRegistry();
    registry.register(makeRule('R-001', [{ severity: 'critical', message: 'critical issue' }]));
    const manifest = makeManifest();

    const result = analyze(manifest, registry);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.level).toBe(5);
    expect(result.violations[0]!.ruleId).toBe('R-001');
    expect(result.violations[0]!.message).toBe('critical issue');
    expect(result.violations[0]!.diagnosticCode).toBe('CLAWS-R-001');
  });

  it('maps high severity to level 4', () => {
    const registry = createRegistry();
    registry.register(makeRule('R-002', [{ severity: 'high', message: 'high issue' }]));

    const result = analyze(makeManifest(), registry);
    expect(result.violations[0]!.level).toBe(4);
  });

  it('maps medium severity to level 3', () => {
    const registry = createRegistry();
    registry.register(makeRule('R-003', [{ severity: 'medium', message: 'medium issue' }]));

    const result = analyze(makeManifest(), registry);
    expect(result.violations[0]!.level).toBe(3);
  });

  it('maps low severity to level 2', () => {
    const registry = createRegistry();
    registry.register(makeRule('R-004', [{ severity: 'low', message: 'low issue' }]));

    const result = analyze(makeManifest(), registry);
    expect(result.violations[0]!.level).toBe(2);
  });

  it('maps unknown severity to level 1 (default)', () => {
    const registry = createRegistry();
    // Pass an unknown severity string — the default branch returns 1
    registry.register(makeRule('R-005', [{ severity: 'info', message: 'info issue' }]));

    const result = analyze(makeManifest(), registry);
    expect(result.violations[0]!.level).toBe(1);
  });

  it('flattens violations from multiple rules', () => {
    const registry = createRegistry();
    registry.register(makeRule('R-A', [
      { severity: 'critical', message: 'A1' },
      { severity: 'high', message: 'A2' },
    ]));
    registry.register(makeRule('R-B', [
      { severity: 'low', message: 'B1' },
    ]));

    const result = analyze(makeManifest(), registry);

    expect(result.violations).toHaveLength(3);
    expect(result.violations[0]!.ruleId).toBe('R-A');
    expect(result.violations[1]!.ruleId).toBe('R-A');
    expect(result.violations[2]!.ruleId).toBe('R-B');
  });

  it('sets target from violation file and fixSuggestions/toolFuzzyMatches as empty arrays', () => {
    const registry = createRegistry();
    registry.register(makeRule('R-006', [{ severity: 'medium', message: 'test' }]));

    const result = analyze(makeManifest(), registry);

    expect(result.violations[0]!.target).toBe('TOOLS.md');
    expect(result.violations[0]!.fixSuggestions).toEqual([]);
    expect(result.violations[0]!.toolFuzzyMatches).toEqual([]);
  });
});
