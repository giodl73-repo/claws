/**
 * L0: G-CONTEXT rules — context isolation for injection defense.
 *
 * 4 rules: boundary markers, tool isolation, memory isolation, skill isolation.
 */

import { describe, it, expect } from 'vitest';
import { createGContextRules } from '../../../src/governance/rules/g-context.js';
import type { CapabilityManifest } from '../../../src/ir/capability-manifest.js';

function emptyManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return { tools: [], skills: [], agents: [], workflows: [], ...overrides };
}

describe('G-CONTEXT rules', () => {
  const rules = createGContextRules();

  it('creates 4 rules with correct IDs', () => {
    expect(rules).toHaveLength(4);
    const ids = rules.map((r) => r.id);
    expect(ids).toEqual(['G-CONTEXT-01', 'G-CONTEXT-02', 'G-CONTEXT-03', 'G-CONTEXT-04']);
  });

  describe('G-CONTEXT-01: Boundary Markers', () => {
    const rule = rules[0]!;

    it('passes for single-agent workspace', () => {
      const manifest = emptyManifest({
        agents: [{ name: 'main', description: '', delegations: [], maxAutonomousLevel: 3 }],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(true);
    });

    it('passes for multi-agent without delegations', () => {
      const manifest = emptyManifest({
        agents: [
          { name: 'a1', description: '', delegations: [], maxAutonomousLevel: 3 },
          { name: 'a2', description: '', delegations: [], maxAutonomousLevel: 3 },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(true);
    });

    it('flags multi-agent workspace with active delegations', () => {
      const manifest = emptyManifest({
        agents: [
          {
            name: 'orchestrator', description: '',
            delegations: [{ from: 'orchestrator', to: 'worker', permissions: ['READ'] }],
            maxAutonomousLevel: 3,
          },
          { name: 'worker', description: '', delegations: [], maxAutonomousLevel: 2 },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.ruleId).toBe('G-CONTEXT-01');
      expect(result.violations[0]!.severity).toBe('high');
    });
  });

  describe('G-CONTEXT-02: Tool Isolation', () => {
    const rule = rules[1]!;

    it('passes for single-agent workspace', () => {
      const manifest = emptyManifest({
        agents: [{ name: 'a', description: '', delegations: [], maxAutonomousLevel: 3 }],
      });
      expect(rule.evaluate(manifest).passed).toBe(true);
    });

    it('flags EXECUTE delegation in multi-agent setup', () => {
      const manifest = emptyManifest({
        agents: [
          {
            name: 'lead', description: '',
            delegations: [{ from: 'lead', to: 'exec', permissions: ['EXECUTE'] }],
            maxAutonomousLevel: 4,
          },
          { name: 'exec', description: '', delegations: [], maxAutonomousLevel: 4 },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(false);
      expect(result.violations[0]!.ruleId).toBe('G-CONTEXT-02');
      expect(result.violations[0]!.message).toContain('EXECUTE');
    });

    it('passes for non-EXECUTE delegations', () => {
      const manifest = emptyManifest({
        agents: [
          {
            name: 'a', description: '',
            delegations: [{ from: 'a', to: 'b', permissions: ['READ'] }],
            maxAutonomousLevel: 3,
          },
          { name: 'b', description: '', delegations: [], maxAutonomousLevel: 3 },
        ],
      });
      expect(rule.evaluate(manifest).passed).toBe(true);
    });
  });

  describe('G-CONTEXT-03: Memory Isolation', () => {
    const rule = rules[2]!;

    it('flags WRITE delegation in multi-agent setup', () => {
      const manifest = emptyManifest({
        agents: [
          {
            name: 'writer', description: '',
            delegations: [{ from: 'writer', to: 'store', permissions: ['WRITE'] }],
            maxAutonomousLevel: 3,
          },
          { name: 'store', description: '', delegations: [], maxAutonomousLevel: 2 },
        ],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(false);
      expect(result.violations[0]!.ruleId).toBe('G-CONTEXT-03');
      expect(result.violations[0]!.message).toContain('WRITE');
    });

    it('passes for READ-only delegations', () => {
      const manifest = emptyManifest({
        agents: [
          {
            name: 'a', description: '',
            delegations: [{ from: 'a', to: 'b', permissions: ['READ'] }],
            maxAutonomousLevel: 3,
          },
          { name: 'b', description: '', delegations: [], maxAutonomousLevel: 3 },
        ],
      });
      expect(rule.evaluate(manifest).passed).toBe(true);
    });
  });

  describe('G-CONTEXT-04: Skill Isolation', () => {
    const rule = rules[3]!;

    it('passes for single-agent workspace with skills', () => {
      const manifest = emptyManifest({
        agents: [{ name: 'a', description: '', delegations: [], maxAutonomousLevel: 3 }],
        skills: [{ name: 'deploy', description: '', requiredTools: [], governanceLevel: 4 }],
      });
      expect(rule.evaluate(manifest).passed).toBe(true);
    });

    it('flags high-governance skills in multi-agent workspace', () => {
      const manifest = emptyManifest({
        agents: [
          { name: 'a', description: '', delegations: [], maxAutonomousLevel: 3 },
          { name: 'b', description: '', delegations: [], maxAutonomousLevel: 3 },
        ],
        skills: [{ name: 'deploy', description: '', requiredTools: [], governanceLevel: 3 }],
      });
      const result = rule.evaluate(manifest);
      expect(result.passed).toBe(false);
      expect(result.violations[0]!.ruleId).toBe('G-CONTEXT-04');
      expect(result.violations[0]!.severity).toBe('medium');
    });

    it('passes for low-governance skills in multi-agent workspace', () => {
      const manifest = emptyManifest({
        agents: [
          { name: 'a', description: '', delegations: [], maxAutonomousLevel: 3 },
          { name: 'b', description: '', delegations: [], maxAutonomousLevel: 3 },
        ],
        skills: [{ name: 'search', description: '', requiredTools: [], governanceLevel: 1 }],
      });
      expect(rule.evaluate(manifest).passed).toBe(true);
    });

    it('passes for empty skills list', () => {
      const manifest = emptyManifest({
        agents: [
          { name: 'a', description: '', delegations: [], maxAutonomousLevel: 3 },
          { name: 'b', description: '', delegations: [], maxAutonomousLevel: 3 },
        ],
      });
      expect(rule.evaluate(manifest).passed).toBe(true);
    });
  });
});
