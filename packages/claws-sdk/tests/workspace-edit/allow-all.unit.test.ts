/**
 * L0 unit tests for {@link planAllowAll} — the pure SDK planner that the
 * claws-serve allow-all route delegates to.
 *
 * The planner is pure: inputs are (GovernanceIR, options), outputs are
 * `{ edits, skipped }`. These tests pin every skip reason (r5, fleet-locked,
 * violation, unclassified) and every compile-state branch.
 */

import { describe, expect, it } from 'vitest';
import type { GovernanceIR } from '@bic/claws-sdk';
import {
  planAllowAll,
  toggleEditFor,
  type AllowAllOptions,
} from '@bic/claws-sdk/workspace-edit';
import type { FleetOverride } from '@bic/claws-sdk/emit/host-approval-policy-types.js';
import type { ToolCapability } from '@bic/claws-sdk/ir/capability-manifest.js';

function tool(
  name: string,
  risk: ToolCapability['riskLevel'] | undefined,
): ToolCapability {
  const base: ToolCapability = {
    name,
    description: `desc ${name}`,
    riskLevel: 'low',
    oboFlag: false,
    classification: 'filesystem',
    mcpServer: 'local',
  };
  if (risk === undefined) {
    const { riskLevel: _drop, ...rest } = base;
    return rest as ToolCapability;
  }
  return { ...base, riskLevel: risk };
}

function irFor(tools: readonly ToolCapability[]): GovernanceIR {
  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
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
    compiler: { compilerVersion: '0.1.0', compiledAt: '', schemaVersion: 1 },
  };
}

describe('toggleEditFor', () => {
  it('builds a ToggleEdit that flips a tool on', () => {
    const edit = toggleEditFor('send_mail');
    expect(edit).toEqual({
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'send_mail',
      field: 'enabled',
      value: true,
    });
  });
});

describe('planAllowAll', () => {
  it('enables every tool with a non-critical risk level', () => {
    const ir = irFor([
      tool('a', 'low'),
      tool('b', 'medium'),
      tool('c', 'high'),
    ]);
    const plan = planAllowAll(ir);
    expect(plan.edits.map((e) => e.section)).toEqual(['a', 'b', 'c']);
    expect(plan.skipped).toHaveLength(0);
  });

  it('skips critical (R5) tools with reason "r5"', () => {
    const ir = irFor([
      tool('safe', 'low'),
      tool('nuke', 'critical'),
    ]);
    const plan = planAllowAll(ir);
    expect(plan.edits.map((e) => e.section)).toEqual(['safe']);
    expect(plan.skipped).toEqual([{ tool: 'nuke', reason: 'r5' }]);
  });

  it('skips tools with no risk level as "unclassified" (fail-closed)', () => {
    const ir = irFor([
      tool('ok', 'low'),
      tool('mystery', undefined),
    ]);
    const plan = planAllowAll(ir);
    expect(plan.edits.map((e) => e.section)).toEqual(['ok']);
    expect(plan.skipped).toEqual([{ tool: 'mystery', reason: 'unclassified' }]);
  });

  it('skips tools with requires_approval fleet overrides as "fleet-locked"', () => {
    const ir = irFor([
      tool('send_mail', 'high'),
      tool('read_inbox', 'low'),
    ]);
    const overrides: FleetOverride[] = [
      {
        tool: 'send_mail',
        requires_approval: true,
        reason: 'exec policy',
      } as FleetOverride,
    ];
    const plan = planAllowAll(ir, { fleetOverrides: overrides });
    expect(plan.edits.map((e) => e.section)).toEqual(['read_inbox']);
    expect(plan.skipped).toEqual([{ tool: 'send_mail', reason: 'fleet-locked' }]);
  });

  it('ignores fleet overrides without requires_approval', () => {
    const ir = irFor([tool('send_mail', 'high')]);
    const overrides: FleetOverride[] = [
      {
        tool: 'send_mail',
        requires_approval: false,
        reason: '',
      } as FleetOverride,
    ];
    const plan = planAllowAll(ir, { fleetOverrides: overrides });
    expect(plan.edits.map((e) => e.section)).toEqual(['send_mail']);
    expect(plan.skipped).toHaveLength(0);
  });

  it('skips violation-gated tools when compileState is "stale"', () => {
    const ir = irFor([tool('a', 'low'), tool('b', 'low')]);
    const options: AllowAllOptions = {
      compileState: 'stale',
      violationTools: new Set(['a']),
    };
    const plan = planAllowAll(ir, options);
    expect(plan.edits.map((e) => e.section)).toEqual(['b']);
    expect(plan.skipped).toEqual([{ tool: 'a', reason: 'violation' }]);
  });

  it('ignores violationTools when compileState is "ok"', () => {
    const ir = irFor([tool('a', 'low')]);
    const plan = planAllowAll(ir, {
      compileState: 'ok',
      violationTools: new Set(['a']),
    });
    expect(plan.edits.map((e) => e.section)).toEqual(['a']);
    expect(plan.skipped).toHaveLength(0);
  });

  it('preserves ordering of skip reasons (r5 checked before fleet before violation)', () => {
    // R5 wins over fleet-locked and violation; fleet wins over violation.
    const ir = irFor([
      tool('r5_fleet', 'critical'),
      tool('fleet_vio', 'low'),
    ]);
    const overrides: FleetOverride[] = [
      { tool: 'r5_fleet', requires_approval: true, reason: '' } as FleetOverride,
      { tool: 'fleet_vio', requires_approval: true, reason: '' } as FleetOverride,
    ];
    const plan = planAllowAll(ir, {
      compileState: 'stale',
      fleetOverrides: overrides,
      violationTools: new Set(['r5_fleet', 'fleet_vio']),
    });
    expect(plan.edits).toHaveLength(0);
    const reasonFor = (t: string) => plan.skipped.find((s) => s.tool === t)?.reason;
    expect(reasonFor('r5_fleet')).toBe('r5');
    expect(reasonFor('fleet_vio')).toBe('fleet-locked');
  });

  it('accepts empty options (defaults compileState to "ok")', () => {
    const ir = irFor([tool('a', 'low')]);
    const plan = planAllowAll(ir);
    expect(plan.edits).toHaveLength(1);
    expect(plan.skipped).toHaveLength(0);
  });
});
