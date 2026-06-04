import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Server } from 'node:http';
import { createApp, resolvePort, startServer, registerGracefulShutdown } from '../src/server.js';
import type { ServerState } from '../src/server.js';

import { TEST_TRUST_SIGNING_KEY } from './fixtures/trust-key.js';
function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

async function request(server: Server, method: string, path: string, options: { body?: string; headers?: Record<string, string> } = {}): Promise<{ status: number; body: string }> {
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

describe('createApp', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('creates an Express app with health route and status (501 without compileFn)', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state);
    server = await listen(app);

    const root = await request(server, 'GET', '/');
    expect(root.status).toBe(200);
    expect(JSON.parse(root.body)).toMatchObject({
      service: 'claws-serve',
      name: 'claws-serve',
      status: 'ok',
      routes: {
        health: '/health',
        apiHealth: '/api/health',
      },
    });

    const health = await request(server, 'GET', '/health');
    expect(health.status).toBe(200);

    // No compileFn → status returns 501
    const status = await request(server, 'GET', '/status');
    expect(status.status).toBe(501);
  });

  it('applies content-type middleware to POST routes', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state);
    server = await listen(app);

    const { status } = await request(server, 'POST', '/compile', {
      body: 'data',
      headers: { 'content-type': 'text/plain' },
    });

    expect(status).toBe(415);
  });

  it('applies body-limit middleware to POST routes', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state);
    server = await listen(app);

    const oversized = 'x'.repeat(1_048_577);
    const { status } = await request(server, 'POST', '/compile', {
      body: oversized,
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(413);
  });

  it('accepts custom rateLimitMax option', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, { rateLimitMax: 1 });
    server = await listen(app);

    // First request should succeed (rate limit of 1)
    const first = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    // The route doesn't exist, so it returns 404 (but not 429)
    expect(first.status).not.toBe(429);

    // Second request should be rate limited
    const second = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(second.status).toBe(429);
  });
});

describe('resolvePort', () => {
  const originalEnv = process.env['CLAWS_PORT'];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['CLAWS_PORT'] = originalEnv;
    } else {
      delete process.env['CLAWS_PORT'];
    }
  });

  it('returns explicit port from options', () => {
    expect(resolvePort({ port: 4000 })).toBe(4000);
  });

  it('returns port from CLAWS_PORT env var', () => {
    process.env['CLAWS_PORT'] = '5000';
    expect(resolvePort({})).toBe(5000);
  });

  it('returns default 3939 when no port specified', () => {
    delete process.env['CLAWS_PORT'];
    expect(resolvePort({})).toBe(3939);
  });

  it('ignores invalid CLAWS_PORT env var', () => {
    process.env['CLAWS_PORT'] = 'not-a-number';
    expect(resolvePort({})).toBe(3939);
  });

  it('ignores empty CLAWS_PORT env var', () => {
    process.env['CLAWS_PORT'] = '';
    expect(resolvePort({})).toBe(3939);
  });

  it('ignores out-of-range CLAWS_PORT env var', () => {
    process.env['CLAWS_PORT'] = '99999';
    expect(resolvePort({})).toBe(3939);
  });

  it('prefers explicit port over env var', () => {
    process.env['CLAWS_PORT'] = '5000';
    expect(resolvePort({ port: 4000 })).toBe(4000);
  });
});

