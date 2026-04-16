/**
 * L2 E2E: Compile workspace with mixed R2/R3/R5 tools → verify
 * host-approval-policies.json artifact, then recompile after risk
 * change → verify artifact updates.
 *
 * 2 E2E tests:
 * 1. Compile workspace with mixed R2/R3/R5 tools → correct artifact
 * 2. Recompile after risk level change → artifact reflects update
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
} from '../../src/emit/emit-host-approval-policies.js';
import type {
  HostApprovalPoliciesDocument,
  HostApprovalPolicy,
} from '../../src/emit/host-approval-policy-types.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Build a GovernanceIR with specific tool risk levels and MCP servers.
 */
function buildMixedRiskIR(
  tools: Array<{ name: string; riskLevel: ToolRiskLevel; mcpServer?: string }>,
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
    capabilities: {
      ...base.capabilities,
      tools: toolCaps,
    },
  };
}

describe('E2E: host-approval-policies.json emit', () => {
  it('compile workspace with mixed R2/R3/R5 tools → verify artifact', () => {
    const ir = buildMixedRiskIR([
      { name: 'list_files', riskLevel: 'low', mcpServer: 'fs-server' },
      { name: 'read_file', riskLevel: 'low', mcpServer: 'fs-server' },
      { name: 'write_file', riskLevel: 'medium', mcpServer: 'fs-server' },
      { name: 'http_request', riskLevel: 'medium', mcpServer: 'net-server' },
      { name: 'execute_shell', riskLevel: 'high', mcpServer: 'exec-server' },
      { name: 'deploy_prod', riskLevel: 'critical', mcpServer: 'deploy-server' },
      { name: 'delete_prod_db', riskLevel: 'critical', mcpServer: 'db-server' },
    ]);

    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Schema version must be 1
    expect(doc.schemaVersion).toBe(1);

    // Must have exactly 7 policies
    expect(doc.policies).toHaveLength(7);

    // Verify R2 (low) tools: requires_approval = false
    const listFiles = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'list_files')!;
    expect(listFiles.requires_approval).toBe(false);
    expect(listFiles.server).toBe('fs-server');

    const readFile = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'read_file')!;
    expect(readFile.requires_approval).toBe(false);

    // Verify R3 (medium) tools: requires_approval = true
    const writeFile = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'write_file')!;
    expect(writeFile.requires_approval).toBe(true);

    const httpRequest = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'http_request')!;
    expect(httpRequest.requires_approval).toBe(true);
    expect(httpRequest.server).toBe('net-server');

    // Verify R4 (high) tools: requires_approval = true
    const executeShell = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'execute_shell')!;
    expect(executeShell.requires_approval).toBe(true);

    // Verify R5 (critical) tools: requires_approval = true (non-negotiable)
    const deployProd = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'deploy_prod')!;
    expect(deployProd.requires_approval).toBe(true);

    const deleteProdDb = doc.policies.find((p: HostApprovalPolicy) => p.tool === 'delete_prod_db')!;
    expect(deleteProdDb.requires_approval).toBe(true);

    // Verify O(1) lookup via policyIndex
    const fsPolicy = resolvePolicy(result.policyIndex, 'fs-server', 'list_files');
    expect(fsPolicy.requires_approval).toBe(false);

    const deployPolicy = resolvePolicy(result.policyIndex, 'deploy-server', 'deploy_prod');
    expect(deployPolicy.requires_approval).toBe(true);

    // Unknown tool → fail-closed
    const unknownPolicy = resolvePolicy(result.policyIndex, 'unknown', 'unknown_tool');
    expect(unknownPolicy.requires_approval).toBe(true);
    expect(unknownPolicy.risk_level).toBe('critical');
  });

  it('recompile after risk change → artifact updates', () => {
    // Initial compilation: write_file is R3 (medium)
    const irBefore = buildMixedRiskIR([
      { name: 'read_file', riskLevel: 'low', mcpServer: 'fs-server' },
      { name: 'write_file', riskLevel: 'medium', mcpServer: 'fs-server' },
      { name: 'deploy_prod', riskLevel: 'critical', mcpServer: 'deploy-server' },
    ]);

    const resultBefore = emitHostApprovalPolicies(irBefore);
    const docBefore: HostApprovalPoliciesDocument = JSON.parse(resultBefore.content);

    // write_file starts as R3 → requires_approval: true
    const writeFileBefore = docBefore.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'write_file',
    )!;
    expect(writeFileBefore.requires_approval).toBe(true);
    expect(writeFileBefore.risk_level).toBe('medium');

    // Recompile: write_file reclassified to R2 (low), new compiledAt
    const irAfter = {
      ...buildMixedRiskIR([
        { name: 'read_file', riskLevel: 'low', mcpServer: 'fs-server' },
        { name: 'write_file', riskLevel: 'low', mcpServer: 'fs-server' }, // reclassified!
        { name: 'deploy_prod', riskLevel: 'critical', mcpServer: 'deploy-server' },
      ]),
      compiler: {
        compilerVersion: '0.1.0',
        compiledAt: '2026-04-13T00:00:00.000Z',
        schemaVersion: 1,
      },
    };

    const resultAfter = emitHostApprovalPolicies(irAfter);
    const docAfter: HostApprovalPoliciesDocument = JSON.parse(resultAfter.content);

    // write_file now R2 → requires_approval: false
    const writeFileAfter = docAfter.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'write_file',
    )!;
    expect(writeFileAfter.requires_approval).toBe(false);
    expect(writeFileAfter.risk_level).toBe('low');

    // deploy_prod remains R5 → still requires approval
    const deployAfter = docAfter.policies.find(
      (p: HostApprovalPolicy) => p.tool === 'deploy_prod',
    )!;
    expect(deployAfter.requires_approval).toBe(true);

    // Verify the generatedAt timestamps are different (recompiled)
    expect(docAfter.generatedAt).not.toBe(docBefore.generatedAt);
  });
});
