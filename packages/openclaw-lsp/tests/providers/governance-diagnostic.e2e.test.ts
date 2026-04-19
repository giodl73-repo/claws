/**
 * L2 E2E test for end-to-end LSP governance diagnostic + code lens
 * from a live `claws serve`-like compilation.
 *
 * Uses an in-memory `claws serve` stand-in that:
 *   - Responds to GET /health with a healthy payload
 *   - Responds to POST /compile with a GovernanceIR derived from tracked content
 *
 * The LSP-side path exercised here is:
 *   ServeClient.health() → compile() → IR handed to
 *   computeGovernanceDiagnostics + computeGovernanceCodeLenses
 *   → assertions on the produced LSP objects.
 */

import { describe, it, expect } from 'vitest';
import { ServeClient, type FetchLike } from '../../src/serve-client.js';
import { computeGovernanceDiagnostics } from '../../src/providers/governance-diagnostic.js';
import { computeGovernanceCodeLenses } from '../../src/providers/governance-code-lens.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

function buildIR(content: string): GovernanceIRLike {
  const tools: unknown[] = [];
  const intents: unknown[] = [];
  for (const line of content.split('\n')) {
    const toolMatch = line.match(/tool:\s*(\S+)\s*\((R[1-5])\)(\s*\[locked])?/i);
    if (toolMatch) {
      const risk = toolMatch[2]!.toUpperCase();
      tools.push({
        name: toolMatch[1],
        riskLevel: risk,
        elicitationGate: risk === 'R5' ? false : true,
        locked: Boolean(toolMatch[3]),
      });
    }
    const denyMatch = line.match(/deny:\s*(\S+)(?:\s+by\s+(compiler|user))?/i);
    if (denyMatch) {
      intents.push({ kind: 'deny', target: denyMatch[1], source: denyMatch[2] ?? 'user' });
    }
  }
  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
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
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents,
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('LSP governance e2e — live serve compilation', () => {
  it('surfaces diagnostics + code lenses end-to-end via ServeClient', async () => {
    const toolsUri = 'file:///ws/TOOLS.md';
    const toolsContent = [
      '# Tools',
      '## filesystem',
      'tool: read-docs (R1)',
      '## finance',
      'tool: transfer (R5) [locked]',
    ].join('\n');

    const soulUri = 'file:///ws/SOUL.md';
    const soulContent = [
      '# Soul',
      'deny: exfiltrate by compiler',
      'deny: delete-all by user',
    ].join('\n');

    // Simulate a running claws serve instance
    const fetchImpl: FetchLike = async (url, init) => {
      const u = new URL(url);
      if (u.pathname === '/health' && (!init?.method || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            uptime: 12,
            memory: 1024,
            compileCount: 0,
            mode: 'healthy',
          }),
        };
      }
      if (u.pathname === '/compile' && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ir: buildIR(toolsContent), cached: false, durationMs: 4 }),
        };
      }
      return { ok: false, status: 404, json: async () => ({ error: 'not found' }) };
    };

    const client = new ServeClient({ baseUrl: 'http://127.0.0.1:7711', fetchImpl });

    // Health probe
    const health = await client.health();
    expect(health.mode).toBe('healthy');
    expect(client.state).toBe('connected');

    // Compile via serve
    const result = await client.compile();
    expect(result.cached).toBe(false);
    const ir = result.ir;

    // TOOLS.md diagnostics — R1 Info, R5 Error with elicit-gate Info
    const toolsDiags = computeGovernanceDiagnostics(toolsUri, ir, toolsContent);
    const r1 = toolsDiags.find((d) => d.code === 'CLAWS-G-R1');
    const r5 = toolsDiags.find((d) => d.code === 'CLAWS-G-R5');
    const elicit = toolsDiags.find((d) => d.code === 'CLAWS-G-ELICIT');
    expect(r1!.severity).toBe(3);
    expect(r5!.severity).toBe(1);
    expect(r5!.message).toContain('locked');
    expect(elicit!.severity).toBe(3);

    // TOOLS.md code lenses — one per tool
    const toolsLenses = computeGovernanceCodeLenses(toolsUri, ir, toolsContent);
    expect(toolsLenses.map((l) => l.display)).toEqual([
      'R1 READ',
      'R5 TRANSACT (locked)',
    ]);

    // SOUL.md pipeline — compile with SOUL content by rebuilding IR directly
    // (a second /compile endpoint would be a per-URI dispatch; here we exercise
    // the diagnostic + lens path on the SOUL side once IR is available).
    const soulIR = buildIR(soulContent);
    const soulDiags = computeGovernanceDiagnostics(soulUri, soulIR, soulContent);
    expect(soulDiags).toHaveLength(2);
    const compilerDeny = soulDiags.find((d) => d.message.includes('exfiltrate'));
    expect(compilerDeny!.severity).toBe(2);
    expect(compilerDeny!.message).toContain('compiler-injected');

    const soulLenses = computeGovernanceCodeLenses(soulUri, soulIR, soulContent);
    expect(soulLenses.map((l) => l.display)).toEqual([
      'Deny Rule (compiler-injected)',
      'Deny Rule (user-authored)',
    ]);
  });
});
