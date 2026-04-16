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
