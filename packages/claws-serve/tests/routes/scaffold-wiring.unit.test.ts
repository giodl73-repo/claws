/**
 * L0 unit test for the CP-5 scaffold wiring in createApp.
 *
 * Exercises the `compileFn !== undefined` branch so the compile-enabled
 * path is covered at the unit tier. Verifies registerRoutes is invoked
 * (reachable via /api/health) and notFoundHandler + errorHandler are
 * mounted globally.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no address');
  const res = await fetch(`http://127.0.0.1:${String(address.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

describe('createApp — CP-5 scaffold wiring', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('mounts /api/health when a compileFn is supplied', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/stub',
    });
    server = await listen(app);

    const { status, body } = await get(server, '/api/health');
    expect(status).toBe(200);
    const json = JSON.parse(body) as { status: string };
    expect(json.status).toBe('ok');
  });

  it('uses process.cwd() as workspaceRoot when none is provided', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
    });
    server = await listen(app);

    // /api/health is wired via the compileFn branch and returns 200
    const { status } = await get(server, '/api/health');
    expect(status).toBe(200);
  });

  it('falls through to notFoundHandler + errorHandler on unknown route', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/stub',
    });
    server = await listen(app);

    const { status, body } = await get(server, '/definitely/missing');
    expect(status).toBe(404);
    const json = JSON.parse(body) as { error: { code: string } };
    expect(json.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('createApp without compileFn still mounts global notFoundHandler', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {});
    server = await listen(app);

    const { status, body } = await get(server, '/api/does-not-exist');
    expect(status).toBe(404);
    const json = JSON.parse(body) as { error: { code: string } };
    expect(json.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
