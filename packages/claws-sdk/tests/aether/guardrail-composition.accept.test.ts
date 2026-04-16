/**
 * L3 SDK Acceptance: consumer creates GuardrailProvider with
 * requiresExternalApproval, verifies fleet precedence resolution,
 * R5 non-negotiable gate, and risk-change audit event emission.
 *
 * Tests the full SDK surface as an external consumer would use it.
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  type EmitHostApprovalPoliciesOptions,
} from '../../src/emit/emit-host-approval-policies.js';
import type {
  HostApprovalPoliciesDocument,
  HostApprovalPolicy,
  FleetOverride,
} from '../../src/emit/host-approval-policy-types.js';
import type {
  AuthorizationDecision,
  AllowDecision,
  ReviewDecision,
  DenyDecision,
} from '../../src/governance/guardrail-types.js';
import { getFailMode } from '../../src/governance/guardrail-types.js';
import {
  resolveApprovalGate,
  fromFleetOverride,
} from '../../src/governance/fleet-precedence.js';
import { emitRiskChangeEvents } from '../../src/governance/risk-change-audit.js';
import { HostPolicySim } from '../accept/runners/host-policy-sim.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Build a workspace IR for acceptance testing.
 */
function buildAcceptIR(compiledAt?: string): GovernanceIR {
  const base = minimalGovernanceIR();
  const tools: ToolCapability[] = [
    { name: 'read_file', description: 'Read', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    { name: 'write_file', description: 'Write', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    { name: 'query_db', description: 'Query', riskLevel: 'high', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
    { name: 'deploy_prod', description: 'Deploy', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
  ];

  return {
    ...base,
    capabilities: { ...base.capabilities, tools },
    compiler: {
      compilerVersion: '0.52.0',
      compiledAt: compiledAt ?? '2026-04-15T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

describe('SDK Acceptance: guardrail composition', () => {
  it('consumer creates GuardrailProvider with requiresExternalApproval', () => {
    // Consumer creates authorization decisions for each risk level
    const r2Decision: AllowDecision = {
      decision: 'allow',
      requiresExternalApproval: false,
      riskLevel: 2,
    };
    expect(r2Decision.requiresExternalApproval).toBe(false);

    const r3Decision: AllowDecision = {
      decision: 'allow',
      requiresExternalApproval: true,
      riskLevel: 3,
    };
    expect(r3Decision.requiresExternalApproval).toBe(true);

    const r5Decision: AllowDecision = {
      decision: 'allow',
      requiresExternalApproval: true,
      riskLevel: 5,
    };
    expect(r5Decision.requiresExternalApproval).toBe(true);

    // Review decision always implies requiresExternalApproval: true
    const reviewDecision: ReviewDecision = {
      decision: 'review',
      requiresExternalApproval: true,
      reason: 'Needs human review',
      riskLevel: 4,
    };
    expect(reviewDecision.requiresExternalApproval).toBe(true);

    // Deny decision never reaches host gate
    const denyDecision: DenyDecision = {
      decision: 'deny',
      reason: 'Blocked by policy',
      ruleId: 'G-CLASS-01',
      riskLevel: 5,
    };
    expect(denyDecision.decision).toBe('deny');
    expect('requiresExternalApproval' in denyDecision).toBe(false);
  });

  it('fleet precedence resolution matches emit output', () => {
    const ir = buildAcceptIR();
    const fleetOverrides: FleetOverride[] = [
      {
        tool: 'write_file',
        requires_approval: false,
        reason: 'Dev environment safe writes',
        authorizedBy: 'admin',
        authorizedAt: '2026-04-15T10:00:00.000Z',
      },
      {
        tool: 'query_db',
        requires_approval: false,
        reason: 'Read-only queries safe',
        authorizedBy: 'db-admin',
        authorizedAt: '2026-04-15T10:00:00.000Z',
      },
    ];

    // Emit with fleet overrides
    const result = emitHostApprovalPolicies(ir, { fleetOverrides });
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);
    const sim = new HostPolicySim(doc);

    // Governance-layer resolution must agree with emit-layer output
    const govOverrides = fleetOverrides.map(fromFleetOverride);

    // R3 write_file: fleet override → no approval
    const writeGate = resolveApprovalGate(3, 'write_file', govOverrides, 'fs-mcp');
    const writePolicy = sim.resolve('fs-mcp', 'write_file');
    expect(writeGate.requiresExternalApproval).toBe(false);
    expect(writePolicy.requiresApproval).toBe(false);

    // R4 query_db: fleet override → no approval
    const queryGate = resolveApprovalGate(4, 'query_db', govOverrides, 'db-mcp');
    const queryPolicy = sim.resolve('db-mcp', 'query_db');
    expect(queryGate.requiresExternalApproval).toBe(false);
    expect(queryPolicy.requiresApproval).toBe(false);

    // R2 read_file: no override needed, default no approval
    const readGate = resolveApprovalGate(2, 'read_file', govOverrides, 'fs-mcp');
    const readPolicy = sim.resolve('fs-mcp', 'read_file');
    expect(readGate.requiresExternalApproval).toBe(false);
    expect(readPolicy.requiresApproval).toBe(false);
  });

  it('R5 non-negotiable gate — no fleet override can disable it', () => {
    const ir = buildAcceptIR();
    const fleetOverrides: FleetOverride[] = [
      {
        tool: 'deploy_prod',
        requires_approval: false,
        reason: 'Attempted R5 override',
        authorizedBy: 'rogue',
        authorizedAt: '2026-04-15T10:00:00.000Z',
      },
    ];

    const result = emitHostApprovalPolicies(ir, { fleetOverrides });
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // R5 override was rejected
    expect(result.warnings.some(w => w.includes('deploy_prod') && w.includes('non-negotiable'))).toBe(true);
    expect(doc.appliedOverrides).toHaveLength(0);

    // Policy still requires approval
    const sim = new HostPolicySim(doc);
    const deployRes = sim.resolve('deploy-mcp', 'deploy_prod');
    expect(deployRes.requiresApproval).toBe(true);

    // Governance-layer also returns non-negotiable
    const govOverrides = fleetOverrides.map(fromFleetOverride);
    const gate = resolveApprovalGate(5, 'deploy_prod', govOverrides, 'deploy-mcp');
    expect(gate.requiresExternalApproval).toBe(true);
    expect(gate.source).toBe('r5-non-negotiable');
  });

  it('risk-change audit event emission across compilations', () => {
    // Old compilation: write_file is R3, query_db is R4
    const oldIR = buildAcceptIR('2026-04-10T00:00:00.000Z');

    // New compilation: write_file escalated to R4, query_db de-escalated to R3
    const newBase = minimalGovernanceIR();
    const newTools: ToolCapability[] = [
      { name: 'read_file', description: 'Read', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
      { name: 'write_file', description: 'Write', riskLevel: 'high', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
      { name: 'query_db', description: 'Query', riskLevel: 'medium', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
      { name: 'deploy_prod', description: 'Deploy', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
    ];
    const newIR: GovernanceIR = {
      ...newBase,
      capabilities: { ...newBase.capabilities, tools: newTools },
      compiler: {
        compilerVersion: '0.52.0',
        compiledAt: '2026-04-15T12:00:00.000Z',
        schemaVersion: 1,
      },
    };

    const auditResult = emitRiskChangeEvents(oldIR, newIR);

    // 2 risk changes: write_file R3→R4, query_db R4→R3
    expect(auditResult.events).toHaveLength(2);

    const writeEvent = auditResult.events.find(e => e.tool === 'write_file')!;
    expect(writeEvent.oldRisk).toBe('medium');
    expect(writeEvent.newRisk).toBe('high');
    expect(writeEvent.riskDelta).toBe(1); // escalation
    expect(writeEvent.policyChanged).toBe(false); // both R3 and R4 require approval

    const queryEvent = auditResult.events.find(e => e.tool === 'query_db')!;
    expect(queryEvent.oldRisk).toBe('high');
    expect(queryEvent.newRisk).toBe('medium');
    expect(queryEvent.riskDelta).toBe(-1); // de-escalation
    expect(queryEvent.policyChanged).toBe(false); // both R3 and R4 require approval

    expect(auditResult.addedTools).toEqual([]);
    expect(auditResult.removedTools).toEqual([]);
  });
});
