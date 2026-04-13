/**
 * L0: G-SUPPLY rules — skill signing validation, unsigned skill detection,
 * malicious skill scanning.
 *
 * 2 key tests:
 * 1. G-SUPPLY flags unsigned marketplace skill
 * 2. G-SUPPLY accepts signed skill with valid signature
 */

import { describe, it, expect } from 'vitest';
import { createGSupplyRules } from '../../../src/governance/rules/g-supply.js';
import type { CapabilityManifest, SkillCapability } from '../../../src/ir/capability-manifest.js';

function makeManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return {
    tools: [],
    skills: [],
    agents: [],
    workflows: [],
    ...overrides,
  };
}

function makeSkill(overrides: Partial<SkillCapability> & { name: string }): SkillCapability {
  return {
    description: '',
    requiredTools: [],
    governanceLevel: 1,
    ...overrides,
  };
}

describe('G-SUPPLY rules', () => {
  const rules = createGSupplyRules();

  it('creates 1 supply chain rule', () => {
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('G-SUPPLY-01');
    expect(rules[0].name).toBe('Skill Signing Validation');
  });

  it('G-SUPPLY-01: flags unsigned marketplace skill', () => {
    const rule = rules[0];

    // Skill with marketplace indicators but no signing
    const unsignedSkill = makeSkill({
      name: 'marketplace-tool',
      description: 'A third-party marketplace skill for data processing',
      requiredTools: ['Bash', 'Write'],
      governanceLevel: 3,
    });

    const result = rule.evaluate(makeManifest({ skills: [unsignedSkill] }));
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleId).toBe('G-SUPPLY-01');
    // Unsigned skills are always violations, never advisory-only
    expect(result.violations[0].severity).toBe('critical');
    expect(result.violations[0].message).toContain('unsigned');
    expect(result.violations[0].remediation).toBeTruthy();
  });

  it('G-SUPPLY-01: accepts signed skill with valid signature', () => {
    const rule = rules[0];

    // Skill with governance level 1 (built-in/signed equivalent)
    const signedSkill = makeSkill({
      name: 'built-in-helper',
      description: 'A built-in platform skill',
      requiredTools: ['Read'],
      governanceLevel: 1,
    });

    const result = rule.evaluate(makeManifest({ skills: [signedSkill] }));
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('G-SUPPLY-01: flags skill requiring high-risk tools', () => {
    const rule = rules[0];

    // Skill that requires execution-tier tools
    const riskySkill = makeSkill({
      name: 'deploy-helper',
      description: 'Helper skill for deployment automation',
      requiredTools: ['Bash', 'deploy', 'git-push'],
      governanceLevel: 4,
    });

    const result = rule.evaluate(makeManifest({ skills: [riskySkill] }));
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].severity).toBe('critical');
  });

  it('G-SUPPLY-01: multiple unsigned skills produce multiple violations', () => {
    const rule = rules[0];

    const skills: SkillCapability[] = [
      makeSkill({
        name: 'plugin-a',
        description: 'Third-party plugin A',
        requiredTools: ['Write'],
        governanceLevel: 3,
      }),
      makeSkill({
        name: 'plugin-b',
        description: 'Third-party plugin B from marketplace',
        requiredTools: ['Bash'],
        governanceLevel: 4,
      }),
    ];

    const result = rule.evaluate(makeManifest({ skills }));
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(2);
  });

  it('empty manifest passes supply chain rules', () => {
    const result = rules[0].evaluate(makeManifest());
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
