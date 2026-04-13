/**
 * L0: G-DATA rules — sensitivity labels with high-water-mark enforcement.
 *
 * 2 unit tests:
 * 1. G-DATA labels with high-water-mark enforcement
 * 2. G-DATA distinguishes "no labels" from "PUBLIC"
 */

import { describe, it, expect } from 'vitest';
import {
  createGDataRules,
  SENSITIVITY_ORDER,
  type DataConfig,
  type DataFlowEntry,
  type SensitivityLabel,
} from '../../../src/governance/rules/g-data.js';
import type { CapabilityManifest, ToolCapability } from '../../../src/ir/capability-manifest.js';

function makeTool(name: string, desc = ''): ToolCapability {
  return {
    name,
    description: desc,
    riskLevel: 'low',
    oboFlag: false,
    classification: 'custom',
  };
}

function makeManifest(tools: ToolCapability[]): CapabilityManifest {
  return { tools, skills: [], agents: [], workflows: [] };
}

describe('SENSITIVITY_ORDER', () => {
  it('orders labels from least to most sensitive', () => {
    expect(SENSITIVITY_ORDER.PUBLIC).toBe(0);
    expect(SENSITIVITY_ORDER.INTERNAL).toBe(1);
    expect(SENSITIVITY_ORDER.CONFIDENTIAL).toBe(2);
    expect(SENSITIVITY_ORDER.RESTRICTED).toBe(3);
  });
});

describe('G-DATA-LABEL', () => {
  it('enforces high-water-mark on data flows', () => {
    const rules = createGDataRules({
      agentCeiling: 'INTERNAL',
      dataFlows: [
        { from: 'db-query', to: 'data-export', label: 'CONFIDENTIAL' },
        { from: 'Read', to: 'Write', label: 'PUBLIC' },
      ],
    });

    const labelRule = rules.find((r) => r.id === 'G-DATA-LABEL')!;
    expect(labelRule).toBeDefined();

    const manifest = makeManifest([
      makeTool('db-query', 'Query database'),
      makeTool('data-export', 'Export data'),
      makeTool('Read', 'Read files'),
      makeTool('Write', 'Write files'),
    ]);

    const result = labelRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    // CONFIDENTIAL exceeds INTERNAL ceiling
    expect(result.violations.length).toBe(1);
    expect(result.violations[0]!.message).toContain('CONFIDENTIAL');
    expect(result.violations[0]!.message).toContain('INTERNAL');
    expect(result.violations[0]!.severity).toBe('critical');
  });

  it('passes when all flows are within ceiling', () => {
    const rules = createGDataRules({
      agentCeiling: 'CONFIDENTIAL',
      dataFlows: [
        { from: 'db-query', to: 'data-export', label: 'INTERNAL' },
        { from: 'Read', to: 'Write', label: 'PUBLIC' },
      ],
    });

    const labelRule = rules.find((r) => r.id === 'G-DATA-LABEL')!;
    const manifest = makeManifest([
      makeTool('db-query'),
      makeTool('data-export'),
      makeTool('Read'),
      makeTool('Write'),
    ]);

    const result = labelRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });

  it('handles RESTRICTED ceiling (allows everything)', () => {
    const rules = createGDataRules({
      agentCeiling: 'RESTRICTED',
      dataFlows: [
        { from: 'a', to: 'b', label: 'RESTRICTED' },
        { from: 'c', to: 'd', label: 'CONFIDENTIAL' },
      ],
    });

    const labelRule = rules.find((r) => r.id === 'G-DATA-LABEL')!;
    const manifest = makeManifest([
      makeTool('a'), makeTool('b'), makeTool('c'), makeTool('d'),
    ]);

    const result = labelRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});

describe('G-DATA-NOLABEL', () => {
  it('distinguishes "no labels declared" from "labels declared as PUBLIC"', () => {
    const rules = createGDataRules({
      agentCeiling: undefined,
      dataFlows: [
        { from: 'Read', to: 'Write', label: 'INTERNAL' },
      ],
    });

    const nolabelRule = rules.find((r) => r.id === 'G-DATA-NOLABEL')!;
    expect(nolabelRule).toBeDefined();

    const manifest = makeManifest([
      makeTool('Read'),
      makeTool('Write'),
    ]);

    const result = nolabelRule.evaluate(manifest);
    // No ceiling declared => defaults to PUBLIC (least privilege) => INTERNAL exceeds it
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.message).toMatch(/no.*label|undeclared/i);
    expect(result.violations[0]!.severity).toBe('medium');
    expect(result.violations[0]!.remediation).toMatch(/AGENTS\.md|ceiling/i);
  });

  it('passes when ceiling is explicitly declared (even as PUBLIC)', () => {
    const rules = createGDataRules({
      agentCeiling: 'PUBLIC',
      dataFlows: [
        { from: 'Read', to: 'Write', label: 'PUBLIC' },
      ],
    });

    const nolabelRule = rules.find((r) => r.id === 'G-DATA-NOLABEL')!;
    const manifest = makeManifest([
      makeTool('Read'),
      makeTool('Write'),
    ]);

    const result = nolabelRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });

  it('treats missing ceiling as PUBLIC for enforcement', () => {
    const rules = createGDataRules({
      agentCeiling: undefined,
      dataFlows: [
        { from: 'Read', to: 'Write', label: 'PUBLIC' },
      ],
    });

    const nolabelRule = rules.find((r) => r.id === 'G-DATA-NOLABEL')!;
    const manifest = makeManifest([
      makeTool('Read'),
      makeTool('Write'),
    ]);

    // PUBLIC flow with undeclared ceiling => still warns about no labels
    const result = nolabelRule.evaluate(manifest);
    // This should still flag a warning because the ceiling is not declared
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.severity).toBe('medium');
  });
});