describe('startServer', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
  });

  it('starts server and returns state', () => {
    const result = startServer({ port: 0, host: '127.0.0.1' });
    server = result.server;

    expect(result.state).toHaveProperty('startedAt');
    expect(result.state).toHaveProperty('compileCount');
    expect(result.state.compileCount).toBe(0);
  });

  it('logs warning when host is 0.0.0.0', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = startServer({ port: 0, host: '0.0.0.0' });
    server = result.server;

    expect(warnSpy).toHaveBeenCalledWith(
      'WARNING: Server exposed to network without authentication. Use a reverse proxy for production.'
    );
    warnSpy.mockRestore();
  });

  it('does not log warning when host is 127.0.0.1', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = startServer({ port: 0, host: '127.0.0.1' });
    server = result.server;

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('uses default host when none specified', () => {
    const result = startServer({ port: 0 });
    server = result.server;
    expect(result.state.compileCount).toBe(0);
  });

  it('creates clientManager when noWs is false (default)', () => {
    const result = startServer({ port: 0, host: '127.0.0.1' });
    server = result.server;
    expect(result.clientManager).toBeDefined();
  });

  it('does not create clientManager when noWs is true', () => {
    const result = startServer({ port: 0, host: '127.0.0.1', noWs: true });
    server = result.server;
    expect(result.clientManager).toBeUndefined();
  });

  it('runs startup health check when compileFn is supplied (S33)', async () => {
    // Exercises the startup health-check wiring: supply a compileFn + a
    // fleetPolicyFile, start the server, and wait for the async health
    // check to update `state.mode`. We don't assert the mode's value
    // here (health-check.unit tests do that); we only need coverage of
    // the branch that kicks off runStartupHealthCheck.
    const result = startServer({
      port: 0,
      host: '127.0.0.1',
      noWs: true,
      compileFn: async () => {
        throw new Error('broken workspace');
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: process.cwd(),
      fleetPolicyFile: '/does/not/exist.json',
    });
    server = result.server;

    // Poll for the async health check to complete (up to 500ms).
    for (let i = 0; i < 50; i += 1) {
      if (result.state.mode === 'degraded') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(result.state.mode).toBe('degraded');
    expect(result.state.degradedReason?.kind).toBe('compile-failed');
  });

  it('runs startup health check with no fleetPolicyFile option (S33)', async () => {
    // The other branch of the Parameters<...>[0] conditional — omit
    // fleetPolicyFile so the health options object has only `host`.
    const result = startServer({
      port: 0,
      host: '127.0.0.1',
      noWs: true,
      compileFn: async () => ({
        capabilities: { tools: [], skills: [], agents: [], workflows: [] },
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
        intents: [],
        delegationMap: [],
        conflicts: {
          oboConflicts: [],
          multiConstraintConflicts: [],
          haltReason: null,
          hasOboWithoutElicit: false,
          totalConflicts: 0,
        },
        compiler: {
          compilerVersion: '0.1.0',
          compiledAt: '2026-04-17T00:00:00.000Z',
          schemaVersion: 1,
        },
      }),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: process.cwd(),
    });
    server = result.server;
    for (let i = 0; i < 50; i += 1) {
      if (result.state.mode === 'healthy' && result.state.degradedReason === undefined) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(result.state.mode).toBe('healthy');
  });
});

describe('registerGracefulShutdown', () => {
  it('calls server.close when shutdown function is invoked', () => {
    const closeFn = vi.fn();
    const mockServer = { close: closeFn } as unknown as Server;

    // Spy on process.on to capture the handler
    const onSpy = vi.spyOn(process, 'on');

    registerGracefulShutdown(mockServer);

    // Find the SIGTERM handler that was registered
    const sigtermCall = onSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
    expect(sigtermCall).toBeDefined();

    // Invoke the shutdown handler
    const handler = sigtermCall![1] as () => void;
    handler();

    expect(closeFn).toHaveBeenCalled();

    onSpy.mockRestore();
  });

  it('calls clientManager.closeAll on shutdown when provided', () => {
    const closeFn = vi.fn();
    const mockServer = { close: closeFn } as unknown as Server;
    const closeAllFn = vi.fn();
    const mockManager = { closeAll: closeAllFn } as unknown as import('../src/ws/events.js').ClientManager;

    const onSpy = vi.spyOn(process, 'on');

    registerGracefulShutdown(mockServer, mockManager);

    const sigtermCall = onSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
    expect(sigtermCall).toBeDefined();

    const handler = sigtermCall![1] as () => void;
    handler();

    expect(closeAllFn).toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();

    onSpy.mockRestore();
  });
});
