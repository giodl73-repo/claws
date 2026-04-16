/**
 * L3 SDK Acceptance: approval flow simulation round-trip.
 *
 * Verifies that HostPolicySim correctly simulates the full
 * approval request → decision → response cycle for tools
 * at different risk levels, with configurable decisions.
 */

import { describe, it, expect } from 'vitest';
import {
  HostPolicySim,
  type ApprovalSimConfig,
  type ApprovalSkippedResult,
  type ApprovalDecisionResult,
  type ApprovalTimeoutResult,
} from '../accept/runners/host-policy-sim.js';
import {
  emitHostApprovalPolicies,
  type EmitHostApprovalPoliciesOptions,
} from '../../src/emit/emit-host-approval-policies.js';
import type { HostApprovalPoliciesDocument } from '../../src/emit/host-approval-policy-types.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { ToolCapability } from '../../src/ir/capability-manifest.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildWorkspaceIR(): GovernanceIR {
  const base = minimalGovernanceIR();
  const tools: ToolCapability[] = [
    // R2 (low) — auto-allow
    { name: 'list_files', description: 'List directory', riskLevel: 'low', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    // R3 (medium) — approval required
    { name: 'write_file', description: 'Write file', riskLevel: 'medium', oboFlag: false, classification: 'filesystem', mcpServer: 'fs-mcp' },
    // R4 (high) — approval required
    { name: 'query_db', description: 'Query DB', riskLevel: 'high', oboFlag: false, classification: 'data', mcpServer: 'db-mcp' },
    // R5 (critical) — non-negotiable
    { name: 'deploy_prod', description: 'Deploy to prod', riskLevel: 'critical', oboFlag: true, classification: 'execution', mcpServer: 'deploy-mcp' },
  ];

  return {
    ...base,
    capabilities: { ...base.capabilities, tools },
  };
}

function emitDoc(options?: EmitHostApprovalPoliciesOptions): HostApprovalPoliciesDocument {
  const ir = buildWorkspaceIR();
  const result = emitHostApprovalPolicies(ir, options);
  return JSON.parse(result.content) as HostApprovalPoliciesDocument;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SDK Acceptance: approval flow simulation', () => {
  it('R2 tool auto-allows — no approval request emitted', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map(),
      defaultDecision: 'deny', // should never be consulted
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'list_files');

    expect(result.skipped).toBe(true);
    expect(result.approved).toBe(true);
    const skipped = result as ApprovalSkippedResult;
    expect(skipped.reason).toBe('no-approval-required');
    // No request/response events should exist
    expect('request' in result).toBe(false);
    expect('response' in result).toBe(false);
  });

  it('R3 tool approved — sim resolves requires_approval, config approves', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map([['fs-mcp:write_file', 'approve']]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file');

    expect(result.approved).toBe(true);
    expect(result.skipped).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.timedOut).toBe(false);
    expect(decision.request.type).toBe('approval_request');
    expect(decision.request.schemaVersion).toBe(1);
    expect(decision.request.toolCall.server).toBe('fs-mcp');
    expect(decision.request.toolCall.tool).toBe('write_file');
    expect(decision.request.risk.level).toBe(3); // medium → 3
    expect(decision.response.type).toBe('approval_response');
    expect(decision.response.decision.status).toBe('approved');
    expect(decision.response.requestId).toBe(decision.request.requestId);
    expect(decision.resolution).toBe('specific');
  });

  it('R3 tool denied — same policy but config denies', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map([['fs-mcp:write_file', 'deny']]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file');

    expect(result.approved).toBe(false);
    expect(result.skipped).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.timedOut).toBe(false);
    expect(decision.response.decision.status).toBe('denied');
    expect(decision.response.decision.decidedBy.type).toBe('user');
  });

  it('R4 tool timeout — fail-closed', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map([['db-mcp:query_db', 'timeout']]),
      timeoutMs: 5000,
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('db-mcp', 'query_db');

    expect(result.approved).toBe(false);
    expect(result.skipped).toBe(false);
    const timeout = result as ApprovalTimeoutResult;
    expect(timeout.timedOut).toBe(true);
    expect(timeout.reason).toBe('timeout');
    expect(timeout.request.type).toBe('approval_request');
    expect(timeout.request.risk.level).toBe(4); // high → 4
    // No response event for timeouts
    expect('response' in timeout).toBe(false);
  });

  it('R5 tool always requires approval — fleet override cannot bypass', () => {
    // Attempt fleet override to remove approval from R5 tool
    const doc = emitDoc({
      fleetOverrides: [
        {
          tool: 'deploy_prod',
          requires_approval: false,
          reason: 'Attempted bypass',
          authorizedBy: 'rogue-admin',
          authorizedAt: '2026-04-15T10:00:00.000Z',
        },
      ],
    });

    const config: ApprovalSimConfig = {
      decisions: new Map([['deploy-mcp:deploy_prod', 'approve']]),
    };
    const sim = new HostPolicySim(doc, config);

    // R5 override is rejected — still requires approval
    const result = sim.requestApproval('deploy-mcp', 'deploy_prod');
    expect(result.skipped).toBe(false);
    expect(result.approved).toBe(true); // approved because config says so, but approval WAS required
    const decision = result as ApprovalDecisionResult;
    expect(decision.request.risk.level).toBe(5); // critical → 5
    expect(decision.response.decision.status).toBe('approved');
  });

  it('unknown tool fail-closed — host must explicitly approve', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map(),
      defaultDecision: 'approve', // host explicitly approves unknowns
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('mystery-mcp', 'unknown_tool');

    // Global default requires approval, but config approves it
    expect(result.skipped).toBe(false);
    expect(result.approved).toBe(true);
    const decision = result as ApprovalDecisionResult;
    expect(decision.resolution).toBe('global-default');
    expect(decision.request.risk.level).toBe(5); // global default is critical
  });

  it('config specificity — exact key beats wildcard', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map([
        ['fs-mcp:write_file', 'approve'],  // specific: approve
        ['*:write_file', 'deny'],           // wildcard: deny
      ]),
    };
    const sim = new HostPolicySim(doc, config);

    // Specific match wins → approved
    const result = sim.requestApproval('fs-mcp', 'write_file');
    expect(result.approved).toBe(true);
    const decision = result as ApprovalDecisionResult;
    expect(decision.response.decision.status).toBe('approved');
  });

  it('config specificity — wildcard beats global default', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map([
        ['*:write_file', 'deny'],           // wildcard: deny
        ['*:*', 'approve'],                 // global: approve
      ]),
    };
    const sim = new HostPolicySim(doc, config);

    // Wildcard match wins → denied
    const result = sim.requestApproval('fs-mcp', 'write_file');
    expect(result.approved).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.response.decision.status).toBe('denied');
  });

  it('request IDs are unique and correlate between request and response', () => {
    const doc = emitDoc();
    const config: ApprovalSimConfig = {
      decisions: new Map(),
      defaultDecision: 'approve',
    };
    const sim = new HostPolicySim(doc, config);

    const r1 = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;
    const r2 = sim.requestApproval('db-mcp', 'query_db') as ApprovalDecisionResult;

    expect(r1.request.requestId).not.toBe(r2.request.requestId);
    expect(r1.response.requestId).toBe(r1.request.requestId);
    expect(r2.response.requestId).toBe(r2.request.requestId);
  });
});
