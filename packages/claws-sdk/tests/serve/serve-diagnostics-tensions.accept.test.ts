/**
 * L3 acceptance — consumer queries diagnostics, tensions, and classify
 * endpoints via HTTP, verifies violation locations, tension clusters,
 * and R-level classification match compiled GovernanceIR.
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp } from '@bic/claws-serve';
import type { ServerState } from '@bic/claws-serve';

function makeIRWithViolationsAndConflicts(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'read_file',
          description: 'Read a file from disk',
          riskLevel: 'low',
          oboFlag: false,
          classification: 'filesystem',
        },
        {
          name: 'send-email',
          description: 'Send email on behalf of user',
          riskLevel: 'critical',
          oboFlag: true,
          classification: 'communication',
        },
      ],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [
        {
          ruleId: 'GOV-ACCEPT-01',
          level: 5,
          message: 'R5 tool send-email missing approval gate',
          target: 'policy.yaml:12',
          diagnosticCode: 'G-TOOL-01',
          fixSuggestions: [],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [],
      enforcementPlan: {
        blockedTools: ['send-email'],
        requiredApprovals: ['admin'],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [
        {
          toolName: 'send-email',
          grantRuleId: 'GRANT-A01',
          denyRuleId: 'DENY-A01',
          severity: 'error',
          grantLevel: 4,
          denyLevel: 5,
          description: 'OBO conflict on send-email',
          oboWithoutElicit: false,
        },
      ],
      multiConstraintConflicts: [],
      haltReason: 'OBO conflict blocks EMIT',
      hasOboWithoutElicit: false,
      totalConflicts: 1,
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-15T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

async function httpRequest(
  server: Server,
  method: string,
  path: string,
  options: { body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: string }> {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  const url = `http://127.0.0.1:${String(address.port)}${path}`;
  const fetchOptions: RequestInit = { method, headers: options.headers };
  if (options.body !== undefined) {
    fetchOptions.body = options.body;
  }
  const res = await fetch(url, fetchOptions);
  const body = await res.text();
  return { status: res.status, body };
}

function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('SDK acceptance: diagnostics, tensions, classify', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('consumer queries match compiled GovernanceIR', async () => {
    const ir = makeIRWithViolationsAndConflicts();
    const compileFn = async (): Promise<GovernanceIR> => ir;

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    });
    server = await listen(app);

    // Compile
    const compileRes = await httpRequest(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);

    // Diagnostics: violation locations match IR
    const diagRes = await httpRequest(server, 'GET', '/diagnostics');
    expect(diagRes.status).toBe(200);
    const diagJson = JSON.parse(diagRes.body) as Record<string, unknown>;
    const violations = diagJson['violations'] as Array<Record<string, unknown>>;
    expect(violations).toHaveLength(ir.analysis.violations.length);
    expect(violations[0]!['ruleId']).toBe(ir.analysis.violations[0]!.ruleId);
    expect(violations[0]!['target']).toBe(ir.analysis.violations[0]!.target);
    expect(violations[0]!['level']).toBe(ir.analysis.violations[0]!.level);

    // Tensions: cluster mapping matches conflict report
    const tensionRes = await httpRequest(server, 'GET', '/tensions');
    expect(tensionRes.status).toBe(200);
    const tensionJson = JSON.parse(tensionRes.body) as Record<string, unknown>;
    const tensions = tensionJson['tensions'] as Array<Record<string, unknown>>;
    expect(tensions).toHaveLength(ir.conflicts.oboConflicts.length + ir.conflicts.multiConstraintConflicts.length);
    expect(tensions[0]!['cluster']).toBe('A');
    expect(tensions[0]!['involvedFiles']).toEqual([
      ir.conflicts.oboConflicts[0]!.grantRuleId,
      ir.conflicts.oboConflicts[0]!.denyRuleId,
    ]);

    // Classify: R-level matches tool risk
    const classifyRes = await httpRequest(server, 'GET', '/classify/send-email');
    expect(classifyRes.status).toBe(200);
    const classifyJson = JSON.parse(classifyRes.body) as Record<string, unknown>;
    expect(classifyJson['rLevel']).toBe('R5');
    expect(classifyJson['oboFlag']).toBe(ir.capabilities.tools[1]!.oboFlag);
    expect(classifyJson['classification']).toBe(ir.capabilities.tools[1]!.classification);

    // Classify unknown → 404
    const unknownRes = await httpRequest(server, 'GET', '/classify/nonexistent');
    expect(unknownRes.status).toBe(404);
  });
});
