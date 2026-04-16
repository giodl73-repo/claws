import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { compileRouter } from '../../src/routes/compile.js';
import { contentType } from '../../src/middleware/content-type.js';
import { CompilationHost } from '../../src/compilation-host.js';
import type { ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

function makeState(overrides: Partial<ServerState> = {}): ServerState {
  return {
    startedAt: Date.now(),
    compileCount: 0,
    ...overrides,
  };
}

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

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('POST /compile', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('triggers compilation and returns GovernanceIR', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json).toHaveProperty('ir');
    expect(json).toHaveProperty('cached');
    expect(json).toHaveProperty('durationMs');

    const returnedIR = json['ir'] as Record<string, unknown>;
    expect(returnedIR).toHaveProperty('capabilities');
    expect(returnedIR).toHaveProperty('analysis');
    expect(returnedIR).toHaveProperty('intents');
    expect(returnedIR).toHaveProperty('delegationMap');
    expect(returnedIR).toHaveProperty('conflicts');
    expect(returnedIR).toHaveProperty('compiler');
    expect(state.compileCount).toBe(1);
  });

  it('response matches GovernanceIR schema structure', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    const returnedIR = json['ir'] as Record<string, unknown>;

    // Verify compiler metadata shape
    const compiler = returnedIR['compiler'] as Record<string, unknown>;
    expect(compiler).toHaveProperty('compilerVersion');
    expect(compiler).toHaveProperty('compiledAt');
    expect(compiler).toHaveProperty('schemaVersion');
    expect(typeof compiler['compilerVersion']).toBe('string');
    expect(typeof compiler['compiledAt']).toBe('string');
    expect(typeof compiler['schemaVersion']).toBe('number');

    // Verify analysis shape
    const analysis = returnedIR['analysis'] as Record<string, unknown>;
    expect(analysis).toHaveProperty('violations');
    expect(analysis).toHaveProperty('warnings');
    expect(analysis).toHaveProperty('enforcementPlan');

    // Verify capabilities shape
    const capabilities = returnedIR['capabilities'] as Record<string, unknown>;
    expect(capabilities).toHaveProperty('tools');
    expect(Array.isArray(capabilities['tools'])).toBe(true);
  });

  it('returns 500 when compilation fails with Error', async () => {
    const compileFn = async () => { throw new Error('Compile error'); };
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(500);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Compile error');
  });

  it('returns 500 with generic message when non-Error is thrown', async () => {
    const compileFn = async () => { throw 'string error'; };
    const host = new CompilationHost(compileFn, '/test');
    const state = makeState();

    const app = express();
    app.post('*', contentType());
    app.use(compileRouter(host, state));
    server = await listen(app);

    const { status, body } = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(500);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('Compilation failed');
  });
});
