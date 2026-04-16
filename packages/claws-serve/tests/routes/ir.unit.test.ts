import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { irRouter } from '../../src/routes/ir.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

async function request(
  server: Server,
  path: string,
): Promise<{ status: number; body: string; headers: Headers }> {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  const url = `http://127.0.0.1:${String(address.port)}${path}`;
  const res = await fetch(url);
  const body = await res.text();
  return { status: res.status, body, headers: res.headers };
}

function listen(app: express.Express): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('GET /ir', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns cached IR in sub-100ms on cache hit', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');

    // Prime the cache
    await host.compile();

    const app = express();
    app.use(irRouter(host));
    server = await listen(app);

    const start = Date.now();
    const { status } = await request(server, '/ir');
    const elapsed = Date.now() - start;

    expect(status).toBe(200);
    expect(elapsed).toBeLessThan(100);
  });

  it('returns GovernanceIR matching the canonical type', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(irRouter(host));
    server = await listen(app);

    const { status, body, headers } = await request(server, '/ir');

    expect(status).toBe(200);

    const json = JSON.parse(body) as Record<string, unknown>;
    // Verify it matches the GovernanceIR type structure
    expect(json).toHaveProperty('capabilities');
    expect(json).toHaveProperty('analysis');
    expect(json).toHaveProperty('intents');
    expect(json).toHaveProperty('delegationMap');
    expect(json).toHaveProperty('conflicts');
    expect(json).toHaveProperty('compiler');

    // Verify cache headers
    expect(headers.get('etag')).toBeTruthy();
    expect(headers.get('cache-control')).toBe('private, no-cache');
  });

  it('returns 404 when no IR is cached', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');
    // Do NOT compile — cache is empty

    const app = express();
    app.use(irRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/ir');

    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('No compiled IR available. POST /compile first.');
  });
});
