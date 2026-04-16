/**
 * L1 Integration: GuardrailProvider composition — full provider→host gate
 * composition with host-policy-sim and risk-change audit emission.
 *
 * 2 L1 tests:
 * 1. Full provider→host gate composition with host-policy-sim
 * 2. Risk-change audit emission across compilations
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
} from '../../src/emit/emit-host-approval-policies.js';
import type { HostApprovalPoliciesDocument } from '../../src/emit/host-approval-policy-types.js';
import { resolveApprovalGate, fromFleetOverride } from '../../src/governance/fleet-precedence.js';
import { emitRiskChangeEvents } from '../../src/governance/risk-change-audit.js';
import { HostPolicySim } from '../accept/runners/host-policy-sim.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Build a GovernanceIR with specific tools and risk levels.
 */
function buildIR(
  tools: Array<{ name: string; riskLevel: ToolRiskLevel; mcpServer?: string }>,
  compiledAt?: string,
): GovernanceIR {
  const base = minimalGovernanceIR();
  const toolCaps: ToolCapability[] = tools.map(t => ({
    name: t.name,
    description: `Test tool: ${t.name}`,
    riskLevel: t.riskLevel,
    oboFlag: false,
    classification: 'custom' as const,
    ...(t.mcpServer ? { mcpServer: t.mcpServer } : {}),
  }));

  return {
    ...base,
    capabilities: { ...base.capabilities, tools: toolCaps },
    compiler: {
      ...base.compiler,
      ...(compiledAt ? { compiledAt } : {}),
    },
  };
}

/** Map ToolRiskLevel to numeric RiskLevel. */
function riskToNumeric(risk: ToolRiskLevel): 1 | 2 | 3 | 4 | 5 {
  switch (risk) {
    case 'low': return 2;
    case 'medium': return 3;
    case 'high': return 4;
    case 'critical': return 5;
  }
}

describe('Integration: provider→host gate composition with host-policy-sim', () => {
  it('full composition: emit → fleet resolve → host-policy-sim resolution', () => {
    const ir = buildIR([
      { name: 'read_file', riskLevel: 'low', mcpServer: 'fs-mcp' },
      { name: 'write_file', riskLevel: 'medium', mcpServer: 'fs-mcp' },
      { name: 'execute_cmd', riskLevel: 'high', mcpServer: 'exec-mcp' },
      { name: 'deploy_prod', riskLevel: 'critical', mcpServer: 'deploy-mcp' },
    ]);

    // Step 1: Emit host approval policies with fleet overrides
    const fleetOverrides = [
      {
        tool: 'write_file',
        requires_approval: false,
        reason: 'Sandbox environment',
        authorizedBy: 'sec-admin',
        authorizedAt: '2026-04-15T10:00:00.000Z',
      },
    ];

    const emitResult = emitHostApprovalPolicies(ir, { fleetOverrides });
    const doc: HostApprovalPoliciesDocument = JSON.parse(emitResult.content);

    // Step 2: Load into host-policy-sim (simulates host-side consumption)
    const sim = new HostPolicySim(doc);
    expect(sim.policyCount).toBe(4);

    // Step 3: Verify fleet-precedence resolution matches emit output
    // R2 read_file → no approval
    const readResult = sim.resolve('fs-mcp', 'read_file');
    expect(readResult.requiresApproval).toBe(false);
    expect(readResult.resolution).toBe('specific');

    const readGate = resolveApprovalGate(
      riskToNumeric('low'),
      'read_file',
      fleetOverrides.map(fromFleetOverride),
      'fs-mcp',
    );
    expect(readGate.requiresExternalApproval).toBe(false);

    // R3 write_file → fleet override permits auto-approve
    const writeResult = sim.resolve('fs-mcp', 'write_file');
    expect(writeResult.requiresApproval).toBe(false);
    expect(writeResult.resolution).toBe('specific');

    const writeGate = resolveApprovalGate(
      riskToNumeric('medium'),
      'write_file',
      fleetOverrides.map(fromFleetOverride),
      'fs-mcp',
    );
    expect(writeGate.requiresExternalApproval).toBe(false);
    expect(writeGate.source).toBe('fleet-override');

    // R4 execute_cmd → approval required (no fleet override)
    const execResult = sim.resolve('exec-mcp', 'execute_cmd');
    expect(execResult.requiresApproval).toBe(true);

    // R5 deploy_prod → always approval required
    const deployResult = sim.resolve('deploy-mcp', 'deploy_prod');
    expect(deployResult.requiresApproval).toBe(true);

    const deployGate = resolveApprovalGate(
      riskToNumeric('critical'),
      'deploy_prod',
      fleetOverrides.map(fromFleetOverride),
      'deploy-mcp',
    );
    expect(deployGate.requiresExternalApproval).toBe(true);
    expect(deployGate.source).toBe('r5-non-negotiable');

    // Step 4: Unknown tool → fail-closed
    const unknownResult = sim.resolve('unknown', 'unknown_tool');
    expect(unknownResult.requiresApproval).toBe(true);
    expect(unknownResult.resolution).toBe('global-default');
  });
});

