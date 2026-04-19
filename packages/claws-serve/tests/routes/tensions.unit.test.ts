import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { GovernanceIR } from '@bic/claws-sdk';
import { tensionsRouter } from '../../src/routes/tensions.js';
import { CompilationHost } from '../../src/compilation-host.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
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

describe('GET /tensions', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('returns tension list with cluster mapping', async () => {
    const ir = governanceIRWithViolations();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(tensionsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/tensions');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json).toHaveProperty('tensions');
    expect(json).toHaveProperty('count');
    expect(json['count']).toBe(2);

    const tensions = json['tensions'] as Array<Record<string, unknown>>;
    expect(tensions).toHaveLength(2);

    // First: OBO conflict → cluster A
    expect(tensions[0]!['cluster']).toBe('A');
    expect(tensions[0]!['severity']).toBe('error');
    expect(tensions[0]!['involvedFiles']).toEqual(['GRANT-001', 'DENY-001']);
    expect(tensions[0]!['description']).toBe('OBO grant/deny conflict on send-email');
    expect(tensions[0]!['resolution']).toContain('elicit gate');

    // Second: multi-constraint → cluster B
    expect(tensions[1]!['cluster']).toBe('B');
    expect(tensions[1]!['severity']).toBe('warning');
    expect(tensions[1]!['involvedFiles']).toEqual(['RULE-A', 'RULE-B', 'RULE-C']);
    expect(tensions[1]!['description']).toBe('Three rules conflict on exec-shell permissions');
    expect(tensions[1]!['resolution']).toContain('3 rules');
  });

  it('returns reconcile guidance when oboWithoutElicit is false', async () => {
    const ir = governanceIRWithViolations();
    // Override the OBO conflict to have oboWithoutElicit = false
    const modified: GovernanceIR = {
      ...ir,
      conflicts: {
        ...ir.conflicts,
        oboConflicts: [
          {
            ...ir.conflicts.oboConflicts[0]!,
            oboWithoutElicit: false,
          },
        ],
      },
    };
    const compileFn = async () => modified;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(tensionsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/tensions');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    const tensions = json['tensions'] as Array<Record<string, unknown>>;
    expect(tensions[0]!['resolution']).toContain('Reconcile grant rule');
    expect(tensions[0]!['resolution']).not.toContain('elicit gate');
  });

  it('returns empty tensions when IR has no conflicts', async () => {
    const ir = minimalGovernanceIR();
    const compileFn = async () => ir;
    const host = new CompilationHost(compileFn, '/test');
    await host.compile();

    const app = express();
    app.use(tensionsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/tensions');

    expect(status).toBe(200);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['count']).toBe(0);
    expect(json['tensions']).toEqual([]);
  });

  it('returns 404 when no IR is cached', async () => {
    const compileFn = async () => minimalGovernanceIR();
    const host = new CompilationHost(compileFn, '/test');

    const app = express();
    app.use(tensionsRouter(host));
    server = await listen(app);

    const { status, body } = await request(server, '/tensions');

    expect(status).toBe(404);
    const json = JSON.parse(body) as Record<string, unknown>;
    expect(json['error']).toBe('No compiled IR available. POST /compile first.');
  });
});
