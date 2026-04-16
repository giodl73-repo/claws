import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { invalidateRouter } from '../../src/routes/invalidate.js';
import { irRouter } from '../../src/routes/ir.js';
import { contentType } from '../../src/middleware/content-type.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { compileRouter } from '../../src/routes/compile.js';
import type { ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

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

describe('POST /invalidate', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('clears the CompilationHost cache and forces recompile on next GET /ir', async () => {
    const ir = minimalGovernanceIR();
    let compileCallCount = 0;
    const compileFn = async () => {
      compileCallCount++;
      return ir;
    };
    const host = new CompilationHost(compileFn, '/test');
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };

    // Prime the cache
    await host.compile();
    expect(compileCallCount).toBe(1);
    expect(host.hasCachedIR).toBe(true);

    const app = express();
    app.post('*', contentType());
    app.use(invalidateRouter(host));
    app.use(irRouter(host));
    app.use(compileRouter(host, state));
    server = await listen(app);

    // GET /ir works before invalidation
    const irBefore = await request(server, 'GET', '/ir');
    expect(irBefore.status).toBe(200);

    // POST /invalidate
    const { status, body } = await request(server, 'POST', '/invalidate', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['invalidated']).toBe(true);

    // Cache is now empty — GET /ir should return 404
    const irAfter = await request(server, 'GET', '/ir');
    expect(irAfter.status).toBe(404);

    // POST /compile triggers a full recompile
    const compileRes = await request(server, 'POST', '/compile', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    expect(compileRes.status).toBe(200);
    expect(compileCallCount).toBe(2);

    // GET /ir works again
    const irFinal = await request(server, 'GET', '/ir');
    expect(irFinal.status).toBe(200);
  });
});
