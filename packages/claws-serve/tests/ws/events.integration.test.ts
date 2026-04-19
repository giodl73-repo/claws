import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { ClientManager, attachWsHandler, type WsEvent } from '../../src/ws/events.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
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

function waitForMessage(ws: WebSocket): Promise<WsEvent> {
  return new Promise((resolve) => {
    ws.once('message', (data: Buffer) => {
      resolve(JSON.parse(data.toString()) as WsEvent);
    });
  });
}

function collectMessages(ws: WebSocket, count: number, timeoutMs: number = 3000): Promise<WsEvent[]> {
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
): Promise<{ status: number; body: string }> {
  const url = `http://127.0.0.1:${String(port)}${path}`;
  const fetchOptions: RequestInit = { method, headers: options.headers };
  if (options.body !== undefined) {
    fetchOptions.body = options.body;
  }
  const res = await fetch(url, fetchOptions);
  const body = await res.text();
  return { status: res.status, body };
}

describe('WebSocket lifecycle integration', () => {
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

  it('connect, trigger compile, receive compile:start + compile:complete + diagnostic:update + tension:detected events', async () => {
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

    server = await listen(app);
    const port = getPort(server);

    // Attach WebSocket server
    wss = new WebSocketServer({ server, path: '/ws' });
    attachWsHandler(wss, clientManager, '127.0.0.1');

    // Connect a WebSocket client
    const ws = await connectWs(port);
    wsClients.push(ws);

    // Collect events while triggering a compile
    const eventPromise = collectMessages(ws, 4);

    await httpRequest(port, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    const events = await eventPromise;

    // Should receive compile:start, compile:complete, diagnostic:update, tension:detected
    const types = events.map((e) => e.type);
    expect(types).toContain('compile:start');
    expect(types).toContain('compile:complete');
    expect(types).toContain('diagnostic:update');
    expect(types).toContain('tension:detected');

    // Verify event structure
    for (const event of events) {
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('payload');
    }
  });

  it('reconnection resumes with no replay — new client receives only future events', async () => {
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

    server = await listen(app);
    const port = getPort(server);

    wss = new WebSocketServer({ server, path: '/ws' });
    attachWsHandler(wss, clientManager, '127.0.0.1');

    // Client 1 connects and receives events from first compile
    const ws1 = await connectWs(port);
    wsClients.push(ws1);

    const firstEvents = collectMessages(ws1, 4);

    await httpRequest(port, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    const first = await firstEvents;
    expect(first.length).toBeGreaterThanOrEqual(1);

    // Client 1 disconnects
    ws1.close();
    await new Promise<void>((resolve) => { ws1.on('close', resolve); });

    // Trigger a second compile while no one is connected
    await httpRequest(port, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    // Client 2 connects — should NOT receive events from the second compile (no replay)
    const ws2 = await connectWs(port);
    wsClients.push(ws2);

    // Collect with a short timeout — should get nothing from past
    const missedEvents = await collectMessages(ws2, 1, 200);
    expect(missedEvents.length).toBe(0);

    // But new events DO arrive
    const thirdEvents = collectMessages(ws2, 1);

    await httpRequest(port, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    const third = await thirdEvents;
    expect(third.length).toBeGreaterThanOrEqual(1);
    expect(third[0]!.type).toBe('compile:start');
  });
});
