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

describe('compile + ir integration', () => {
  let server: Server;
  let callCount = 0;
  let currentIR: GovernanceIR;

  afterEach(() => {
    server?.close();
    callCount = 0;
  });

  it('POST /compile then GET /ir reflects the compiled IR', async () => {
    currentIR = minimalGovernanceIR();
    const compileFn = async () => {
      callCount++;
      return currentIR;
    };

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    });
    server = await listen(app);

    // POST /compile
    const compileRes = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);
    const compileJson = JSON.parse(compileRes.body) as Record<string, unknown>;
    const compileIR = compileJson['ir'] as Record<string, unknown>;
    expect(compileIR).toHaveProperty('compiler');

    // GET /ir should return the same IR
    const irRes = await request(server, 'GET', '/ir');
    expect(irRes.status).toBe(200);
    const irJson = JSON.parse(irRes.body) as Record<string, unknown>;
    expect(irJson).toHaveProperty('compiler');

    // Both should match
    const compileCompiler = compileIR['compiler'] as Record<string, unknown>;
    const irCompiler = irJson['compiler'] as Record<string, unknown>;
    expect(irCompiler['compilerVersion']).toBe(compileCompiler['compilerVersion']);
    expect(irCompiler['schemaVersion']).toBe(compileCompiler['schemaVersion']);

    // compileCount should have incremented
    expect(state.compileCount).toBe(1);
    expect(callCount).toBe(1);
  });

  it('cache hit vs miss behavior across consecutive compiles', async () => {
    let version = 1;
    const compileFn = async (): Promise<GovernanceIR> => {
      callCount++;
      const base = minimalGovernanceIR();
      return {
        ...base,
        compiler: {
          ...base.compiler,
          schemaVersion: version,
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

    // First compile — cache miss
    const first = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(first.status).toBe(200);
    const firstJson = JSON.parse(first.body) as Record<string, unknown>;
    expect(firstJson['cached']).toBe(false);

    // Second compile with same version — cache hit
    const second = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(second.status).toBe(200);
    const secondJson = JSON.parse(second.body) as Record<string, unknown>;
    expect(secondJson['cached']).toBe(true);

    // GET /ir returns ETag header
    const irRes = await request(server, 'GET', '/ir');
    expect(irRes.status).toBe(200);
    const etag1 = irRes.headers.get('etag');
    expect(etag1).toBeTruthy();

    // Change the version — cache miss
    version = 2;
    const third = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(third.status).toBe(200);
    const thirdJson = JSON.parse(third.body) as Record<string, unknown>;
    expect(thirdJson['cached']).toBe(false);

    // ETag should change after cache miss
    const irRes2 = await request(server, 'GET', '/ir');
    const etag2 = irRes2.headers.get('etag');
    expect(etag2).toBeTruthy();
    expect(etag2).not.toBe(etag1);

    // compileFn was called 3 times total
    expect(callCount).toBe(3);
  });
});
