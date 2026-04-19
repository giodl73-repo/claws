import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../src/server.js';
import { ClientManager, attachWsHandler, type WsEvent } from '../src/ws/events.js';
import { governanceIRWithViolations } from './fixtures/governance-ir-with-violations.js';
import { minimalGovernanceIR } from './fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from './fixtures/trust-key.js';
function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

function getPort(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  return address.port;
}

function connectWs(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${String(port)}/ws`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function collectMessages(ws: WebSocket, count: number, timeoutMs: number = 5000): Promise<WsEvent[]> {
  return new Promise((resolve, reject) => {
    const events: WsEvent[] = [];
    const timeout = setTimeout(() => {
      resolve(events);
    }, timeoutMs);

    ws.on('message', (data: Buffer) => {
      events.push(JSON.parse(data.toString()) as WsEvent);
      if (events.length >= count) {
        clearTimeout(timeout);
        resolve(events);
      }
    });

    ws.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function httpRequest(
  port: number,
  method: string,
  path: string,
  options: { body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: string; headers: Headers }> {
  const url = `http://127.0.0.1:${String(port)}${path}`;
  const fetchOptions: RequestInit = { method, headers: options.headers };
  if (options.body !== undefined) {
    fetchOptions.body = options.body;
  }
  const res = await fetch(url, fetchOptions);
  const body = await res.text();
  return { status: res.status, body, headers: res.headers };
}

describe('full daemon lifecycle E2E', () => {
  let server: Server;
  let wss: WebSocketServer;
  let clientManager: ClientManager;
  const wsClients: WebSocket[] = [];

  afterEach(() => {
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    wsClients.length = 0;
    wss?.close();
    server?.close();
  });

  it('start, compile, fetch IR, receive WS events, snapshot, invalidate, shutdown', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async (): Promise<GovernanceIR> => ir;

    clientManager = new ClientManager();
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    }, clientManager);

    // Step 1: Start the server
    server = await listen(app);
    const port = getPort(server);

    wss = new WebSocketServer({ server, path: '/ws' });
    attachWsHandler(wss, clientManager, '127.0.0.1');

    // Verify health
    const health = await httpRequest(port, 'GET', '/health');
    expect(health.status).toBe(200);

    // Step 2: Connect WebSocket
    const ws = await connectWs(port);
    wsClients.push(ws);

    // Step 3: Compile and collect events
    const eventPromise = collectMessages(ws, 4);

    const compileRes = await httpRequest(port, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);

    const compileEvents = await eventPromise;
    const compileTypes = compileEvents.map((e) => e.type);
    expect(compileTypes).toContain('compile:start');
    expect(compileTypes).toContain('compile:complete');

    // Step 4: Fetch IR
    const irRes = await httpRequest(port, 'GET', '/ir');
    expect(irRes.status).toBe(200);
    const irJson = JSON.parse(irRes.body) as Record<string, unknown>;
    expect(irJson).toHaveProperty('compiler');
    expect(irJson).toHaveProperty('capabilities');

    // Step 5: Fetch diagnostics
    const diagRes = await httpRequest(port, 'GET', '/diagnostics');
    expect(diagRes.status).toBe(200);

    // Step 6: Fetch tensions
    const tensionRes = await httpRequest(port, 'GET', '/tensions');
    expect(tensionRes.status).toBe(200);

    // Step 7: Save snapshot and collect event
    const snapshotEventPromise = collectMessages(ws, 1);
    const snapRes = await httpRequest(port, 'POST', '/snapshot', {
      body: JSON.stringify({ name: 'e2e-baseline' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(snapRes.status).toBe(201);

    const snapshotEvents = await snapshotEventPromise;
    expect(snapshotEvents[0]!.type).toBe('snapshot:saved');

    // Step 8: Invalidate and collect events
    const invalidateEventPromise = collectMessages(ws, 2);
    const invalidateRes = await httpRequest(port, 'POST', '/invalidate', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(invalidateRes.status).toBe(200);

    const invalidateEvents = await invalidateEventPromise;
    const invTypes = invalidateEvents.map((e) => e.type);
    expect(invTypes).toContain('ir:invalidated');
    expect(invTypes).toContain('tension:resolved');

    // Step 9: IR should be 404 after invalidation
    const irAfterInvalidate = await httpRequest(port, 'GET', '/ir');
    expect(irAfterInvalidate.status).toBe(404);

    // Step 10: CORS headers present
    expect(health.headers.get('x-content-type-options')).toBe('nosniff');
    expect(health.headers.get('x-frame-options')).toBe('DENY');

    // Step 11: Shutdown
    ws.close();
    clientManager.closeAll();
    server.close();

    expect(state.compileCount).toBe(1);
  });

  it('10 concurrent GET /ir requests return consistent results', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async (): Promise<GovernanceIR> => ir;

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: '/test',
      rateLimitMax: 100,
    });

    server = await listen(app);
    const port = getPort(server);

    // First, compile to populate the cache
    const compileRes = await httpRequest(port, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);

    // Fire 10 concurrent GET /ir requests
    const requests = Array.from({ length: 10 }, () =>
      httpRequest(port, 'GET', '/ir'),
    );

    const results = await Promise.all(requests);

    // All should succeed
    for (const result of results) {
      expect(result.status).toBe(200);
    }

    // All should return identical bodies
    const bodies = results.map((r) => r.body);
    const firstBody = bodies[0]!;
    for (let i = 1; i < bodies.length; i++) {
      expect(bodies[i]).toBe(firstBody);
    }

    // All should have the same ETag
    const etags = results.map((r) => r.headers.get('etag'));
    const firstEtag = etags[0];
    for (let i = 1; i < etags.length; i++) {
      expect(etags[i]).toBe(firstEtag);
    }
  });
});
