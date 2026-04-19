import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp } from '../../src/server.js';
import type { ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
async function request(
  server: Server,
  method: string,
  path: string,
  options: { body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: string; headers: Headers }> {
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
  return { status: res.status, body, headers: res.headers };
}

function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('snapshot + diff integration', () => {
  let server: Server;
  let compileCallCount = 0;

  afterEach(() => {
    server?.close();
    compileCallCount = 0;
  });

  it('save, modify, save, diff shows delta', async () => {
    let currentVersion = 1;
    const compileFn = async (): Promise<GovernanceIR> => {
      compileCallCount++;
      const base = minimalGovernanceIR();
      if (currentVersion === 1) {
        return base;
      }
      // Version 2: add a violation, change conflict count, change tool risk
      return {
        ...base,
        capabilities: {
          ...base.capabilities,
          tools: [
            {
              name: 'read_file',
              description: 'Read a file from disk',
              riskLevel: 'high',
              oboFlag: false,
              classification: 'filesystem',
            },
          ],
        },
        analysis: {
          ...base.analysis,
          violations: [
            {
              ruleId: 'R-BLOCK-01',
              level: 1,
              message: 'Tool blocked by policy',
              target: 'tool:write_file',
              diagnosticCode: 'GOV-BLOCK-01',
              fixSuggestions: [],
              toolFuzzyMatches: [],
            },
          ],
        },
        conflicts: {
          ...base.conflicts,
          totalConflicts: 3,
        },
      };
    };

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    });
    server = await listen(app);

    // Step 1: compile and save first snapshot
    const compile1 = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compile1.status).toBe(200);

    const snap1 = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'before' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(snap1.status).toBe(201);

    // Step 2: modify IR by changing version, invalidate and recompile
    currentVersion = 2;
    const invalidateRes = await request(server, 'POST', '/invalidate', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(invalidateRes.status).toBe(200);

    const compile2 = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compile2.status).toBe(200);

    // Step 3: save second snapshot
    const snap2 = await request(server, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'after' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(snap2.status).toBe(201);

    // Step 4: diff shows the delta
    const diffRes = await request(server, 'GET', '/diff?from=before&to=after');
    expect(diffRes.status).toBe(200);

    const diff = JSON.parse(diffRes.body) as Record<string, unknown>;
    expect(diff['from']).toBe('before');
    expect(diff['to']).toBe('after');

    // Violations: 1 added, 0 removed
    const violations = diff['violations'] as Record<string, unknown>;
    expect((violations['added'] as unknown[]).length).toBe(1);
    expect((violations['removed'] as unknown[]).length).toBe(0);

    // Tensions: 0 -> 3
    const tensions = diff['tensions'] as Record<string, unknown>;
    expect(tensions['before']).toBe(0);
    expect(tensions['after']).toBe(3);
    expect(tensions['delta']).toBe(3);

    // Risk shifts: read_file went from low to high
    const riskShifts = diff['riskShifts'] as { toolName: string; from: string; to: string }[];
    expect(riskShifts.length).toBe(1);
    expect(riskShifts[0]!.toolName).toBe('read_file');
    expect(riskShifts[0]!.from).toBe('low');
    expect(riskShifts[0]!.to).toBe('high');
  });

  it('invalidate then GET /ir recompiles', async () => {
    const compileFn = async (): Promise<GovernanceIR> => {
      compileCallCount++;
      return minimalGovernanceIR();
    };

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    });
    server = await listen(app);

    // Compile to fill cache
    const compile1 = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compile1.status).toBe(200);
    expect(compileCallCount).toBe(1);

    // GET /ir should work
    const ir1 = await request(server, 'GET', '/ir');
    expect(ir1.status).toBe(200);

    // Invalidate
    const inv = await request(server, 'POST', '/invalidate', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(inv.status).toBe(200);

    // GET /ir returns 404 — cache is empty
    const ir2 = await request(server, 'GET', '/ir');
    expect(ir2.status).toBe(404);

    // POST /compile triggers fresh recompile
    const compile2 = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compile2.status).toBe(200);
    expect(compileCallCount).toBe(2);

    // GET /ir now works again
    const ir3 = await request(server, 'GET', '/ir');
    expect(ir3.status).toBe(200);
  });
});
