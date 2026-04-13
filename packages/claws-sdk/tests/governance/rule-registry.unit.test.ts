/**
 * L0: Rule registry — register, lookup, evaluate, extensibility.
 *
 * 4 unit tests:
 * 1. Register a rule and retrieve it by ID
 * 2. Evaluate all registered rules against a manifest
 * 3. Add custom rule without modifying core registry
 * 4. get() returns undefined for unknown rule ID
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRegistry,
  type RuleRegistry,
} from '../../src/governance/rule-registry.js';
import type {
  GovernanceRule,
  RuleResult,
} from '../../src/governance/types.js';
import type { CapabilityManifest } from '../../src/ir/capability-manifest.js';

function emptyManifest(): CapabilityManifest {
  return { tools: [], skills: [], agents: [], workflows: [] };
}

function stubRule(id: string, pass: boolean): GovernanceRule {
  return {
    id,
    name: `Rule ${id}`,
    description: `Stub rule ${id}`,
    evaluate(_manifest: CapabilityManifest): RuleResult {
      return {
        ruleId: id,
        passed: pass,
        violations: pass
          ? []
          : [
              {
                ruleId: id,
                severity: 'medium',
                file: 'TOOLS.md',
                line: 1,
                message: `${id} failed`,
                remediation: `Fix ${id}`,
              },
            ],
      };
    },
  };
}

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  it('registers a rule and retrieves it by ID', () => {
    const rule = stubRule('G-TEST-01', true);
    registry.register(rule);

    const retrieved = registry.get('G-TEST-01');
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('G-TEST-01');
    expect(retrieved!.name).toBe('Rule G-TEST-01');
  });

  it('evaluates all registered rules against a manifest', () => {
    registry.register(stubRule('G-TEST-01', true));
    registry.register(stubRule('G-TEST-02', false));
    registry.register(stubRule('G-TEST-03', true));

    const before = Date.now();
    const results = registry.evaluate(emptyManifest());
    const after = Date.now();
    expect(results).toHaveLength(3);

    const passing = results.filter((r) => r.passed);
    const failing = results.filter((r) => !r.passed);
    expect(passing).toHaveLength(2);
    expect(failing).toHaveLength(1);
    expect(failing[0]!.ruleId).toBe('G-TEST-02');
    expect(failing[0]!.violations).toHaveLength(1);

    // CL-1 + CL-2: Violations must have timestamp and policyVersion
    const violation = failing[0]!.violations[0]!;
    expect(violation.timestamp).toBeDefined();
    expect(violation.timestamp).toBeGreaterThanOrEqual(before);
    expect(violation.timestamp).toBeLessThanOrEqual(after);
    expect(violation.policyVersion).toBe('1.0.0');
  });

  it('adds custom rule without modifying core registry (extensibility)', () => {
    // Simulate: 29 built-in rules already registered
    for (let i = 1; i <= 29; i++) {
      registry.register(stubRule(`BUILTIN-${String(i).padStart(2, '0')}`, true));
    }
    expect(registry.all()).toHaveLength(29);

    // Adding the 30th rule requires only registration, not core code change
    const customRule: GovernanceRule = {
      id: 'CUSTOM-30',
      name: 'Custom Rule 30',
      description: 'A custom rule added via register()',
      evaluate(_manifest: CapabilityManifest): RuleResult {
        return { ruleId: 'CUSTOM-30', passed: true, violations: [] };
      },
    };
    registry.register(customRule);
    expect(registry.all()).toHaveLength(30);
    expect(registry.get('CUSTOM-30')).toBeDefined();

    // Evaluate still works with 30 rules
    const results = registry.evaluate(emptyManifest());
    expect(results).toHaveLength(30);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('returns undefined for unknown rule ID', () => {
    expect(registry.get('NONEXISTENT')).toBeUndefined();
  });

  it('replaces an existing rule on re-register (same ID)', () => {
    const ruleV1 = stubRule('G-REPLACE-01', true);
    registry.register(ruleV1);
    expect(registry.get('G-REPLACE-01')!.name).toBe('Rule G-REPLACE-01');

    const ruleV2: GovernanceRule = {
      id: 'G-REPLACE-01',
      name: 'Replaced Rule',
      description: 'v2',
      evaluate(_manifest: CapabilityManifest): RuleResult {
        return { ruleId: 'G-REPLACE-01', passed: false, violations: [] };
      },
    };
    registry.register(ruleV2);

    // Should not duplicate the ID in the order list
    expect(registry.all()).toHaveLength(1);
    expect(registry.get('G-REPLACE-01')!.name).toBe('Replaced Rule');
  });
});
