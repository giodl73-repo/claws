/**
 * L3 SDK Acceptance: consumer compiles workspace with mixed R2/R3/R5 tools,
 * invokes emit API, verifies host-approval-policies.json contains correct
 * approval gates per risk level and fleet overrides.
 *
 * Tests the full SDK surface as an external consumer would use it.
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
  type EmitHostApprovalPoliciesOptions,
} from '../../src/emit/emit-host-approval-policies.js';
import {
  HOST_APPROVAL_POLICIES_SCHEMA_VERSION,
  type HostApprovalPoliciesDocument,
  type HostApprovalPolicy,
} from '../../src/emit/host-approval-policy-types.js';
import { HostPolicySim } from '../accept/runners/host-policy-sim.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Build a workspace-like GovernanceIR with mixed risk tools.
 */
function buildWorkspaceIR(): GovernanceIR {
  const base = minimalGovernanceIR();
  const tools: ToolCapability[] = [
    // R2 (low) tools
    { name: 'list_files', description: 'List directory', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    { name: 'read_file', description: 'Read file', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    // R3 (medium) tools
    { name: 'write_file', description: 'Write file', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    { name: 'fetch_url', description: 'HTTP request', riskLevel: 'medium', oboFlag: false, classification: 'network', mcpServer: 'net-mcp' },
    // R4 (high) tools
    { name: 'query_db', description: 'Query DB', riskLevel: 'high', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
    // R5 (critical) tools
    { name: 'deploy_prod', description: 'Deploy to prod', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
    { name: 'delete_data', description: 'Delete data', riskLevel: 'critical', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
  ];

  return {
    ...base,
    capabilities: { ...base.capabilities, tools },
  };
}

describe('SDK Acceptance: host-approval-policies', () => {
  it('consumer compiles workspace → correct approval gates per risk level', () => {
    const ir = buildWorkspaceIR();

    // Consumer invokes the emit API
    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Schema version matches
    expect(doc.schemaVersion).toBe(HOST_APPROVAL_POLICIES_SCHEMA_VERSION);

    // Every tool has a policy
    expect(doc.policies).toHaveLength(7);

    // R2 tools: no approval
    for (const name of ['list_files', 'read_file']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `${name} should not require approval`).toBe(false);
      expect(p.risk_level).toBe('low');
    }

    // R3 tools: approval required
    for (const name of ['write_file', 'fetch_url']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `${name} should require approval`).toBe(true);
      expect(p.risk_level).toBe('medium');
    }

    // R4 tools: approval required
    const queryDb = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'query_db')!;
    expect(queryDb.requires_approval).toBe(true);
    expect(queryDb.risk_level).toBe('high');

    // R5 tools: approval required (non-negotiable)
    for (const name of ['deploy_prod', 'delete_data']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `${name} must require approval (R5)`).toBe(true);
      expect(p.risk_level).toBe('critical');
    }

    // Host-policy-sim can load and resolve these policies
    const sim = new HostPolicySim(doc);
    expect(sim.policyCount).toBe(7);

    // Specific server resolution
    const fsResult = sim.resolve('fs-mcp', 'list_files');
    expect(fsResult.resolution).toBe('specific');
    expect(fsResult.requiresApproval).toBe(false);

    // Unknown tool → fail-closed
    const unknownResult = sim.resolve('anything', 'unknown_tool');
    expect(unknownResult.resolution).toBe('global-default');
    expect(unknownResult.requiresApproval).toBe(true);
  });

  it('fleet overrides apply to R3/R4 but not R5 — with audit trail', () => {
    const ir = buildWorkspaceIR();

    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        // Override R3 tool: write_file → no approval in sandbox
        {
          tool: 'write_file',
          requires_approval: false,
          reason: 'Sandbox: write_file is safe',
          authorizedBy: 'sec-admin',
          authorizedAt: '2026-04-15T10:00:00.000Z',
        },
        // Override R4 tool: query_db → no approval in dev
        {
          tool: 'query_db',
          requires_approval: false,
          reason: 'Dev DB: read-only queries safe',
          authorizedBy: 'db-admin',
          authorizedAt: '2026-04-15T10:00:00.000Z',
        },
        // Attempt override R5 tool: deploy_prod → should be IGNORED
        {
          tool: 'deploy_prod',
          requires_approval: false,
          reason: 'Should not apply',
          authorizedBy: 'rogue-admin',
          authorizedAt: '2026-04-15T10:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // write_file override applied
    const writePolicy = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'write_file')!;
    expect(writePolicy.requires_approval).toBe(false);

    // query_db override applied
    const queryPolicy = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'query_db')!;
    expect(queryPolicy.requires_approval).toBe(false);

    // deploy_prod override REJECTED — still requires approval
    const deployPolicy = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'deploy_prod')!;
    expect(deployPolicy.requires_approval).toBe(true);

    // Only 2 overrides applied (R3 and R4), not the R5 one
    expect(doc.appliedOverrides).toHaveLength(2);
    expect(doc.appliedOverrides.map(o => o.tool).sort()).toEqual(['query_db', 'write_file']);

    // 2 audit entries (one per applied override)
    expect(doc.auditEntries).toHaveLength(2);

    // Warnings about the rejected R5 override
    expect(result.warnings.some(w => w.includes('deploy_prod') && w.includes('non-negotiable'))).toBe(true);
  });
});
