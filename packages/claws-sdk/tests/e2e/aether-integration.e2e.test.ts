/**
 * L2 E2E: Compile→emit→policy→provider→host gate end-to-end.
 *
 * 2 E2E tests:
 * 1. Full pipeline: compile→emit→fleet resolve→host gate composition
 * 2. HOST disabled fallback: when host gate is unavailable, fail-closed for R5
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
  type EmitHostApprovalPoliciesOptions,
} from '../../src/emit/emit-host-approval-policies.js';
import type {
  HostApprovalPoliciesDocument,
  HostApprovalPolicy,
  FleetOverride,
} from '../../src/emit/host-approval-policy-types.js';
import {
  resolveApprovalGate,
  fromFleetOverride,
  type FleetApprovalOverride,
} from '../../src/governance/fleet-precedence.js';
import { emitRiskChangeEvents } from '../../src/governance/risk-change-audit.js';
import { getFailMode } from '../../src/governance/guardrail-types.js';
import { HostPolicySim } from '../accept/runners/host-policy-sim.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability, ToolRiskLevel } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

/**
 * Build a realistic workspace IR with mixed risk tools.
 */
function buildWorkspaceIR(compiledAt?: string): GovernanceIR {
  const base = minimalGovernanceIR();
  const tools: ToolCapability[] = [
    { name: 'glob', description: 'Find files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'read', description: 'Read files', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'write', description: 'Write files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'edit', description: 'Edit files', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'claude-code' },
    { name: 'bash', description: 'Run shell', riskLevel: 'high', oboFlag: false, classification: 'execution', mcpServer: 'claude-code' },
    { name: 'send_email', description: 'Send email', riskLevel: 'critical', oboFlag: true, classification: 'communication', mcpServer: 'outlook-mcp' },
    { name: 'deploy', description: 'Deploy to prod', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
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

describe('E2E: compile→emit→policy→provider→host gate', () => {
  it('full pipeline with fleet overrides and host-policy-sim', () => {
    // Step 1: Compile workspace
    const ir = buildWorkspaceIR();

    // Step 2: Define fleet overrides
    const fleetOverrides: FleetOverride[] = [
      // R3 write → auto-approve in sandbox
      {
        tool: 'write',
        requires_approval: false,
        reason: 'Dev sandbox: write is safe',
        authorizedBy: 'sec-admin',
        authorizedAt: '2026-04-15T09:00:00.000Z',
      },
      // R5 deploy → attempt override (should be rejected)
      {
        tool: 'deploy',
        requires_approval: false,
        reason: 'Should not apply',
        authorizedBy: 'rogue-admin',
        authorizedAt: '2026-04-15T09:00:00.000Z',
      },
    ];

    // Step 3: Emit host approval policies
    const emitResult = emitHostApprovalPolicies(ir, { fleetOverrides });
    const doc: HostApprovalPoliciesDocument = JSON.parse(emitResult.content);

    // R5 override rejection warning
    expect(emitResult.warnings.some(w => w.includes('deploy') && w.includes('non-negotiable'))).toBe(true);

    // Only 1 override applied (the R3 write)
    expect(doc.appliedOverrides).toHaveLength(1);
    expect(doc.appliedOverrides[0]!.tool).toBe('write');

    // Step 4: Host-policy-sim consumes the artifact
    const sim = new HostPolicySim(doc);
    expect(sim.policyCount).toBe(7);

    // Step 5: Verify provider→host gate composition for each risk level

    // R2 tools: no approval
    const globRes = sim.resolve('claude-code', 'glob');
    expect(globRes.requiresApproval).toBe(false);
    expect(globRes.resolution).toBe('specific');

    // R3 write: fleet override → no approval
    const writeRes = sim.resolve('claude-code', 'write');
    expect(writeRes.requiresApproval).toBe(false);

    // R3 edit: no fleet override → approval required
    const editRes = sim.resolve('claude-code', 'edit');
    expect(editRes.requiresApproval).toBe(true);

    // R4 bash: approval required
    const bashRes = sim.resolve('claude-code', 'bash');
    expect(bashRes.requiresApproval).toBe(true);

    // R5 deploy: ALWAYS requires approval (fleet override rejected)
    const deployRes = sim.resolve('deploy-mcp', 'deploy');
    expect(deployRes.requiresApproval).toBe(true);

    // R5 send_email: ALWAYS requires approval
    const emailRes = sim.resolve('outlook-mcp', 'send_email');
    expect(emailRes.requiresApproval).toBe(true);

    // Step 6: Cross-verify with fleet-precedence resolution
    const govOverrides = fleetOverrides.map(fromFleetOverride);

    const writeGate = resolveApprovalGate(3, 'write', govOverrides, 'claude-code');
    expect(writeGate.requiresExternalApproval).toBe(false);
    expect(writeGate.source).toBe('fleet-override');

    const deployGate = resolveApprovalGate(5, 'deploy', govOverrides, 'deploy-mcp');
    expect(deployGate.requiresExternalApproval).toBe(true);
    expect(deployGate.source).toBe('r5-non-negotiable');

    // Step 7: Unknown tool → fail-closed at both layers
    const unknownHost = sim.resolve('unknown', 'mystery_tool');
    expect(unknownHost.requiresApproval).toBe(true);

    const unknownPolicy = resolvePolicy(emitResult.policyIndex, 'unknown', 'mystery_tool');
    expect(unknownPolicy.requires_approval).toBe(true);
    expect(unknownPolicy.risk_level).toBe('critical');
  });

  it('HOST disabled fallback: fail-mode per risk level when host gate is unavailable', () => {
    const ir = buildWorkspaceIR();
    const emitResult = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(emitResult.content);

    // Simulate host gate being unavailable (provider throws)
    // Verify fail-mode per risk level
    const tools = ir.capabilities.tools;

    for (const tool of tools) {
      const numericRisk = tool.riskLevel === 'low' ? 2
        : tool.riskLevel === 'medium' ? 3
        : tool.riskLevel === 'high' ? 4
        : 5;

      const failMode = getFailMode(numericRisk as 1 | 2 | 3 | 4 | 5);

      if (numericRisk <= 2) {
        // R1-R2: fail-open — tool proceeds even if provider throws
        expect(failMode.failMode).toBe('fail-open');
        expect(failMode.overridable).toBe(false);
      } else if (numericRisk <= 4) {
        // R3-R4: fail-closed by default, but fleet can override
        expect(failMode.failMode).toBe('fail-closed');
        expect(failMode.overridable).toBe(true);
      } else {
        // R5: fail-closed, non-negotiable
        expect(failMode.failMode).toBe('fail-closed');
        expect(failMode.overridable).toBe(false);
      }
    }

    // Verify R5 policy in the artifact is always requires_approval: true
    const r5Policies = doc.policies.filter((p: HostApprovalPolicy) => p.risk_level === 'critical');
    expect(r5Policies.length).toBeGreaterThan(0);
    for (const p of r5Policies) {
      expect(p.requires_approval).toBe(true);
    }
  });
});
