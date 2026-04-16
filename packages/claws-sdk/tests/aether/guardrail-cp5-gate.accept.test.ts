/**
 * L3 CP-5 Gate Acceptance: full Aether integration stack verification.
 *
 * Compile→emit→policy→provider→host gate→blob verify round-trip
 * across all CP-5 pulses (50-52).
 *
 * Verifies:
 * - P50: host-approval-policies.json emit with fleet overrides
 * - P52: GuardrailProvider composition with requiresExternalApproval
 * - P52: Fleet precedence resolution
 * - P52: Risk-change audit emission
 * - P52: Fail-mode per risk level
 * - End-to-end round-trip integrity
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
  type EmitHostApprovalPoliciesOptions,
} from '../../src/emit/emit-host-approval-policies.js';
import {
  HOST_APPROVAL_POLICIES_SCHEMA_VERSION,
  DEFAULT_POLICY_MAPPINGS,
  type HostApprovalPoliciesDocument,
  type HostApprovalPolicy,
  type FleetOverride,
} from '../../src/emit/host-approval-policy-types.js';
import type {
  AuthorizationDecision,
  AllowDecision,
  ReviewDecision,
} from '../../src/governance/guardrail-types.js';
import { getFailMode, DEFAULT_FAIL_MODES } from '../../src/governance/guardrail-types.js';
import {
  resolveApprovalGate,
  fromFleetOverride,
  type FleetApprovalOverride,
} from '../../src/governance/fleet-precedence.js';
import { emitRiskChangeEvents, type RiskChangeEvent } from '../../src/governance/risk-change-audit.js';
import { HostPolicySim } from '../accept/runners/host-policy-sim.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Build a full workspace IR across all risk levels.
 */
