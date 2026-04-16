import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { statusRouter, type StatusResponse } from '../../src/routes/status.js';
import { CompilationHost } from '../../src/compilation-host.js';
import type { GovernanceIR } from '@bic/claws-sdk';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

async function request(server: Server, path: string): Promise<{ status: number; body: string }> {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server not listening on TCP');
  }
  const url = `http://127.0.0.1:${String(address.port)}${path}`;
  const res = await fetch(url);
  const body = await res.text();
  return { status: res.status, body };
}

function listenOnFree(app: ReturnType<typeof express>): Promise<Server> {
  return new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => { resolve(s); });
  });
}

describe('GET /status', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns 501 when no CompilationHost is wired', async () => {
    const app = express();
    app.use(statusRouter());
    server = await listenOnFree(app);

    const { status, body } = await request(server, '/status');
    const json = JSON.parse(body) as Record<string, unknown>;

    expect(status).toBe(501);
    expect(json).toHaveProperty('error');
  });

  it('returns zeros when CompilationHost has no cached IR', async () => {
    const compileFn = async (): Promise<GovernanceIR> => governanceIRWithViolations();
    const host = new CompilationHost(compileFn, '/test');

    const app = express();
    app.use(statusRouter(host));
    server = await listenOnFree(app);

    const { status, body } = await request(server, '/status');
    const json = JSON.parse(body) as StatusResponse;

    expect(status).toBe(200);
    expect(json.fileCount).toBe(0);
    expect(json.lastCompileTime).toBeNull();
    expect(json.violations).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it('returns real governance data after compilation', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async (): Promise<GovernanceIR> => ir;
    const host = new CompilationHost(compileFn, '/test');

    // Run a compile so the cache is populated
    await host.compile();

    const app = express();
    app.use(statusRouter(host));
    server = await listenOnFree(app);

    const { status, body } = await request(server, '/status');
    const json = JSON.parse(body) as StatusResponse;

    expect(status).toBe(200);
    // 3 tools + 0 skills + 0 agents + 0 workflows = 3
    expect(json.fileCount).toBe(3);
    expect(json.lastCompileTime).not.toBeNull();
    // Violations: level 5 => error, level 3 => warning
    expect(json.violations.error).toBe(1);
    expect(json.violations.warning).toBe(1);
    // Warnings array has 1 entry
    expect(json.violations.info).toBe(1);
  });
});
