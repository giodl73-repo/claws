/**
 * L0: host-policy-sim — resolution order + approval flow.
 *
 * Tests the sim infrastructure independently of the emit pipeline.
 * Addresses review finding W6 (untested test infrastructure).
 */

import { describe, it, expect } from 'vitest';
import {
  HostPolicySim,
  type ApprovalSimConfig,
  type ApprovalSkippedResult,
  type ApprovalDecisionResult,
  type ApprovalTimeoutResult,
} from './host-policy-sim.js';
import type { HostApprovalPoliciesDocument } from '../../../src/emit/host-approval-policy-types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(policies: Array<{
  server: string;
  tool: string;
  requires_approval: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}>): HostApprovalPoliciesDocument {
  return {
    schemaVersion: 1,
    generatedAt: '2026-04-15T00:00:00.000Z',
    policies,
    appliedOverrides: [],
    auditEntries: [],
  };
}

// ---------------------------------------------------------------------------
// Resolution order
// ---------------------------------------------------------------------------

describe('HostPolicySim — resolution order', () => {
  const doc = makeDoc([
    { server: 'fs-mcp', tool: 'read_file', requires_approval: false, risk_level: 'low', reason: 'R2 auto-allow' },
    { server: 'fs-mcp', tool: 'write_file', requires_approval: true, risk_level: 'medium', reason: 'R3 needs approval' },
    { server: '*', tool: 'write_file', requires_approval: false, risk_level: 'low', reason: 'Wildcard override for write' },
    { server: '*', tool: 'fetch_url', requires_approval: true, risk_level: 'medium', reason: 'Wildcard fetch' },
  ]);

  it('specific match takes priority over wildcard', () => {
    const sim = new HostPolicySim(doc);
    const result = sim.resolve('fs-mcp', 'write_file');

    expect(result.resolution).toBe('specific');
    expect(result.requiresApproval).toBe(true);
    expect(result.policy.server).toBe('fs-mcp');
  });

  it('wildcard match when no specific match', () => {
    const sim = new HostPolicySim(doc);
    const result = sim.resolve('other-mcp', 'write_file');

    expect(result.resolution).toBe('wildcard');
    expect(result.requiresApproval).toBe(false);
    expect(result.policy.server).toBe('*');
  });

  it('wildcard tool with no specific server', () => {
    const sim = new HostPolicySim(doc);
    const result = sim.resolve('net-mcp', 'fetch_url');

    expect(result.resolution).toBe('wildcard');
    expect(result.requiresApproval).toBe(true);
  });

  it('global default when no match — fail-closed', () => {
    const sim = new HostPolicySim(doc);
    const result = sim.resolve('unknown-mcp', 'unknown_tool');

    expect(result.resolution).toBe('global-default');
    expect(result.requiresApproval).toBe(true);
    expect(result.policy.risk_level).toBe('critical');
  });

  it('policyCount reflects total indexed policies', () => {
    const sim = new HostPolicySim(doc);
    // 2 specific (fs-mcp:read_file, fs-mcp:write_file) + 2 wildcard (*:write_file, *:fetch_url)
    expect(sim.policyCount).toBe(4);
  });

  it('empty document returns global default for all', () => {
    const empty = makeDoc([]);
    const sim = new HostPolicySim(empty);

    expect(sim.policyCount).toBe(0);
    const result = sim.resolve('any', 'any');
    expect(result.resolution).toBe('global-default');
    expect(result.requiresApproval).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Approval flow — requestApproval()
// ---------------------------------------------------------------------------

describe('HostPolicySim — requestApproval()', () => {
  const doc = makeDoc([
    { server: 'fs-mcp', tool: 'read_file', requires_approval: false, risk_level: 'low', reason: 'R2 auto-allow' },
    { server: 'fs-mcp', tool: 'write_file', requires_approval: true, risk_level: 'medium', reason: 'R3 needs approval' },
    { server: 'db-mcp', tool: 'query_db', requires_approval: true, risk_level: 'high', reason: 'R4 needs approval' },
    { server: 'deploy-mcp', tool: 'deploy_prod', requires_approval: true, risk_level: 'critical', reason: 'R5 non-negotiable' },
  ]);

  it('skips approval for requires_approval=false', () => {
    const sim = new HostPolicySim(doc, { decisions: new Map(), defaultDecision: 'deny' });

    const result = sim.requestApproval('fs-mcp', 'read_file');

    expect(result.skipped).toBe(true);
    expect(result.approved).toBe(true);
    const skipped = result as ApprovalSkippedResult;
    expect(skipped.reason).toBe('no-approval-required');
  });

  it('approves when config decision is approve', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([['fs-mcp:write_file', 'approve']]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file');

    expect(result.approved).toBe(true);
    expect(result.skipped).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.timedOut).toBe(false);
    expect(decision.response.decision.status).toBe('approved');
  });

  it('denies when config decision is deny', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([['fs-mcp:write_file', 'deny']]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file');

    expect(result.approved).toBe(false);
    expect(result.skipped).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.response.decision.status).toBe('denied');
  });

  it('times out when config decision is timeout', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([['db-mcp:query_db', 'timeout']]),
      timeoutMs: 3000,
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('db-mcp', 'query_db');

    expect(result.approved).toBe(false);
    expect(result.skipped).toBe(false);
    const timeout = result as ApprovalTimeoutResult;
    expect(timeout.timedOut).toBe(true);
    expect(timeout.reason).toBe('timeout');
    expect(timeout.request.type).toBe('approval_request');
    expect('response' in timeout).toBe(false);
  });

  it('defaults to approve when no config provided', () => {
    const sim = new HostPolicySim(doc); // no config

    const result = sim.requestApproval('fs-mcp', 'write_file');

    expect(result.approved).toBe(true);
    expect(result.skipped).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.response.decision.status).toBe('approved');
  });

  it('uses defaultDecision when no specific decision matches', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map(), // empty — no matches
      defaultDecision: 'deny',
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file');

    expect(result.approved).toBe(false);
    const decision = result as ApprovalDecisionResult;
    expect(decision.response.decision.status).toBe('denied');
  });

  // ── Decision config resolution order ──────────────────────────────────

  it('exact key "server:tool" beats wildcard "*:tool"', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([
        ['fs-mcp:write_file', 'approve'],
        ['*:write_file', 'deny'],
      ]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;
    expect(result.approved).toBe(true);
    expect(result.response.decision.status).toBe('approved');
  });

  it('wildcard "*:tool" beats global "*:*"', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([
        ['*:write_file', 'deny'],
        ['*:*', 'approve'],
      ]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;
    expect(result.approved).toBe(false);
  });

  it('global "*:*" beats defaultDecision', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([['*:*', 'deny']]),
      defaultDecision: 'approve',
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('deploy-mcp', 'deploy_prod') as ApprovalDecisionResult;
    expect(result.approved).toBe(false);
  });

  // ── Request event structure ───────────────────────────────────────────

  it('request event has correct schema fields', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([['fs-mcp:write_file', 'approve']]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;

    expect(result.request.schemaVersion).toBe(1);
    expect(result.request.type).toBe('approval_request');
    expect(result.request.requestId).toMatch(/^sim-\d+$/);
    expect(result.request.timestamp).toBeTruthy();
    expect(result.request.toolCall).toEqual({ server: 'fs-mcp', tool: 'write_file' });
    expect(result.request.risk.level).toBe(3); // medium → 3
  });

  it('response event correlates with request', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map([['deploy-mcp:deploy_prod', 'approve']]),
    };
    const sim = new HostPolicySim(doc, config);

    const result = sim.requestApproval('deploy-mcp', 'deploy_prod') as ApprovalDecisionResult;

    expect(result.response.schemaVersion).toBe(1);
    expect(result.response.type).toBe('approval_response');
    expect(result.response.requestId).toBe(result.request.requestId);
    expect(result.response.decision.decidedBy.type).toBe('user');
  });

  it('request IDs increment across calls', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map(),
      defaultDecision: 'approve',
    };
    const sim = new HostPolicySim(doc, config);

    const r1 = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;
    const r2 = sim.requestApproval('db-mcp', 'query_db') as ApprovalDecisionResult;
    const r3 = sim.requestApproval('deploy-mcp', 'deploy_prod') as ApprovalDecisionResult;

    expect(r1.request.requestId).toBe('sim-1');
    expect(r2.request.requestId).toBe('sim-2');
    expect(r3.request.requestId).toBe('sim-3');
  });

  // ── Risk level mapping ────────────────────────────────────────────────

  it('maps risk levels to correct numbers', () => {
    const config: ApprovalSimConfig = {
      decisions: new Map(),
      defaultDecision: 'approve',
    };
    const sim = new HostPolicySim(doc, config);

    const medium = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;
    expect(medium.request.risk.level).toBe(3);

    const high = sim.requestApproval('db-mcp', 'query_db') as ApprovalDecisionResult;
    expect(high.request.risk.level).toBe(4);

    const critical = sim.requestApproval('deploy-mcp', 'deploy_prod') as ApprovalDecisionResult;
    expect(critical.request.risk.level).toBe(5);
  });

  it('resolution field reflects policy resolution method', () => {
    const wDoc = makeDoc([
      { server: 'fs-mcp', tool: 'write_file', requires_approval: true, risk_level: 'medium', reason: 'specific' },
      { server: '*', tool: 'fetch_url', requires_approval: true, risk_level: 'medium', reason: 'wildcard' },
    ]);
    const config: ApprovalSimConfig = {
      decisions: new Map(),
      defaultDecision: 'approve',
    };
    const sim = new HostPolicySim(wDoc, config);

    const specific = sim.requestApproval('fs-mcp', 'write_file') as ApprovalDecisionResult;
    expect(specific.resolution).toBe('specific');

    const wildcard = sim.requestApproval('net-mcp', 'fetch_url') as ApprovalDecisionResult;
    expect(wildcard.resolution).toBe('wildcard');

    const globalDef = sim.requestApproval('mystery', 'unknown') as ApprovalDecisionResult;
    expect(globalDef.resolution).toBe('global-default');
  });
});
