/**
 * L1 integration tests for the CP-5 serve scaffold: verifies the
 * /api/* prefix tree is registered and unknown routes produce a
 * structured 404 via the error handler.
 *
 * Pulse 21 (serve-scaffold) deliverable.
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { createApp } from '../../src/server.js';
import type { ServerState } from '../../src/server.js';
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

describe('serve-scaffold route registration', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('registers the /api/* prefix tree and /api/health returns 200', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, { compileFn: async () => minimalGovernanceIR(), trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: '/stub' });
    server = await listen(app);

    const health = await get(server, '/api/health');
    expect(health.status).toBe(200);
    const healthBody = JSON.parse(health.body) as { status: string; version: string; uptime: number };
    expect(healthBody.status).toBe('ok');
    expect(typeof healthBody.version).toBe('string');

    // Each prefix is mounted — unknown child paths under a registered
    // prefix resolve through the scaffold and fall through to the
    // shared 404 handler (not a raw Express "Cannot GET" HTML).
    for (const prefix of ['/api/oc', '/api/chunks', '/api/governance', '/api/status', '/api/events']) {
      const res = await get(server, `${prefix}/__ping__`);
      expect(res.status).toBe(404);
      const json = JSON.parse(res.body) as { error: { code: string } };
      expect(json.error.code).toBe('ROUTE_NOT_FOUND');
    }
  });

  it('unknown routes outside /api return a structured 404 via the error handler', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, { compileFn: async () => minimalGovernanceIR(), trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: '/stub' });
    server = await listen(app);

    const res = await get(server, '/nope');
    expect(res.status).toBe(404);
    const json = JSON.parse(res.body) as { error: { code: string; message: string } };
    expect(json.error.code).toBe('ROUTE_NOT_FOUND');
    expect(json.error.message).toContain('/nope');
  });
});