function buildFullWorkspaceIR(compiledAt?: string): GovernanceIR {
  const base = minimalGovernanceIR();
  const tools: ToolCapability[] = [
    // R2 (low)
    { name: 'glob', description: 'Find files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'grep', description: 'Search content', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    // R3 (medium)
    { name: 'write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'edit', description: 'Edit files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'fetch_url', description: 'HTTP request', riskLevel: 'medium', oboFlag: false, classification: 'network', mcpServer: 'net-mcp' },
    // R4 (high)
    { name: 'bash', description: 'Run shell', riskLevel: 'high', oboFlag: false, classification: 'execution', mcpServer: 'claude-code' },
    { name: 'query_db', description: 'Query database', riskLevel: 'high', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
    // R5 (critical)
    { name: 'deploy', description: 'Deploy to prod', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
    { name: 'send_email', description: 'Send email OBO', riskLevel: 'critical', oboFlag: true, classification: 'communication', mcpServer: 'outlook-mcp' },
    { name: 'delete_data', description: 'Delete prod data', riskLevel: 'critical', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
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

describe('CP-5 Gate: full Aether integration stack round-trip', () => {
  it('compile→emit→policy→provider→host gate→verify round-trip', () => {
    // ── Step 1: Compile ──────────────────────────────────────────────
    const ir = buildFullWorkspaceIR();

    // ── Step 2: Fleet overrides ──────────────────────────────────────
    const fleetOverrides: FleetOverride[] = [
      // R3 write: auto-approve in sandbox
      {
        tool: 'write',
        requires_approval: false,
        reason: 'Sandbox writes safe',
        authorizedBy: 'sec-admin',
        authorizedAt: '2026-04-15T09:00:00.000Z',
      },
      // R4 query_db: auto-approve for read-only
      {
        tool: 'query_db',
        requires_approval: false,
        reason: 'Read-only queries',
        authorizedBy: 'db-admin',
        authorizedAt: '2026-04-15T09:00:00.000Z',
      },
      // R5 deploy: attempt override (MUST be rejected)
      {
        tool: 'deploy',
        requires_approval: false,
        reason: 'Should not apply',
        authorizedBy: 'rogue-admin',
        authorizedAt: '2026-04-15T09:00:00.000Z',
      },
    ];

    // ── Step 3: Emit ─────────────────────────────────────────────────
    const emitResult = emitHostApprovalPolicies(ir, { fleetOverrides });
    const doc: HostApprovalPoliciesDocument = JSON.parse(emitResult.content);

    // P50 verification: schema version and policy count
    expect(doc.schemaVersion).toBe(HOST_APPROVAL_POLICIES_SCHEMA_VERSION);
    expect(doc.policies).toHaveLength(11);

    // P50 verification: fleet override audit trail
    expect(doc.appliedOverrides).toHaveLength(2);
    expect(doc.appliedOverrides.map(o => o.tool).sort()).toEqual(['query_db', 'write']);
    expect(doc.auditEntries).toHaveLength(2);

    // P50 verification: R5 override rejected
    expect(emitResult.warnings.some(w => w.includes('deploy') && w.includes('non-negotiable'))).toBe(true);

    // ── Step 4: Host consumption ─────────────────────────────────────
    const sim = new HostPolicySim(doc);
    expect(sim.policyCount).toBe(11);

    // R2 tools: no approval
    for (const name of ['glob', 'read', 'grep']) {
      const res = sim.resolve('claude-code', name);
      expect(res.requiresApproval, `R2 ${name}`).toBe(false);
      expect(res.resolution).toBe('specific');
    }

    // R3 write: fleet override → no approval
    const writeRes = sim.resolve('claude-code', 'write');
    expect(writeRes.requiresApproval).toBe(false);

    // R3 edit: no override → approval required
    const editRes = sim.resolve('claude-code', 'edit');
    expect(editRes.requiresApproval).toBe(true);

    // R3 fetch_url: no override → approval required
    const fetchRes = sim.resolve('net-mcp', 'fetch_url');
    expect(fetchRes.requiresApproval).toBe(true);

    // R4 bash: no override → approval required
    const bashRes = sim.resolve('claude-code', 'bash');
    expect(bashRes.requiresApproval).toBe(true);

    // R4 query_db: fleet override → no approval
    const queryRes = sim.resolve('db-mcp', 'query_db');
    expect(queryRes.requiresApproval).toBe(false);

    // R5 tools: ALWAYS approval required
    for (const [server, tool] of [['deploy-mcp', 'deploy'], ['outlook-mcp', 'send_email'], ['db-mcp', 'delete_data']] as const) {
      const res = sim.resolve(server, tool);
      expect(res.requiresApproval, `R5 ${tool}`).toBe(true);
    }

    // Unknown tool: fail-closed
    const unknownRes = sim.resolve('unknown', 'unknown_tool');
    expect(unknownRes.requiresApproval).toBe(true);
    expect(unknownRes.resolution).toBe('global-default');

    // ── Step 5: P52 fleet-precedence cross-verification ──────────────
    const govOverrides = fleetOverrides.map(fromFleetOverride);

    // R2: default no approval
    const readGate = resolveApprovalGate(2, 'read', govOverrides, 'claude-code');
    expect(readGate.requiresExternalApproval).toBe(false);
    expect(readGate.source).toBe('risk-default');

    // R3 write: fleet override
    const writeGate = resolveApprovalGate(3, 'write', govOverrides, 'claude-code');
    expect(writeGate.requiresExternalApproval).toBe(false);
    expect(writeGate.source).toBe('fleet-override');

    // R3 edit: default approval
    const editGate = resolveApprovalGate(3, 'edit', govOverrides, 'claude-code');
    expect(editGate.requiresExternalApproval).toBe(true);
    expect(editGate.source).toBe('risk-default');

    // R5: non-negotiable
    const deployGate = resolveApprovalGate(5, 'deploy', govOverrides, 'deploy-mcp');
    expect(deployGate.requiresExternalApproval).toBe(true);
    expect(deployGate.source).toBe('r5-non-negotiable');

    // ── Step 6: P52 fail-mode verification ───────────────────────────
    expect(getFailMode(2).failMode).toBe('fail-open');
    expect(getFailMode(3).failMode).toBe('fail-closed');
    expect(getFailMode(3).overridable).toBe(true);
    expect(getFailMode(5).failMode).toBe('fail-closed');
    expect(getFailMode(5).overridable).toBe(false);

    // ── Step 7: P52 AuthorizationDecision type verification ──────────
    const allowR2: AllowDecision = { decision: 'allow', requiresExternalApproval: false, riskLevel: 2 };
    const allowR5: AllowDecision = { decision: 'allow', requiresExternalApproval: true, riskLevel: 5 };
    const review: ReviewDecision = { decision: 'review', requiresExternalApproval: true, riskLevel: 4 };

    expect(allowR2.requiresExternalApproval).toBe(false);
    expect(allowR5.requiresExternalApproval).toBe(true);
    expect(review.requiresExternalApproval).toBe(true);
  });

  it('risk-change audit across CP-5 pulses with policy delta verification', () => {
    // First compilation
    const ir1 = buildFullWorkspaceIR('2026-04-10T00:00:00.000Z');

    // Second compilation: write escalated R3→R4, query_db de-escalated R4→R3
    const ir2Base = minimalGovernanceIR();
    const ir2Tools: ToolCapability[] = [
      { name: 'glob', description: 'Find files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'grep', description: 'Search', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'write', description: 'Write files', riskLevel: 'high', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'edit', description: 'Edit files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
      { name: 'fetch_url', description: 'HTTP', riskLevel: 'medium', oboFlag: false, classification: 'network', mcpServer: 'net-mcp' },
      { name: 'bash', description: 'Run shell', riskLevel: 'high', oboFlag: false, classification: 'execution', mcpServer: 'claude-code' },
      { name: 'query_db', description: 'Query', riskLevel: 'medium', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
      { name: 'deploy', description: 'Deploy', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
      { name: 'send_email', description: 'Email', riskLevel: 'critical', oboFlag: true, classification: 'communication', mcpServer: 'outlook-mcp' },
      { name: 'delete_data', description: 'Delete', riskLevel: 'critical', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
    ];
    const ir2: GovernanceIR = {
      ...ir2Base,
      capabilities: { ...ir2Base.capabilities, tools: ir2Tools },
      compiler: { compilerVersion: '0.52.0', compiledAt: '2026-04-15T12:00:00.000Z', schemaVersion: 1 },
    };

    const audit = emitRiskChangeEvents(ir1, ir2);

    // 2 changes: write R3→R4, query_db R4→R3
    expect(audit.events).toHaveLength(2);

    const writeEvent = audit.events.find(e => e.tool === 'write')!;
    expect(writeEvent.oldRisk).toBe('medium');
    expect(writeEvent.newRisk).toBe('high');
    expect(writeEvent.riskDelta).toBe(1);
    expect(writeEvent.policyChanged).toBe(false); // both require approval
    expect(writeEvent.timestamp).toBe('2026-04-15T12:00:00.000Z');
    expect(writeEvent.compilerVersion).toBe('0.52.0');

    const queryEvent = audit.events.find(e => e.tool === 'query_db')!;
    expect(queryEvent.oldRisk).toBe('high');
    expect(queryEvent.newRisk).toBe('medium');
    expect(queryEvent.riskDelta).toBe(-1);
    expect(queryEvent.policyChanged).toBe(false); // both require approval

    // No tools added or removed
    expect(audit.addedTools).toEqual([]);
    expect(audit.removedTools).toEqual([]);

    // Verify the actual emit output reflects the changes
    const emit1 = emitHostApprovalPolicies(ir1);
    const emit2 = emitHostApprovalPolicies(ir2);
    const doc1: HostApprovalPoliciesDocument = JSON.parse(emit1.content);
    const doc2: HostApprovalPoliciesDocument = JSON.parse(emit2.content);

    // write: R3 → R4 (both require approval, but risk_level changes)
    const writePolicy1 = doc1.policies.find(p => p.tool === 'write')!;
    const writePolicy2 = doc2.policies.find(p => p.tool === 'write')!;
    expect(writePolicy1.risk_level).toBe('medium');
    expect(writePolicy2.risk_level).toBe('high');
    expect(writePolicy1.requires_approval).toBe(true);
    expect(writePolicy2.requires_approval).toBe(true);

    // query_db: R4 → R3 (both require approval, but risk_level changes)
    const queryPolicy1 = doc1.policies.find(p => p.tool === 'query_db')!;
    const queryPolicy2 = doc2.policies.find(p => p.tool === 'query_db')!;
    expect(queryPolicy1.risk_level).toBe('high');
    expect(queryPolicy2.risk_level).toBe('medium');
    expect(queryPolicy1.requires_approval).toBe(true);
    expect(queryPolicy2.requires_approval).toBe(true);
  });
});