describe('Integration: risk-change audit emission across compilations', () => {
  it('detects risk changes and emits audit events with policy delta', () => {
    const oldIR = buildIR(
      [
        { name: 'read_file', riskLevel: 'low', mcpServer: 'fs-mcp' },
        { name: 'write_file', riskLevel: 'medium', mcpServer: 'fs-mcp' },
        { name: 'deploy_prod', riskLevel: 'critical', mcpServer: 'deploy-mcp' },
        { name: 'old_tool', riskLevel: 'high', mcpServer: 'legacy-mcp' },
      ],
      '2026-04-10T00:00:00.000Z',
    );

    const newIR = buildIR(
      [
        { name: 'read_file', riskLevel: 'low', mcpServer: 'fs-mcp' },          // unchanged
        { name: 'write_file', riskLevel: 'low', mcpServer: 'fs-mcp' },          // de-escalated R3→R2
        { name: 'deploy_prod', riskLevel: 'critical', mcpServer: 'deploy-mcp' }, // unchanged
        { name: 'new_tool', riskLevel: 'high', mcpServer: 'new-mcp' },           // added
      ],
      '2026-04-15T00:00:00.000Z',
    );

    const auditResult = emitRiskChangeEvents(oldIR, newIR);

    // One risk-change event: write_file de-escalated
    expect(auditResult.events).toHaveLength(1);
    const event = auditResult.events[0]!;
    expect(event.tool).toBe('write_file');
    expect(event.oldRisk).toBe('medium');
    expect(event.newRisk).toBe('low');
    expect(event.riskDelta).toBe(-1); // de-escalation
    expect(event.policyChanged).toBe(true); // R3→R2 changes approval requirement
    expect(event.oldRequiresApproval).toBe(true);
    expect(event.newRequiresApproval).toBe(false);
    expect(event.timestamp).toBe('2026-04-15T00:00:00.000Z');

    // Verify the policy change matches what emit would produce
    const oldEmit = emitHostApprovalPolicies(oldIR);
    const newEmit = emitHostApprovalPolicies(newIR);
    const oldDoc: HostApprovalPoliciesDocument = JSON.parse(oldEmit.content);
    const newDoc: HostApprovalPoliciesDocument = JSON.parse(newEmit.content);

    const oldWritePolicy = oldDoc.policies.find(p => p.tool === 'write_file')!;
    const newWritePolicy = newDoc.policies.find(p => p.tool === 'write_file')!;
    expect(oldWritePolicy.requires_approval).toBe(true);  // was R3
    expect(newWritePolicy.requires_approval).toBe(false); // now R2

    // Added/removed tools tracked
    expect(auditResult.addedTools).toEqual(['new_tool']);
    expect(auditResult.removedTools).toEqual(['old_tool']);
    expect(auditResult.totalCompared).toBe(3); // read_file, write_file, deploy_prod
  });
});
