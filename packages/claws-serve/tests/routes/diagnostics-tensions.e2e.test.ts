import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp } from '../../src/server.js';
import type { ServerState } from '../../src/server.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

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

describe('diagnostics + tensions + classify e2e lifecycle', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('compile workspace, then query diagnostics, tensions, and classify', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async (): Promise<GovernanceIR> => ir;

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    });
    server = await listen(app);

    // Step 1: Compile workspace with violations
    const compileRes = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);

    // Step 2: GET /diagnostics returns violations
    const diagRes = await request(server, 'GET', '/diagnostics');
    expect(diagRes.status).toBe(200);
    const diagJson = JSON.parse(diagRes.body) as Record<string, unknown>;
    expect(diagJson['count']).toBe(2);
    const violations = diagJson['violations'] as Array<Record<string, unknown>>;
    expect(violations[0]!['ruleId']).toBe('GOV-001');
    expect(violations[0]!['level']).toBe(5);
    expect(violations[0]!['target']).toBe('policy.yaml:12');
    expect(violations[1]!['ruleId']).toBe('GOV-002');
    expect(violations[1]!['target']).toBe('rules/exec.crest:5');

    // Step 3: GET /tensions returns tensions
    const tensionRes = await request(server, 'GET', '/tensions');
    expect(tensionRes.status).toBe(200);
    const tensionJson = JSON.parse(tensionRes.body) as Record<string, unknown>;
    expect(tensionJson['count']).toBe(2);
    const tensions = tensionJson['tensions'] as Array<Record<string, unknown>>;
    // OBO conflict → cluster A
    expect(tensions[0]!['cluster']).toBe('A');
    expect(tensions[0]!['severity']).toBe('error');
    // Multi-constraint → cluster B
    expect(tensions[1]!['cluster']).toBe('B');
    expect(tensions[1]!['severity']).toBe('warning');

    // Step 4: GET /classify/send-email returns R5
    const classifyRes = await request(server, 'GET', '/classify/send-email');
    expect(classifyRes.status).toBe(200);
    const classifyJson = JSON.parse(classifyRes.body) as Record<string, unknown>;
    expect(classifyJson['rLevel']).toBe('R5');
    expect(classifyJson['oboFlag']).toBe(true);
    expect(classifyJson['classification']).toBe('communication');
    expect(classifyJson['tool']).toBe('send-email');
  });
});
