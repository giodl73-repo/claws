/**
 * L0: risk-change audit unit tests.
 *
 * Covers:
 * 1. Equal risk — no events emitted
 * 2. Single tool risk change — correct event fields
 * 3. R2→R3 boundary — policyChanged=true (crosses approval threshold)
 * 4. Server field propagation from mcpServer
 * 5. Added and removed tools tracked separately
 */

import { describe, it, expect } from 'vitest';
import { emitRiskChangeEvents } from '../../src/governance/risk-change-audit.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';

/**
 * Build a minimal GovernanceIR with the given tools.
 */
function irWith(tools: readonly ToolCapability[], compiledAt = '2026-04-15T00:00:00.000Z'): GovernanceIR {
  return {
    capabilities: {
      tools,
      skills: [],
      agents: [],
      workflows: [],
    },
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
      compilerVersion: '0.1.0',
      compiledAt,
      schemaVersion: 1,
    },
  };
}

function tool(name: string, riskLevel: 'low' | 'medium' | 'high' | 'critical', mcpServer?: string): ToolCapability {
  return {
    name,
    description: '',
    riskLevel,
    oboFlag: false,
    classification: 'custom',
    ...(mcpServer ? { mcpServer } : {}),
  };
}

describe('emitRiskChangeEvents', () => {
  it('emits no events when risk levels are equal', () => {
    const oldIR = irWith([tool('read_file', 'low'), tool('write_file', 'medium')]);
    const newIR = irWith([tool('read_file', 'low'), tool('write_file', 'medium')]);

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(0);
    expect(result.addedTools).toHaveLength(0);
    expect(result.removedTools).toHaveLength(0);
    expect(result.totalCompared).toBe(2);
  });

  it('emits a single event for a risk change with correct fields', () => {
    const oldIR = irWith([tool('exec', 'medium')]);
    const newIR = irWith([tool('exec', 'critical')], '2026-04-15T12:00:00.000Z');

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(1);
    const event = result.events[0]!;
    expect(event.tool).toBe('exec');
    expect(event.oldRisk).toBe('medium');
    expect(event.newRisk).toBe('critical');
    expect(event.riskDelta).toBe(2); // 5 - 3
    expect(event.timestamp).toBe('2026-04-15T12:00:00.000Z');
    expect(event.compilerVersion).toBe('0.1.0');
  });

  it('sets policyChanged=true at the R2→R3 boundary', () => {
    const oldIR = irWith([tool('scan', 'low')]);
    const newIR = irWith([tool('scan', 'medium')]);

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(1);
    const event = result.events[0]!;
    expect(event.policyChanged).toBe(true);
    expect(event.oldRequiresApproval).toBe(false); // R2 → no approval
    expect(event.newRequiresApproval).toBe(true);  // R3 → approval required
    expect(event.riskDelta).toBe(1); // 3 - 2
  });

  it('sets policyChanged=false for changes within the approval tier', () => {
    const oldIR = irWith([tool('deploy', 'medium')]);
    const newIR = irWith([tool('deploy', 'high')]);

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(1);
    const event = result.events[0]!;
    expect(event.policyChanged).toBe(false); // both require approval
    expect(event.oldRequiresApproval).toBe(true);
    expect(event.newRequiresApproval).toBe(true);
  });

  it('propagates server field from mcpServer', () => {
    const oldIR = irWith([tool('search', 'low', 'web-search')]);
    const newIR = irWith([tool('search', 'high', 'web-search')]);

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.server).toBe('web-search');
  });

  it('tracks added tools separately from events', () => {
    const oldIR = irWith([tool('read_file', 'low')]);
    const newIR = irWith([tool('read_file', 'low'), tool('new_tool', 'high')]);

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(0);
    expect(result.addedTools).toEqual(['new_tool']);
    expect(result.totalCompared).toBe(1);
  });

  it('tracks removed tools separately from events', () => {
    const oldIR = irWith([tool('read_file', 'low'), tool('old_tool', 'medium')]);
    const newIR = irWith([tool('read_file', 'low')]);

    const result = emitRiskChangeEvents(oldIR, newIR);

    expect(result.events).toHaveLength(0);
    expect(result.removedTools).toEqual(['old_tool']);
    expect(result.totalCompared).toBe(1);
  });
});
