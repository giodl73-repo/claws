/**
 * L0: G-A2A rules — A2A trust boundaries, identity, delegation, flow, escalation.
 *
 * 5 unit tests:
 * 1. G-A2A-IDENTITY warns when L0 default insufficient for configured A2A
 * 2. G-A2A-TRUST detects subagent trust violations
 * 3. G-A2A-DELEGATE flags phantom tools via FE6 cross-reference
 * 4. G-A2A-FLOW enforces data flow ceiling on SENT data only
 * 5. G-A2A-ESCALATE severity always error even in advisory mode
 */

import { describe, it, expect } from 'vitest';
import {
  createGA2ARules,
  type A2AConfig,
  type SubagentDeclaration,
} from '../../../src/governance/rules/g-a2a.js';
import type {
  CapabilityManifest,
  ToolCapability,
  AgentCapability,
} from '../../../src/ir/capability-manifest.js';

function makeTool(name: string, desc = '', obo = false): ToolCapability {
  return {
    name,
    description: desc,
    riskLevel: 'low',
    oboFlag: obo,
    classification: 'custom',
  };
}

function makeAgent(
  name: string,
  delegations: AgentCapability['delegations'] = [],
  maxLevel: AgentCapability['maxAutonomousLevel'] = 1,
): AgentCapability {
  return {
    name,
    description: `Agent: ${name}`,
    delegations,
    maxAutonomousLevel: maxLevel,
  };
}

function makeManifest(
  tools: ToolCapability[] = [],
  agents: AgentCapability[] = [],
): CapabilityManifest {
  return { tools, skills: [], agents, workflows: [] };
}

describe('G-A2A-IDENTITY', () => {
  it('warns when L0 default insufficient for configured A2A', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'worker', trustLevel: 0, tools: ['Read'], dataCeiling: 'INTERNAL' },
      ],
      parentTrustLevel: 0,
      a2aEnabled: true,
    });

    const identityRule = rules.find((r) => r.id === 'G-A2A-IDENTITY')!;
    expect(identityRule).toBeDefined();

    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('worker')],
    );

    const result = identityRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0]!.severity).toBe('high');
    expect(result.violations[0]!.message).toContain('L0');
  });

  it('passes when trust level is sufficient for A2A', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'worker', trustLevel: 2, tools: ['Read'], dataCeiling: 'INTERNAL' },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
    });

    const identityRule = rules.find((r) => r.id === 'G-A2A-IDENTITY')!;
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('worker')],
    );

    const result = identityRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});

describe('G-A2A-TRUST', () => {
  it('detects subagent trust violations', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'worker', trustLevel: 3, tools: ['Read'], dataCeiling: 'INTERNAL' },
      ],
      parentTrustLevel: 2,
      a2aEnabled: true,
    });

    const trustRule = rules.find((r) => r.id === 'G-A2A-TRUST')!;
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('worker')],
    );

    const result = trustRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0]!.message).toContain('worker');
    expect(result.violations[0]!.message).toMatch(/trust/i);
  });
});

describe('G-A2A-DELEGATE', () => {
  it('flags phantom tools via FE6 cross-reference', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'phantom-agent', trustLevel: 1, tools: ['magic-wand', 'time-travel'], dataCeiling: 'PUBLIC' },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
    });

    const delegateRule = rules.find((r) => r.id === 'G-A2A-DELEGATE')!;
    expect(delegateRule).toBeDefined();

    // Manifest only has Read — magic-wand and time-travel are phantom
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('phantom-agent')],
    );

    const result = delegateRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(2);
    const toolNames = result.violations.map((v) => v.message);
    expect(toolNames.some((m) => m.includes('magic-wand'))).toBe(true);
    expect(toolNames.some((m) => m.includes('time-travel'))).toBe(true);
    expect(result.violations.every((v) => v.severity === 'critical')).toBe(true);
  });

  it('passes when all delegated tools exist in manifest', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'reader', trustLevel: 1, tools: ['Read', 'Grep'], dataCeiling: 'PUBLIC' },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
    });

    const delegateRule = rules.find((r) => r.id === 'G-A2A-DELEGATE')!;
    const manifest = makeManifest(
      [makeTool('Read'), makeTool('Grep')],
      [makeAgent('reader')],
    );

    const result = delegateRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});

describe('G-A2A-FLOW', () => {
  it('enforces data flow ceiling on SENT data only', () => {
    const rules = createGA2ARules({
      subagents: [
        {
          name: 'researcher',
          trustLevel: 1,
          tools: ['Read'],
          dataCeiling: 'INTERNAL',
          sendsData: true,
          sendsCeiling: 'CONFIDENTIAL',
        },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
    });

    const flowRule = rules.find((r) => r.id === 'G-A2A-FLOW')!;
    expect(flowRule).toBeDefined();

    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('researcher')],
    );

    const result = flowRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0]!.message).toContain('CONFIDENTIAL');
    expect(result.violations[0]!.message).toContain('INTERNAL');
  });

  it('passes when sent data is within ceiling', () => {
    const rules = createGA2ARules({
      subagents: [
        {
          name: 'researcher',
          trustLevel: 1,
          tools: ['Read'],
          dataCeiling: 'INTERNAL',
          sendsData: true,
          sendsCeiling: 'PUBLIC',
        },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
    });

    const flowRule = rules.find((r) => r.id === 'G-A2A-FLOW')!;
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('researcher')],
    );

    const result = flowRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });

  it('ignores externally retrieved data (no sendsData flag)', () => {
    const rules = createGA2ARules({
      subagents: [
        {
          name: 'researcher',
          trustLevel: 1,
          tools: ['Read'],
          dataCeiling: 'INTERNAL',
          sendsData: false,
        },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
    });

    const flowRule = rules.find((r) => r.id === 'G-A2A-FLOW')!;
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('researcher')],
    );

    const result = flowRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});

describe('G-A2A-ESCALATE', () => {
  it('produces advisory (high) severity in advisory mode', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'worker', trustLevel: 3, tools: ['Read'], dataCeiling: 'PUBLIC' },
      ],
      parentTrustLevel: 2,
      a2aEnabled: true,
      advisoryMode: true,
    });

    const escalateRule = rules.find((r) => r.id === 'G-A2A-ESCALATE')!;
    expect(escalateRule).toBeDefined();

    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('worker')],
    );

    const result = escalateRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    // Advisory mode: high severity, not critical
    expect(result.violations.every((v) => v.severity === 'high')).toBe(true);
    expect(result.violations[0]!.message).toContain('advisory');
  });

  it('produces critical severity when advisory mode is off', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'worker', trustLevel: 3, tools: ['Read'], dataCeiling: 'PUBLIC' },
      ],
      parentTrustLevel: 2,
      a2aEnabled: true,
      advisoryMode: false,
    });

    const escalateRule = rules.find((r) => r.id === 'G-A2A-ESCALATE')!;
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('worker')],
    );

    const result = escalateRule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations.every((v) => v.severity === 'critical')).toBe(true);
  });

  it('does not fire when no escalation violations exist', () => {
    const rules = createGA2ARules({
      subagents: [
        { name: 'worker', trustLevel: 1, tools: ['Read'], dataCeiling: 'PUBLIC' },
      ],
      parentTrustLevel: 3,
      a2aEnabled: true,
      advisoryMode: true,
    });

    const escalateRule = rules.find((r) => r.id === 'G-A2A-ESCALATE')!;
    const manifest = makeManifest(
      [makeTool('Read')],
      [makeAgent('worker')],
    );

    const result = escalateRule.evaluate(manifest);
    expect(result.passed).toBe(true);
  });
});
