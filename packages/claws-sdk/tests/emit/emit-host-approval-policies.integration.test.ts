/**
 * L1: host-approval-policies.json integration — full compile→emit pipeline,
 * policy artifact matches GovernanceIR, host-policy-sim resolution,
 * fleet override with audit entry.
 *
 * 4 integration tests:
 * 1. Full compile→emit pipeline produces host-approval-policies.json
 * 2. Policy artifact matches GovernanceIR tool risk classifications
 * 3. Host-policy-sim resolves with specific→wildcard→global order
 * 4. Fleet override produces audit chain entry with counter-signature
 */

import { describe, it, expect } from 'vitest';
import {
  emitHostApprovalPolicies,
  resolvePolicy,
} from '../../src/emit/emit-host-approval-policies.js';
import { emitExecApprovals } from '../../src/emit/emit-exec-approvals.js';
import { riskLevelFromClassification } from '../../src/compile/manifest.js';
import type {
  HostApprovalPoliciesDocument,
  HostApprovalPolicy,
} from '../../src/emit/host-approval-policy-types.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';

describe('emitHostApprovalPolicies integration', () => {
  it('full compile→emit pipeline produces host-approval-policies.json', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Must have schema version
    expect(doc.schemaVersion).toBe(1);

    // Must have generatedAt timestamp
    expect(doc.generatedAt).toBeTruthy();
    expect(new Date(doc.generatedAt).getTime()).not.toBeNaN();

    // Must have policies for all tools in the IR
    expect(doc.policies).toHaveLength(ir.capabilities.tools.length);

    // Every tool from the IR must have a policy
    for (const tool of ir.capabilities.tools) {
      const policy = doc.policies.find(
        (p: HostApprovalPolicy) => p.tool === tool.name,
      );
      expect(policy, `Missing policy for tool: ${tool.name}`).toBeDefined();
    }
  });

  it('policy artifact matches GovernanceIR tool risk classifications', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir);
    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // Also generate exec-approvals for cross-artifact consistency
    const execResult = emitExecApprovals(ir);
    const execDoc = JSON.parse(execResult.content);

    for (const tool of ir.capabilities.tools) {
      const policy = doc.policies.find(
        (p: HostApprovalPolicy) => p.tool === tool.name,
      );
      expect(policy).toBeDefined();

      // Risk level must match
      expect(policy!.risk_level).toBe(tool.riskLevel);

      // Approval requirement must match risk mapping
      const numericRisk = riskLevelFromClassification(tool.riskLevel);
      if (numericRisk >= 3) {
        expect(policy!.requires_approval).toBe(true);
      } else {
        expect(policy!.requires_approval).toBe(false);
      }

      // Cross-check with exec-approvals for R5 tools
      if (numericRisk === 5) {
        const execEntry = execDoc.tools.find(
          (t: { tool_name: string }) => t.tool_name === tool.name,
        );
        if (execEntry) {
          expect(execEntry.requires_approval).toBe(true);
          expect(policy!.requires_approval).toBe(true);
        }
      }
    }
  });

  it('host-policy-sim resolves with specific→wildcard→global order', () => {
    // Create an IR with tools on different servers
    const ir: GovernanceIR = {
      ...minimalGovernanceIR(),
      capabilities: {
        ...minimalGovernanceIR().capabilities,
        tools: [
          {
            name: 'query_db',
            description: 'Query database',
            riskLevel: 'medium',
            oboFlag: false,
            classification: 'data',
            mcpServer: 'db-server',
          },
          {
            name: 'read_cache',
            description: 'Read from cache',
            riskLevel: 'low',
            oboFlag: false,
            classification: 'data',
            // No mcpServer — falls to wildcard
          },
        ],
      },
    };

    const result = emitHostApprovalPolicies(ir);

    // 1. Specific server lookup: db-server + query_db
    const specificPolicy = resolvePolicy(result.policyIndex, 'db-server', 'query_db');
    expect(specificPolicy.server).toBe('db-server');
    expect(specificPolicy.tool).toBe('query_db');
    expect(specificPolicy.requires_approval).toBe(true);

    // 2. Wildcard lookup: read_cache has no mcpServer → default '*'
    const wildcardPolicy = resolvePolicy(result.policyIndex, '*', 'read_cache');
    expect(wildcardPolicy.tool).toBe('read_cache');
    expect(wildcardPolicy.requires_approval).toBe(false);

    // 3. Unknown tool falls to global default (fail-closed)
    const unknownPolicy = resolvePolicy(result.policyIndex, 'unknown-server', 'unknown_tool');
    expect(unknownPolicy.requires_approval).toBe(true);
    expect(unknownPolicy.risk_level).toBe('critical');
    expect(unknownPolicy.reason).toContain('Unknown tool');
  });

  it('fleet override produces audit chain entry with counter-signature', () => {
    const ir = minimalGovernanceIR();
    const result = emitHostApprovalPolicies(ir, {
      fleetOverrides: [
        {
          tool: 'write_file',
          requires_approval: false,
          reason: 'Sandbox environment — low risk',
          authorizedBy: 'sec-lead@example.com',
          authorizedAt: '2026-04-15T10:00:00.000Z',
        },
        {
          tool: 'execute_command',
          requires_approval: false,
          reason: 'Dev environment only',
          authorizedBy: 'dev-lead@example.com',
          authorizedAt: '2026-04-15T11:00:00.000Z',
        },
      ],
    });

    const doc: HostApprovalPoliciesDocument = JSON.parse(result.content);

    // write_file (R3 medium) should be overridden
    expect(doc.appliedOverrides).toHaveLength(2);
    expect(doc.appliedOverrides.map(o => o.tool).sort()).toEqual(
      ['execute_command', 'write_file'],
    );

    // Audit entries should exist for each override
    expect(doc.auditEntries).toHaveLength(2);

    // Each audit entry has counter-signature with authorizer info
    for (const entry of doc.auditEntries) {
      expect(entry.counterSignature).toBeTruthy();
      expect(entry.timestamp).toBeTruthy();
      expect(entry.override.authorizedBy).toBeTruthy();
      expect(entry.override.authorizedAt).toBeTruthy();
    }
  });
});
