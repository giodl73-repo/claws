/**
 * L0: G-PERM rules — capability-based permissions matrix.
 */

import { describe, it, expect } from 'vitest';
import { createGPermRules } from '../../../src/governance/rules/g-perm.js';
import type { CapabilityManifest } from '../../../src/ir/capability-manifest.js';

function emptyManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return { tools: [], skills: [], agents: [], workflows: [], ...overrides };
}

describe('G-PERM rules', () => {
  const rules = createGPermRules();

  it('creates 1 rule with ID G-PERM-01', () => {
    expect(rules).toHaveLength(1);
    expect(rules[0]!.id).toBe('G-PERM-01');
  });

  describe('G-PERM-01: Capability Permissions', () => {
    const rule = rules[0]!;

    it('passes for tools without OBO mismatch', () => {
      const manifest = emptyManifest({
        tools: [
          { name: 'Read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('flags OBO tool declared as low risk', () => {
      const manifest = emptyManifest({
        tools: [
          {
            name: 'proxy-send',
            description: 'Send on behalf of user',
            riskLevel: 'low',
            oboFlag: true,
            classification: 'communication',
          },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.ruleId).toBe('G-PERM-01');
      expect(result.violations[0]!.severity).toBe('high');
      expect(result.violations[0]!.remediation).toContain('tighten');
      expect(result.violations[0]!.remediation).toContain('relax');
    });

    it('passes for OBO tool with high risk level', () => {
      const manifest = emptyManifest({
        tools: [
          {
            name: 'proxy-send',
            description: 'Send on behalf of user',
            riskLevel: 'critical',
            oboFlag: true,
            classification: 'communication',
          },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(true);
    });

    it('passes for empty tool list', () => {
      const result = rule.evaluate(emptyManifest());
      expect(result.passed).toBe(true);
    });

    it('flags multiple OBO-low-risk mismatches', () => {
      const manifest = emptyManifest({
        tools: [
          { name: 'tool-a', description: '', riskLevel: 'low', oboFlag: true, classification: 'custom' },
          { name: 'tool-b', description: '', riskLevel: 'low', oboFlag: true, classification: 'custom' },
          { name: 'tool-c', description: '', riskLevel: 'high', oboFlag: true, classification: 'custom' },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });
  });
});
