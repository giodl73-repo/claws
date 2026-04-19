/**
 * L0 unit tests for {@link diffGovernance}.
 *
 * Covers the six cases the pulse specifies:
 * 1. no changes (structurally equal IRs) → empty diff
 * 2. tool added
 * 3. tool removed
 * 4. risk changed (tool modified — risk-level field)
 * 5. multiple changes aggregated into a single diff
 * 6. deny-rule added + deny-rule removed
 */

import { describe, expect, it } from 'vitest';

import {
  diffGovernance,
  type ChangeClassifier,
} from '../../src/workspace/governance-diff.js';
import type { GovernanceIR, DelegationEntry } from '../../src/ir/governance-ir.js';
import type {
  AgentCapability,
  SkillCapability,
  ToolCapability,
  WorkflowCapability,
} from '../../src/ir/capability-manifest.js';
import type { DenyIntent, MechanicalIntent } from '../../src/ir/mechanical-intent.js';

function baseIR(): GovernanceIR {
  return {
    capabilities: { tools: [], skills: [], agents: [], workflows: [] },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.0.0-test',
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

function tool(overrides: Partial<ToolCapability> & { name: string }): ToolCapability {
  return {
    description: '',
    riskLevel: 'medium',
    oboFlag: false,
    classification: 'custom',
    ...overrides,
  };
}

function denyIntent(overrides: Partial<DenyIntent> & { id: string }): DenyIntent {
  return {
    kind: 'deny',
    ruleId: overrides.id,
    level: 4,
    description: '',
    target: 'target',
    reason: 'reason',
    ...overrides,
  };
}

const opts = { fromVersion: 1, toVersion: 2 };

describe('diffGovernance — L0 unit', () => {
  it('1. returns empty diff when IRs are structurally equal', () => {
    const a = baseIR();
    const b = baseIR();
    const result = diffGovernance(a, b, opts);
    expect(result.entries).toEqual([]);
    expect(result.summary).toEqual({ added: 0, modified: 0, removed: 0, total: 0 });
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);
  });

  it('2. reports an added tool with oc:// path and after value', () => {
    const from = baseIR();
    const to: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [tool({ name: 'send-email', riskLevel: 'high' })],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const result = diffGovernance(from, to, opts);
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0]!;
    expect(entry.type).toBe('added');
    expect(entry.path).toBe('oc://TOOLS.md/tools/send-email');
    expect(entry.before).toBeNull();
    expect(entry.after).toMatchObject({ name: 'send-email', riskLevel: 'high' });
    expect(entry.changedAt).toBe(2);
    expect(entry.changedBy).toBe('unknown');
    expect(result.summary).toEqual({ added: 1, modified: 0, removed: 0, total: 1 });
  });

  it('3. reports a removed tool with oc:// path and before value', () => {
    const from: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [tool({ name: 'legacy-tool' })],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const to = baseIR();
    const result = diffGovernance(from, to, opts);
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0]!;
    expect(entry.type).toBe('removed');
    expect(entry.path).toBe('oc://TOOLS.md/tools/legacy-tool');
    expect(entry.before).toMatchObject({ name: 'legacy-tool' });
    expect(entry.after).toBeNull();
    expect(result.summary).toEqual({ added: 0, modified: 0, removed: 1, total: 1 });
  });

  it('4. reports a risk-level change with field-level oc:// path', () => {
    const from: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [tool({ name: 'send-email', riskLevel: 'high' })],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const to: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [tool({ name: 'send-email', riskLevel: 'critical' })],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const result = diffGovernance(from, to, opts);
    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0]!;
    expect(entry.type).toBe('modified');
    expect(entry.path).toBe('oc://TOOLS.md/tools/send-email/riskLevel');
    expect(entry.field).toBe('riskLevel');
    expect(entry.before).toBe('high');
    expect(entry.after).toBe('critical');
    expect(entry.changedAt).toBe(2);
    expect(result.summary).toEqual({ added: 0, modified: 1, removed: 0, total: 1 });
  });

  it('5. aggregates multiple changes and sorts by oc:// path', () => {
    const from: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [
          tool({ name: 'send-email', riskLevel: 'medium' }),
          tool({ name: 'legacy-fetch', riskLevel: 'low' }),
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const to: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [
          tool({ name: 'send-email', riskLevel: 'high', oboFlag: true }),
          tool({ name: 'new-scan', riskLevel: 'critical' }),
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const result = diffGovernance(from, to, opts);
    // 1 added (new-scan), 1 removed (legacy-fetch), 2 modified (riskLevel + oboFlag on send-email)
    expect(result.summary).toEqual({ added: 1, modified: 2, removed: 1, total: 4 });
    // Sorted by path: legacy-fetch < new-scan < send-email/oboFlag < send-email/riskLevel
    expect(result.entries.map((e) => e.path)).toEqual([
      'oc://TOOLS.md/tools/legacy-fetch',
      'oc://TOOLS.md/tools/new-scan',
      'oc://TOOLS.md/tools/send-email/oboFlag',
      'oc://TOOLS.md/tools/send-email/riskLevel',
    ]);
  });

  it('covers skill, agent, workflow, deny-modify, delegation branches for complete diff walk', () => {
    const skill: SkillCapability = {
      name: 'draft-email',
      description: 'Draft an email',
      requiredTools: ['send-email'],
      governanceLevel: 3,
    };
    const skillUpdated: SkillCapability = {
      ...skill,
      description: 'Draft an outgoing email',
      requiredTools: ['send-email', 'compose'],
      governanceLevel: 4,
    };
    const skillNew: SkillCapability = {
      name: 'auto-reply',
      description: 'Auto reply',
      requiredTools: [],
      governanceLevel: 2,
    };
    const skillRemoved: SkillCapability = {
      name: 'legacy-skill',
      description: 'gone',
      requiredTools: [],
      governanceLevel: 1,
    };

    const agent: AgentCapability = {
      name: 'inbox-triager',
      description: 'Triage inbox',
      delegations: [],
      maxAutonomousLevel: 3,
    };
    const agentUpdated: AgentCapability = {
      ...agent,
      description: 'Triage inbox items',
      maxAutonomousLevel: 4,
      delegations: [{ from: 'inbox-triager', to: 'drafter', permissions: ['read'] }],
    };
    const agentAdded: AgentCapability = {
      name: 'outbox-dispatcher',
      description: 'Dispatch',
      delegations: [],
      maxAutonomousLevel: 2,
    };
    const agentRemoved: AgentCapability = {
      name: 'legacy-agent',
      description: 'removed',
      delegations: [],
      maxAutonomousLevel: 2,
    };

    const workflow: WorkflowCapability = {
      name: 'weekly-summary',
      description: 'Summarize week',
      steps: ['fetch', 'summarize'],
      requiresApproval: false,
    };
    const workflowUpdated: WorkflowCapability = {
      ...workflow,
      description: 'Summarize the week',
      steps: ['fetch', 'summarize', 'send'],
      requiresApproval: true,
    };
    const workflowAdded: WorkflowCapability = {
      name: 'daily-brief',
      description: 'Daily brief',
      steps: ['fetch', 'brief'],
      requiresApproval: false,
    };
    const workflowRemoved: WorkflowCapability = {
      name: 'legacy-flow',
      description: 'gone',
      steps: [],
      requiresApproval: false,
    };

    const existingDeny: DenyIntent = denyIntent({
      id: 'deny-shell',
      target: 'shell.*',
      reason: 'block shell',
      level: 4,
    });
    const existingDenyUpdated: DenyIntent = denyIntent({
      id: 'deny-shell',
      target: 'shell.exec',
      reason: 'block shell',
      level: 5,
    });

    const delegationA: DelegationEntry = {
      ruleId: 'SEC-001',
      mechanism: 'hook',
      target: 'preflight',
    };
    const delegationAUpdated: DelegationEntry = {
      ruleId: 'SEC-001',
      mechanism: 'approval',
      target: 'preflight', // target unchanged — exercises the "no-change" branch
    };
    const delegationRemoved: DelegationEntry = {
      ruleId: 'SEC-OLD',
      mechanism: 'audit-only',
      target: 'legacy-audit',
    };
    const delegationAdded: DelegationEntry = {
      ruleId: 'SEC-NEW',
      mechanism: 'skill',
      target: 'review-skill',
    };

    const intents: readonly MechanicalIntent[] = [existingDeny];
    const intentsAfter: readonly MechanicalIntent[] = [existingDenyUpdated];

    const from: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [],
        skills: [skill, skillRemoved],
        agents: [agent, agentRemoved],
        workflows: [workflow, workflowRemoved],
      },
      intents,
      delegationMap: [delegationA, delegationRemoved],
    };
    const to: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [],
        skills: [skillUpdated, skillNew],
        agents: [agentUpdated, agentAdded],
        workflows: [workflowUpdated, workflowAdded],
      },
      intents: intentsAfter,
      delegationMap: [delegationAUpdated, delegationAdded],
    };

    const result = diffGovernance(from, to, { ...opts, classify: () => 'patch' });
    // Every path should be oc:// and carry the `patch` classification.
    for (const entry of result.entries) {
      expect(entry.path.startsWith('oc://')).toBe(true);
      expect(entry.changedBy).toBe('patch');
    }
    // Skill: 3 modified fields on draft-email + auto-reply added + legacy-skill removed = 5.
    const skillEntries = result.entries.filter((e) => e.path.startsWith('oc://SKILLS.md/'));
    expect(skillEntries.length).toBe(5);
    // Agent: legacy-agent removed + inbox-triager 3 fields modified + outbox-dispatcher added = 5.
    const agentEntries = result.entries.filter((e) => e.path.startsWith('oc://AGENTS.md/'));
    expect(agentEntries.length).toBe(5);
    // Workflow: legacy-flow removed + weekly-summary 3 fields modified + daily-brief added = 5.
    const workflowEntries = result.entries.filter((e) =>
      e.path.startsWith('oc://WORKFLOWS.md/'),
    );
    expect(workflowEntries.length).toBe(5);
    // Deny: two fields modified on deny-shell (target, level); reason unchanged.
    const denyEntries = result.entries.filter((e) => e.path.startsWith('oc://RULES.md/'));
    expect(denyEntries.length).toBe(2);
    for (const e of denyEntries) expect(e.type).toBe('modified');
    // Delegation: SEC-001 mechanism modified (target unchanged) + SEC-OLD removed + SEC-NEW added = 3.
    const delegationEntries = result.entries.filter((e) =>
      e.path.startsWith('oc://DELEGATIONS.md/'),
    );
    expect(delegationEntries.length).toBe(3);
  });

  it('falls back to unknown classifier and detects one-sided undefined fields', () => {
    // Exercise both defaulting branches: no `classify` option and the
    // `valueEqual` path that short-circuits when one side is undefined.
    const irA: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [tool({ name: 't', trustLabels: undefined, mcpServer: undefined })],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const irB: GovernanceIR = {
      ...baseIR(),
      capabilities: {
        tools: [
          tool({ name: 't', trustLabels: ['vendor:trusted'], mcpServer: 'gw' }),
        ],
        skills: [],
        agents: [],
        workflows: [],
      },
    };
    const result = diffGovernance(irA, irB, { fromVersion: null, toVersion: null });
    // One-sided undefined counts as a modification for both fields.
    const paths = result.entries.map((e) => e.path);
    expect(paths).toContain('oc://TOOLS.md/tools/t/trustLabels');
    expect(paths).toContain('oc://TOOLS.md/tools/t/mcpServer');
    // Version passes through as null on both sides.
    expect(result.fromVersion).toBeNull();
    expect(result.toVersion).toBeNull();
  });

  it('6. reports a deny-rule added and another deny-rule removed', () => {
    const from: GovernanceIR = {
      ...baseIR(),
      intents: [denyIntent({ id: 'deny-legacy' })],
    };
    const to: GovernanceIR = {
      ...baseIR(),
      intents: [denyIntent({ id: 'deny-new', target: 'dangerous-tool' })],
    };
    const classifier: ChangeClassifier = ({ type }) =>
      type === 'added' ? 'patch' : 'recompile';
    const result = diffGovernance(from, to, { ...opts, classify: classifier });
    expect(result.summary).toEqual({ added: 1, modified: 0, removed: 1, total: 2 });
    const added = result.entries.find((e) => e.type === 'added');
    const removed = result.entries.find((e) => e.type === 'removed');
    expect(added?.path).toBe('oc://RULES.md/deny-rules/deny-new');
    expect(added?.changedBy).toBe('patch');
    expect(removed?.path).toBe('oc://RULES.md/deny-rules/deny-legacy');
    expect(removed?.changedBy).toBe('recompile');
  });
});
