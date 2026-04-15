/**
 * L0 unit tests for governance templates.
 *
 * 4 tests — one per template verifying valid policy YAML output.
 */

import { describe, it, expect } from 'vitest';

import {
  getTemplate,
  listTemplateNames,
  TemplateNotFoundError,
} from '@bic/claws-sdk/init';

describe('template registry', () => {
  it('minimal template produces zero policies and trust tier override', () => {
    const t = getTemplate('minimal');
    expect(t).toBeDefined();
    expect(t!.name).toBe('minimal');
    expect(t!.policies).toHaveLength(0);
    expect(t!.configOverrides.trustTier).toBe(2);
  });

  it('soc2 template produces 5 valid policy files', () => {
    const t = getTemplate('soc2');
    expect(t).toBeDefined();
    expect(t!.name).toBe('soc2');
    expect(t!.policies).toHaveLength(5);

    const names = t!.policies.map((p) => p.name);
    expect(names).toContain('require_section.yaml');
    expect(names).toContain('tool_blocklist.yaml');
    expect(names).toContain('trust_tier_gate.yaml');
    expect(names).toContain('pii_detection.yaml');
    expect(names).toContain('budget_ceiling.yaml');

    // Each policy content starts with a YAML comment and has policy: key
    for (const p of t!.policies) {
      expect(p.content).toMatch(/^#/);
      expect(p.content).toContain('policy:');
      expect(p.content).toContain('framework: soc2');
    }
  });

  it('hipaa template produces 4 valid policy files with PHI detection and data labeling', () => {
    const t = getTemplate('hipaa');
    expect(t).toBeDefined();
    expect(t!.name).toBe('hipaa');
    expect(t!.policies).toHaveLength(4);

    const names = t!.policies.map((p) => p.name);
    expect(names).toContain('data_labeling_mandatory.yaml');
    expect(names).toContain('phi_detection.yaml');
    expect(names).toContain('audit_mandatory.yaml');
    expect(names).toContain('access_control.yaml');

    for (const p of t!.policies) {
      expect(p.content).toContain('framework: hipaa');
    }
  });

  it('eu-ai-act template produces 3 valid policy files with risk classification and oversight', () => {
    const t = getTemplate('eu-ai-act');
    expect(t).toBeDefined();
    expect(t!.name).toBe('eu-ai-act');
    expect(t!.policies).toHaveLength(3);

    const names = t!.policies.map((p) => p.name);
    expect(names).toContain('risk_classification_mandatory.yaml');
    expect(names).toContain('human_oversight_gates.yaml');
    expect(names).toContain('transparency.yaml');

    for (const p of t!.policies) {
      expect(p.content).toContain('framework: eu-ai-act');
    }
  });
});

describe('template lookup', () => {
  it('lists all 4 available templates', () => {
    const names = listTemplateNames();
    expect(names).toHaveLength(4);
    expect(names).toContain('minimal');
    expect(names).toContain('soc2');
    expect(names).toContain('hipaa');
    expect(names).toContain('eu-ai-act');
  });

  it('returns undefined for unknown template', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  it('TemplateNotFoundError includes available templates', () => {
    const err = new TemplateNotFoundError('bogus');
    expect(err.templateName).toBe('bogus');
    expect(err.availableTemplates).toContain('soc2');
    expect(err.message).toContain('bogus');
    expect(err.message).toContain('Available templates');
  });
});
