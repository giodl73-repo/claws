/**
 * L3 CLI Acceptance: runs `claws compile` + `claws emit` pipeline,
 * verifies guardrail composition output with fleet overrides applied
 * and host-approval-policies.json consistent with provider decisions.
 *
 * Uses SDK emit API directly since CLI acceptance requires the full binary
 * and workspace. This validates the same emit surface that the CLI exposes.
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  type EmitHostApprovalPoliciesOptions,
} from '@bic/claws-sdk/emit/emit-host-approval-policies.js';
import type {
  HostApprovalPoliciesDocument,
  HostApprovalPolicy,
  FleetOverride,
} from '@bic/claws-sdk/emit/host-approval-policy-types.js';
import {
  resolveApprovalGate,
  fromFleetOverride,
} from '@bic/claws-sdk/governance/fleet-precedence.js';
import { emitRiskChangeEvents } from '@bic/claws-sdk/governance/risk-change-audit.js';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir.js';
import type { ToolCapability } from '@bic/claws-sdk/ir/capability-manifest.js';

/**
 * Simulate a workspace compile by building a GovernanceIR with realistic tools.
 */
function simulateWorkspaceCompile(compiledAt?: string): GovernanceIR {
  const tools: ToolCapability[] = [
    { name: 'glob', description: 'Find files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'edit', description: 'Edit files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'bash', description: 'Run shell', riskLevel: 'high', oboFlag: false, classification: 'execution', mcpServer: 'claude-code' },
    { name: 'deploy', description: 'Deploy', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
  ];

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
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
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
      compilerVersion: '0.52.0',
      compiledAt: compiledAt ?? new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('CLI Acceptance: guardrail composition', () => {
  it('compile + emit produces guardrail composition output with fleet overrides', () => {
    const ir = simulateWorkspaceCompile();

    const fleetOverrides: FleetOverride[] = [
      {
        tool: 'write',
        requires_approval: false,
        reason: 'Dev environment',
        authorizedBy: 'admin',
        authorizedAt: '2026-04-15T00:00:00.000Z',
      },
      {
        tool: 'deploy',
        requires_approval: false,
        reason: 'Should not apply',
        authorizedBy: 'admin',
        authorizedAt: '2026-04-15T00:00:00.000Z',
      },
    ];

    const result = emitHostApprovalPolicies(ir, { fleetOverrides });
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Verify artifact structure
    expect(doc.schemaVersion).toBe(1);
    expect(doc.policies).toHaveLength(6);

    // R2 tools: no approval
    for (const name of ['glob', 'read']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `R2 ${name}`).toBe(false);
    }

    // R3 write: fleet override applied → no approval
    const write = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'write')!;
    expect(write.requires_approval).toBe(false);

    // R3 edit: no override → approval required
    const edit = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'edit')!;
    expect(edit.requires_approval).toBe(true);

    // R4 bash: approval required
    const bash = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'bash')!;
    expect(bash.requires_approval).toBe(true);

    // R5 deploy: override rejected → approval required
    const deploy = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'deploy')!;
    expect(deploy.requires_approval).toBe(true);

    // Only 1 override applied
    expect(doc.appliedOverrides).toHaveLength(1);
    expect(doc.appliedOverrides[0]!.tool).toBe('write');

    // R5 rejection warning
    expect(result.warnings.some(w => w.includes('deploy') && w.includes('non-negotiable'))).toBe(true);

    // Fleet-precedence governance layer agrees
    const govOverrides = fleetOverrides.map(fromFleetOverride);
    const writeGate = resolveApprovalGate(3, 'write', govOverrides);
    expect(writeGate.requiresExternalApproval).toBe(false);

    const deployGate = resolveApprovalGate(5, 'deploy', govOverrides);
    expect(deployGate.requiresExternalApproval).toBe(true);
    expect(deployGate.source).toBe('r5-non-negotiable');
  });

  it('compile + recompile produces risk-change audit events', () => {
    const oldIR = simulateWorkspaceCompile('2026-04-10T00:00:00.000Z');

    // Recompile: write de-escalated to R2, new tool added
    const newTools: ToolCapability[] = [
      { name: 'glob', description: 'Find files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'write', description: 'Write files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'edit', description: 'Edit files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'bash', description: 'Run shell', riskLevel: 'high', oboFlag: false, classification: 'execution', mcpServer: 'claude-code' },
      { name: 'deploy', description: 'Deploy', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
      { name: 'fetch', description: 'HTTP', riskLevel: 'medium', oboFlag: false, classification: 'network', mcpServer: 'claude-code' },
    ];
    const newIR: GovernanceIR = {
      ...oldIR,
      capabilities: { ...oldIR.capabilities, tools: newTools },
      compiler: {
        compilerVersion: '0.52.0',
        compiledAt: '2026-04-15T12:00:00.000Z',
        schemaVersion: 1,
      },
    };

    const audit = emitRiskChangeEvents(oldIR, newIR);

    // write: R3→R2 de-escalation
    expect(audit.events).toHaveLength(1);
    const writeChange = audit.events[0]!;
    expect(writeChange.tool).toBe('write');
    expect(writeChange.oldRisk).toBe('medium');
    expect(writeChange.newRisk).toBe('low');
    expect(writeChange.riskDelta).toBe(-1);
    expect(writeChange.policyChanged).toBe(true);

    // fetch is a new tool (added)
    expect(audit.addedTools).toEqual(['fetch']);
    expect(audit.removedTools).toEqual([]);
  });
});
