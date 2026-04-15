/**
 * L0: G-BOUND rules — step limits, tool limits, budget limits,
 * recursion limits with delegation cycle detection.
 *
 * 2 key tests:
 * 1. G-BOUND step limit enforcement
 * 2. G-BOUND recursion limit with delegation cycle detection
 */

import { describe, it, expect } from 'vitest';
import { createGBoundRules } from '../../../src/governance/rules/g-bound.js';
import type { CapabilityManifest, ToolCapability, AgentCapability } from '../../../src/ir/capability-manifest.js';

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

describe('G-BOUND rules', () => {
  const rules = createGBoundRules();

  it('creates 4 bounded reasoning rules', () => {
    expect(rules).toHaveLength(4);
    expect(rules[0].id).toBe('G-BOUND-01');
    expect(rules[1].id).toBe('G-BOUND-02');
    expect(rules[2].id).toBe('G-BOUND-03');
    expect(rules[3].id).toBe('G-BOUND-04');
  });

  it('G-BOUND-01: step limit enforcement for long workflows', () => {
    const rule = rules.find((r) => r.id === 'G-BOUND-01')!;

    // Workflow with excessive steps (> 50 steps)
    const longSteps = Array.from({ length: 60 }, (_, i) => `step-${i}`);
    const manifest = makeManifest({
      workflows: [
        {
          name: 'excessive-workflow',
          description: 'A workflow with too many steps',
          steps: longSteps,
          requiresApproval: false,
        },
      ],
    });

    const result = rule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-BOUND-01');
    expect(result.violations[0].severity).toBe('medium');
    expect(result.violations[0].message).toContain('step');

    // Short workflow passes
    const shortManifest = makeManifest({
      workflows: [
        {
          name: 'short-workflow',
          description: 'A reasonable workflow',
          steps: ['step-1', 'step-2', 'step-3'],
          requiresApproval: false,
        },
      ],
    });
    const shortResult = rule.evaluate(shortManifest);
    expect(shortResult.passed).toBe(true);
  });

  it('G-BOUND-02: tool count limits per agent', () => {
    const rule = rules.find((r) => r.id === 'G-BOUND-02')!;

    // Agent with too many tools (> 100 tools)
    const manyTools = Array.from({ length: 110 }, (_, i) =>
      makeTool({ name: `tool-${i}`, description: `Tool number ${i}` }),
    );

    const manifest = makeManifest({ tools: manyTools });
    const result = rule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-BOUND-02');
    expect(result.violations[0].severity).toBe('medium');

    // Reasonable number of tools passes
    const fewTools = Array.from({ length: 10 }, (_, i) =>
      makeTool({ name: `tool-${i}`, description: `Tool number ${i}` }),
    );
    const fewResult = rule.evaluate(makeManifest({ tools: fewTools }));
    expect(fewResult.passed).toBe(true);
  });

  it('G-BOUND-03: budget limits for high-risk tool concentrations', () => {
    const rule = rules.find((r) => r.id === 'G-BOUND-03')!;

    // Manifest with too many critical-risk tools
    const criticalTools = Array.from({ length: 15 }, (_, i) =>
      makeTool({
        name: `critical-tool-${i}`,
        description: `High risk tool ${i}`,
        riskLevel: 'critical',
        classification: 'execution',
      }),
    );

    const manifest = makeManifest({ tools: criticalTools });
    const result = rule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations[0].ruleId).toBe('G-BOUND-03');
    expect(result.violations[0].severity).toBe('high');

    // Mix of risk levels passes
    const mixedTools = [
      makeTool({ name: 'reader', description: 'Read files', riskLevel: 'low' }),
      makeTool({ name: 'writer', description: 'Write files', riskLevel: 'medium' }),
      makeTool({ name: 'deployer', description: 'Deploy', riskLevel: 'critical' }),
    ];
    const mixedResult = rule.evaluate(makeManifest({ tools: mixedTools }));
    expect(mixedResult.passed).toBe(true);
  });

  it('G-BOUND-04: recursion limit with delegation cycle detection', () => {
    const rule = rules.find((r) => r.id === 'G-BOUND-04')!;

    // Circular delegation: A -> B -> C -> A
    const agents: AgentCapability[] = [
      {
        name: 'agent-a',
        description: 'First agent',
        delegations: [{ from: 'agent-a', to: 'agent-b', permissions: ['READ'] }],
        maxAutonomousLevel: 3,
      },
      {
        name: 'agent-b',
        description: 'Second agent',
        delegations: [{ from: 'agent-b', to: 'agent-c', permissions: ['READ'] }],
        maxAutonomousLevel: 2,
      },
      {
        name: 'agent-c',
        description: 'Third agent',
        delegations: [{ from: 'agent-c', to: 'agent-a', permissions: ['READ'] }],
        maxAutonomousLevel: 2,
      },
    ];

    const manifest = makeManifest({ agents });
    const result = rule.evaluate(manifest);
    expect(result.passed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0].ruleId).toBe('G-BOUND-04');
    expect(result.violations[0].severity).toBe('critical');
    expect(result.violations[0].message).toContain('cycle');

    // Self-delegation is also a cycle
    const selfAgent: AgentCapability[] = [
      {
        name: 'narcissist',
        description: 'Self-delegating agent',
        delegations: [{ from: 'narcissist', to: 'narcissist', permissions: ['READ'] }],
        maxAutonomousLevel: 1,
      },
    ];
    const selfResult = rule.evaluate(makeManifest({ agents: selfAgent }));
    expect(selfResult.passed).toBe(false);
    expect(selfResult.violations[0].message).toContain('cycle');

    // Linear delegation passes
    const linearAgents: AgentCapability[] = [
      {
        name: 'parent',
        description: 'Parent agent',
        delegations: [{ from: 'parent', to: 'child', permissions: ['READ'] }],
        maxAutonomousLevel: 3,
      },
      {
        name: 'child',
        description: 'Child agent',
        delegations: [],
        maxAutonomousLevel: 2,
      },
    ];
    const linearResult = rule.evaluate(makeManifest({ agents: linearAgents }));
    expect(linearResult.passed).toBe(true);
  });

  it('G-BOUND-04: delegation to non-existent agent (undefined color) passes', () => {
    const rule = rules.find((r) => r.id === 'G-BOUND-04')!;

    // Agent delegates to an agent not in the manifest (phantom)
    const agents: AgentCapability[] = [
      {
        name: 'delegator',
        description: 'Delegates to phantom',
        delegations: [{ from: 'delegator', to: 'phantom', permissions: ['READ'] }],
        maxAutonomousLevel: 3,
      },
    ];

    const manifest = makeManifest({ agents });
    const result = rule.evaluate(manifest);
    // No cycle — phantom node is not in the agent list so its color is undefined
    expect(result.passed).toBe(true);
  });

  it('G-BOUND-03: passes when critical count is below minimum threshold', () => {
    const rule = rules.find((r) => r.id === 'G-BOUND-03')!;

    // 5 critical out of 6 = 83% but only 5 critical (below MIN_CRITICAL_COUNT=10)
    const tools = [
      ...Array.from({ length: 5 }, (_, i) => makeTool({ name: `crit-${i}`, riskLevel: 'critical' })),
      makeTool({ name: 'low-1', riskLevel: 'low' }),
    ];
    const result = rule.evaluate(makeManifest({ tools }));
    expect(result.passed).toBe(true);
  });

  it('empty manifest passes all bound rules', () => {
    const emptyManifest = makeManifest();
    for (const rule of rules) {
      const result = rule.evaluate(emptyManifest);
      expect(result.passed).toBe(true);
    }
  });
});
