/**
 * L0 unit tests for Layer 3 GET /api/governance (pulse 27).
 *
 * Covers: active rule categories list and risk distribution shape.
 */
import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { governanceRouter, type GovernanceResponse } from '../../src/routes/governance.js';
import { CompilationHost } from '../../src/compilation-host.js';
import type { GovernanceIR } from '@bic/claws-sdk';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

async function listenApp(app: ReturnType<typeof express>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

describe('governance router — L0', () => {
  it('returns 409 COMPILATION_REQUIRED when no IR is cached', async () => {
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      '/test',
    );
    const app = express();
    app.use('/api/governance', governanceRouter(host));
    server = await listenApp(app);

    const res = await get(server, '/api/governance');
    expect(res.status).toBe(409);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('returns active rule categories derived from violations and warnings', async () => {
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => governanceIRWithViolations(),
      '/test',
    );
    await host.compile();

    const app = express();
    app.use('/api/governance', governanceRouter(host));
    server = await listenApp(app);

    const res = await get(server, '/api/governance');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as GovernanceResponse;
    // Fixture has violations with G-TOOL-01 and G-AUDIT-01 plus G-INPUT-02 warning.
    const categories = body.ruleCategories.map((c) => c.category);
    expect(categories).toContain('G-INPUT');
    expect(categories).toContain('G-TOOL');
    expect(categories).toContain('G-AUDIT');
    expect(body.totalRules).toBeGreaterThanOrEqual(3);
    expect(body.degradedState).toBe('error'); // fixture has haltReason set
    expect(body.activeViolations.length).toBeGreaterThan(0);
    expect(body.blockedTools).toContain('send-email');
  });

  it('reports risk distribution across declared tools', async () => {
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => governanceIRWithViolations(),
      '/test',
    );
    await host.compile();

    const app = express();
    app.use('/api/governance', governanceRouter(host));
    server = await listenApp(app);

    const res = await get(server, '/api/governance');
    const body = JSON.parse(res.body) as GovernanceResponse;
    // Fixture tools: low x1 (read_file), critical x1 (send-email), high x1 (exec-shell).
    expect(body.riskDistribution).toEqual({
      critical: 1,
      high: 1,
      medium: 0,
      low: 1,
    });
  });

  it('reports clean state with empty violations when the IR has no conflicts', async () => {
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => minimalGovernanceIR(),
      '/test',
    );
    await host.compile();

    const app = express();
    app.use('/api/governance', governanceRouter(host, { fleetPolicyAvailable: false }));
    server = await listenApp(app);

    const res = await get(server, '/api/governance');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as GovernanceResponse;
    expect(body.degradedState).toBe('clean');
    expect(body.activeViolations).toEqual([]);
    expect(body.blockedTools).toEqual([]);
    expect(body.fleetPolicy.available).toBe(false);
    expect(body.totalRules).toBe(0);
    expect(body.ruleCategories).toEqual([]);
    expect(body.compiledAt).not.toBeNull();
  });

  it('reports stale state when there are violations but no haltReason', async () => {
    // Build an IR with violations but haltReason=null so degradedState=stale.
    const staleIR = (): GovernanceIR => {
      const base = governanceIRWithViolations();
      return {
        ...base,
        conflicts: { ...base.conflicts, haltReason: null },
      };
    };
    const host = new CompilationHost(async (): Promise<GovernanceIR> => staleIR(), '/test');
    await host.compile();

    const app = express();
    app.use('/api/governance', governanceRouter(host));
    server = await listenApp(app);

    const res = await get(server, '/api/governance');
    const body = JSON.parse(res.body) as GovernanceResponse;
    expect(body.degradedState).toBe('stale');
    expect(body.activeViolations.length).toBeGreaterThan(0);
  });

  it('ignores violations whose diagnosticCode does not match the G-XXX-NN shape', async () => {
    const malformed = (): GovernanceIR => {
      const base = minimalGovernanceIR();
      return {
        ...base,
        analysis: {
          ...base.analysis,
          violations: [
            {
              ruleId: 'X',
              level: 3,
              message: 'x',
              target: 't',
              diagnosticCode: 'INVALID',
              fixSuggestions: [],
              toolFuzzyMatches: [],
            },
          ],
        },
      };
    };
    const host = new CompilationHost(async (): Promise<GovernanceIR> => malformed(), '/test');
    await host.compile();

    const app = express();
    app.use('/api/governance', governanceRouter(host));
    server = await listenApp(app);

    const res = await get(server, '/api/governance');
    const body = JSON.parse(res.body) as GovernanceResponse;
    // Malformed diagnostic codes do not contribute to ruleCategories.
    expect(body.ruleCategories).toEqual([]);
  });
});
