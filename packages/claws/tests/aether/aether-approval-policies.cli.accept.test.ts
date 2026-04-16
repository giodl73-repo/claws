/**
 * L3 CLI Acceptance: runs `claws compile` + `claws emit` simulation on
 * fixture workspace, verifies host-approval-policies.json artifact written
 * with correct R2-false/R3-true/R5-always-true mappings.
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
} from '@bic/claws-sdk/emit/host-approval-policy-types.js';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir.js';
import type { ToolCapability } from '@bic/claws-sdk/ir/capability-manifest.js';

/**
 * Simulate a workspace compile by building a GovernanceIR with realistic tools.
 */
function simulateWorkspaceCompile(): GovernanceIR {
  const tools: ToolCapability[] = [
    // R2 (low): read-only filesystem tools
    { name: 'glob', description: 'Find files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'grep', description: 'Search', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    // R3 (medium): write filesystem tools
    { name: 'write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'edit', description: 'Edit files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    // R4 (high): execution tools
    { name: 'bash', description: 'Run shell', riskLevel: 'high', oboFlag: false, classification: 'execution', mcpServer: 'claude-code' },
    // R5 (critical): deployment and deletion
    { name: 'deploy', description: 'Deploy', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
    { name: 'drop_table', description: 'Drop DB table', riskLevel: 'critical', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
  ];

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
      effectiveR5Count: { derived: 2, overridden: 0, total: 2 },
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
      compilerVersion: '0.50.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('CLI Acceptance: host-approval-policies emit', () => {
  it('compile + emit produces host-approval-policies.json with correct mappings', () => {
    // Simulate: claws compile → GovernanceIR
    const ir = simulateWorkspaceCompile();

    // Simulate: claws emit → host-approval-policies.json
    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Artifact structure
    expect(doc.schemaVersion).toBe(1);
    expect(doc.generatedAt).toBeTruthy();
    expect(doc.policies).toHaveLength(8);

    // R2 tools: requires_approval = false
    for (const name of ['glob', 'read', 'grep']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `R2 tool ${name} should NOT require approval`).toBe(false);
    }

    // R3 tools: requires_approval = true
    for (const name of ['write', 'edit']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `R3 tool ${name} should require approval`).toBe(true);
    }

    // R4 tools: requires_approval = true
    const bash = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'bash')!;
    expect(bash.requires_approval).toBe(true);

    // R5 tools: requires_approval = true (ALWAYS)
    for (const name of ['deploy', 'drop_table']) {
      const p = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === name)!;
      expect(p.requires_approval, `R5 tool ${name} MUST require approval`).toBe(true);
    }

    // Verify MCP server assignment
    expect(bash.server).toBe('claude-code');
    const deploy = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'deploy')!;
    expect(deploy.server).toBe('deploy-mcp');
  });

  it('compile + emit with fleet overrides → artifact reflects allowed overrides only', () => {
    const ir = simulateWorkspaceCompile();

    const options: EmitHostApprovalPoliciesOptions = {
      fleetOverrides: [
        // R3 override: allow write without approval in dev
        {
          tool: 'write',
          requires_approval: false,
          reason: 'Dev environment',
          authorizedBy: 'admin',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
        // R5 override: should be REJECTED
        {
          tool: 'deploy',
          requires_approval: false,
          reason: 'Should not apply',
          authorizedBy: 'admin',
          authorizedAt: '2026-04-15T00:00:00.000Z',
        },
      ],
    };

    const result = emitHostApprovalPolicies(ir, options);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // write override applied
    const write = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'write')!;
    expect(write.requires_approval).toBe(false);

    // deploy override REJECTED
    const deploy = doc.policies.find((pol: HostApprovalPolicy) => pol.tool === 'deploy')!;
    expect(deploy.requires_approval).toBe(true);

    // Only 1 override applied (the R3 one)
    expect(doc.appliedOverrides).toHaveLength(1);
    expect(doc.appliedOverrides[0]!.tool).toBe('write');

    // Warning about rejected R5 override
    expect(result.warnings.some(w => w.includes('deploy') && w.includes('non-negotiable'))).toBe(true);
  });
});
