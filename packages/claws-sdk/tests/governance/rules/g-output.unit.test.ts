/**
 * L0: G-OUTPUT rules — data redaction, URL rules, format validation,
 * chain validation.
 *
 * 2 key tests:
 * 1. G-OUTPUT data redaction flags CONFIDENTIAL in output
 * 2. G-OUTPUT chain validation across multi-step pipelines
 */

import { describe, it, expect } from 'vitest';
import { createGOutputRules } from '../../../src/governance/rules/g-output.js';
import type { CapabilityManifest, ToolCapability } from '../../../src/ir/capability-manifest.js';

function makeTool(overrides: Partial<ToolCapability> & { name: string }): ToolCapability {
  return {
    description: '',
    riskLevel: 'low',
    oboFlag: false,
    classification: 'custom',
    ...overrides,
  };
}

function makeManifest(overrides: Partial<CapabilityManifest> = {}): CapabilityManifest {
  return {
    tools: [],
    skills: [],
    agents: [],
    workflows: [],
    ...overrides,
  };
}

describe('G-OUTPUT rules', () => {
  const rules = createGOutputRules();

  it('creates 4 output guard rules', () => {
    expect(rules).toHaveLength(4);
    expect(rules[0].id).toBe('G-OUTPUT-01');
    expect(rules[1].id).toBe('G-OUTPUT-02');
    expect(rules[2].id).toBe('G-OUTPUT-03');
    expect(rules[3].id).toBe('G-OUTPUT-04');
  });

  it('G-OUTPUT-01: data redaction flags CONFIDENTIAL in output tools', () => {
    const rule = rules.find((r) => r.id === 'G-OUTPUT-01')!;

    // Communication tool that could leak confidential data
    const commTool = makeTool({
      name: 'slack-post',
      description: 'Post message containing CONFIDENTIAL data to Slack channel',
      classification: 'communication',
      oboFlag: true,
    });

    const result = rule.evaluate(makeManifest({ tools: [commTool] }));
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-OUTPUT-01');
    expect(result.violations[0].severity).toBe('critical');
    expect(result.violations[0].message).toContain('redaction');

    // Non-communication tool passes
    const localTool = makeTool({
      name: 'calculator',
      description: 'Perform arithmetic with CONFIDENTIAL numbers',
      classification: 'data',
    });
    const localResult = rule.evaluate(makeManifest({ tools: [localTool] }));
    expect(localResult.passed).toBe(true);
  });

  it('G-OUTPUT-02: URL validation on output channels', () => {
    const rule = rules.find((r) => r.id === 'G-OUTPUT-02')!;

    // Network tool that could exfiltrate to arbitrary URLs
    const netTool = makeTool({
      name: 'http-post',
      description: 'Send HTTP POST request to arbitrary endpoint',
      classification: 'network',
      riskLevel: 'high',
    });

    const result = rule.evaluate(makeManifest({ tools: [netTool] }));
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-OUTPUT-02');
    expect(result.violations[0].severity).toBe('high');
  });

  it('G-OUTPUT-03: format validation for structured outputs', () => {
    const rule = rules.find((r) => r.id === 'G-OUTPUT-03')!;

    // Communication tool needs format validation
    const tool = makeTool({
      name: 'api-response',
      description: 'Send structured response via external API',
      classification: 'communication',
    });

    const result = rule.evaluate(makeManifest({ tools: [tool] }));
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-OUTPUT-03');
    expect(result.violations[0].severity).toBe('medium');
  });

  it('G-OUTPUT-04: chain validation across multi-step pipelines', () => {
    const rule = rules.find((r) => r.id === 'G-OUTPUT-04')!;

    // Workflow with multiple steps but no governance gates between them
    const manifest = makeManifest({
      tools: [
        makeTool({ name: 'fetch-data', description: 'Fetch from external source', classification: 'network' }),
        makeTool({ name: 'process', description: 'Process data locally', classification: 'data' }),
        makeTool({ name: 'send-result', description: 'Send processed result', classification: 'communication' }),
      ],
      workflows: [
        {
          name: 'data-pipeline',
          description: 'Fetch, process, and send data',
          steps: ['fetch', 'process', 'send'],
          requiresApproval: false,
        },
      ],
    });

    const result = rule.evaluate(manifest);
    // Multi-step pipeline with network->communication chain needs governance gates
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-OUTPUT-04');
    expect(result.violations[0].severity).toBe('high');
    expect(result.violations[0].message).toContain('chain');

    // Workflow with approval gates passes
    const approvedManifest = makeManifest({
      tools: [
        makeTool({ name: 'fetch-data', description: 'Fetch from external source', classification: 'network' }),
        makeTool({ name: 'send-result', description: 'Send processed result', classification: 'communication' }),
      ],
      workflows: [
        {
          name: 'approved-pipeline',
          description: 'Fetch and send with approval',
          steps: ['fetch', 'approve', 'send'],
          requiresApproval: true,
        },
      ],
    });

    const approvedResult = rule.evaluate(approvedManifest);
    expect(approvedResult.passed).toBe(true);
  });

  it('empty manifest passes all output rules', () => {
    const emptyManifest = makeManifest();
    for (const rule of rules) {
      const result = rule.evaluate(emptyManifest);
      expect(result.passed).toBe(true);
    }
  });
});
