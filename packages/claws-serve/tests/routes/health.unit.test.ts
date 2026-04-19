import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { healthRouter } from '../../src/routes/health.js';
import { bodyLimit } from '../../src/middleware/body-limit.js';
import { contentType } from '../../src/middleware/content-type.js';
import type { ServerState } from '../../src/server.js';

function makeState(overrides: Partial<ServerState> = {}): ServerState {
  return {
    startedAt: Date.now(),
    compileCount: 0,
    mode: 'healthy',
    ...overrides,
  };
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

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('GET /health', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns correct schema with uptime, memory, and compileCount', async () => {
    const state = makeState({ compileCount: 5 });
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { status, body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(status).toBe(200);
    expect(json).toHaveProperty('uptime');
    expect(json).toHaveProperty('memory');
    expect(json).toHaveProperty('compileCount');
    expect(typeof json['uptime']).toBe('number');
    expect(typeof json['memory']).toBe('number');
    expect(json['compileCount']).toBe(5);
  });

  it('uptime increases over time', async () => {
    const state = makeState({ startedAt: Date.now() - 2000 });
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(json['uptime']).toBeGreaterThanOrEqual(1);
  });

  it('falls back to mode=healthy when state.mode is undefined (backwards compatibility)', async () => {
    // Covers the `state.mode ?? 'healthy'` branch — tests that bypass the
    // startup health check (pre-S33 behaviour) leave `mode` unset.
    const state = { startedAt: Date.now(), compileCount: 0 };
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(json['mode']).toBe('healthy');
  });

  it('response body includes server mode (healthy) (S33)', async () => {
    const state = makeState();
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(json['mode']).toBe('healthy');
    expect(json['degradedReason']).toBeUndefined();
  });

  it('response body includes mode=degraded and a sanitized reason code when set (S33)', async () => {
    const state = makeState({
      mode: 'degraded',
      degradedReason: {
        kind: 'compile-failed',
        compilerMessage: 'SOUL.md broken at /abs/workspace/SOUL.md line 42',
      },
    });
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(json['mode']).toBe('degraded');
    expect(json['degradedReasonCode']).toBe('COMPILATION_FAILED_AT_STARTUP');
    // The full reason object (with compilerMessage) must NOT leak to the
    // anonymous /health endpoint — operators read it from server logs.
    expect(json['degradedReason']).toBeUndefined();
  });

  it('fleet-policy-missing degraded response never leaks the policyFile path', async () => {
    const state = makeState({
      mode: 'degraded',
      degradedReason: {
        kind: 'fleet-policy-missing',
        policyFile: '/etc/claws/secret-location/fleet.json',
      },
    });
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(json['degradedReasonCode']).toBe('FLEET_POLICY_MISSING');
    // Response must never contain the absolute policy path.
    expect(body).not.toContain('/etc/claws/secret-location/fleet.json');
    expect(body).not.toContain('policyFile');
  });

  it('fleet-policy-corrupt degraded response never leaks the parser cause', async () => {
    const state = makeState({
      mode: 'degraded',
      degradedReason: {
        kind: 'fleet-policy-corrupt',
        policyFile: '/etc/claws/fleet.json',
        cause: 'Unexpected token { in JSON at position 142',
      },
    });
    const app = express();
    app.use(healthRouter(state));
    server = await listen(app);

    const { body } = await request(server, 'GET', '/health');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(json['degradedReasonCode']).toBe('FLEET_POLICY_CORRUPT');
    expect(body).not.toContain('Unexpected token');
    expect(body).not.toContain('/etc/claws/fleet.json');
  });
});

describe('body-limit middleware', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('rejects POST with body > limit via Content-Length header with 413', async () => {
    const app = express();
    app.post('/test', contentType(), bodyLimit(1024), (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    const oversizedBody = 'x'.repeat(2048);
    const { status, body } = await request(server, 'POST', '/test', {
      body: oversizedBody,
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(413);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Payload Too Large');
  });

  it('allows POST with body under limit', async () => {
    const app = express();
    app.post('/test', contentType(), bodyLimit(4096), (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    const smallBody = JSON.stringify({ data: 'small' });
    const { status } = await request(server, 'POST', '/test', {
      body: smallBody,
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
  });

  it('allows POST when no Content-Length and body under limit', async () => {
    const app = express();
    app.post('/test', contentType(), bodyLimit(4096), (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    const { status } = await request(server, 'POST', '/test', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
  });
});

describe('content-type middleware', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('rejects POST without application/json with 415', async () => {
    const app = express();
    app.post('/test', contentType(), (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/test', {
      body: 'not json',
      headers: { 'content-type': 'text/plain' },
    });

    expect(status).toBe(415);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Unsupported Media Type');
  });

  it('rejects POST with no Content-Type header with 415', async () => {
    const app = express();
    app.post('/test', contentType(), (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    const { status } = await request(server, 'POST', '/test', {
      body: 'data',
    });

    expect(status).toBe(415);
  });

  it('allows POST with application/json Content-Type', async () => {
    const app = express();
    app.post('/test', contentType(), bodyLimit(4096), (_req, res) => {
      res.json({ ok: true });
    });
    server = await listen(app);

    const { status } = await request(server, 'POST', '/test', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
  });
});
