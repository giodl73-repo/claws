import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { diagnosticsRouter } from '../../src/routes/diagnostics.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

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

describe('GET /diagnostics', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns violations with file:line, severity, and rule ID', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(diagnosticsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/diagnostics');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json).toHaveProperty('violations');
    expect(json).toHaveProperty('count');
    expect(json['count']).toBe(2);

    const violations = json['violations'] as Array<Record<string, unknown>>;
    expect(violations).toHaveLength(2);

    // First violation: GOV-001 at policy.yaml:12
    expect(violations[0]!['ruleId']).toBe('GOV-001');
    expect(violations[0]!['level']).toBe(5);
    expect(violations[0]!['target']).toBe('policy.yaml:12');
    expect(violations[0]!['diagnosticCode']).toBe('G-TOOL-01');
    expect(violations[0]!['message']).toBe('R5 tool send-email missing approval gate');

    // Second violation: GOV-002 at rules/exec.crest:5
    expect(violations[1]!['ruleId']).toBe('GOV-002');
    expect(violations[1]!['level']).toBe(3);
    expect(violations[1]!['target']).toBe('rules/exec.crest:5');
    expect(violations[1]!['diagnosticCode']).toBe('G-AUDIT-01');
  });

  it('returns empty violations when IR has none', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(diagnosticsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/diagnostics');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['count']).toBe(0);
    expect(json['violations']).toEqual([]);
  });

  it('returns 404 when no IR is cached', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');

    const app = express();
    app.use(diagnosticsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/diagnostics');

    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('No compiled IR available. POST /compile first.');
  });
});
