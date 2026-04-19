import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import {
  statusRouter,
  apiStatusRouter,
  type StatusResponse,
  type ApiStatusResponse,
} from '../../src/routes/status.js';
import { CompilationHost } from '../../src/compilation-host.js';
import type { GovernanceIR } from '@bic/claws-sdk';
import { governanceIRWithViolations } from '../fixtures/governance-ir-with-violations.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
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

describe('apiStatusRouter — GET /api/status (Layer 3)', () => {
  let apiServer: Server;

  afterEach(() => {
    apiServer?.close();
  });

  it('returns compilationStatus + lastCompiled + violationState reflecting cached IR', async () => {
    const ir = governanceIRWithViolations();
    const host = new CompilationHost(async (): Promise<GovernanceIR> => ir, '/test');
    await host.compile();

    const app = express();
    app.use('/api/status', apiStatusRouter(host, { startedAt: Date.now() }));
    apiServer = await listenOnFree(app);

    const { status, body } = await request(apiServer, '/api/status');
    const json = JSON.parse(body) as ApiStatusResponse;
    expect(status).toBe(200);
    // Fixture has haltReason set -> error state.
    expect(json.compilationStatus).toBe('error');
    expect(json.lastCompiled).not.toBeNull();
    expect(json.fileCount).toBe(3);
    expect(json.errorCount).toBe(1); // level 5
    expect(json.warningCount).toBe(1); // level 3
    expect(json.violationState.kind).toBe('error');
    expect(json.violationState.blockedTools).toContain('send-email');
    expect(typeof json.version).toBe('string');
    expect(json.uptime).toBeGreaterThanOrEqual(0);
  });

  it('returns stale status when violations exist but haltReason is null', async () => {
    const base = governanceIRWithViolations();
    const staleIR: GovernanceIR = {
      ...base,
      conflicts: { ...base.conflicts, haltReason: null },
    };
    const host = new CompilationHost(async (): Promise<GovernanceIR> => staleIR, '/test');
    await host.compile();

    const app = express();
    app.use('/api/status', apiStatusRouter(host, { startedAt: Date.now() }));
    apiServer = await listenOnFree(app);

    const { status, body } = await request(apiServer, '/api/status');
    const json = JSON.parse(body) as ApiStatusResponse;
    expect(status).toBe(200);
    expect(json.compilationStatus).toBe('stale');
    expect(json.violationState.kind).toBe('stale');
  });

  it('returns ok status when violations are empty and no haltReason', async () => {
    // minimalGovernanceIR already has no violations + haltReason null.
    const minIR = (): GovernanceIR => ({
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
        compiledAt: '2026-04-15T00:00:00.000Z',
        schemaVersion: 1,
      },
    });
    const host = new CompilationHost(async (): Promise<GovernanceIR> => minIR(), '/test');
    await host.compile();

    const app = express();
    app.use('/api/status', apiStatusRouter(host, { startedAt: Date.now() - 5000 }));
    apiServer = await listenOnFree(app);

    const { status, body } = await request(apiServer, '/api/status');
    const json = JSON.parse(body) as ApiStatusResponse;
    expect(status).toBe(200);
    expect(json.compilationStatus).toBe('ok');
    expect(json.violationState.kind).toBe('clean');
    expect(json.uptime).toBeGreaterThanOrEqual(5);
  });

  it('defaults startedAt to Date.now() when not provided', async () => {
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => governanceIRWithViolations(),
      '/test',
    );
    const app = express();
    app.use('/api/status', apiStatusRouter(host));
    apiServer = await listenOnFree(app);

    const { status, body } = await request(apiServer, '/api/status');
    const json = JSON.parse(body) as ApiStatusResponse;
    expect(status).toBe(200);
    expect(typeof json.uptime).toBe('number');
  });

  it('returns uncompiled + empty violationState when no IR is cached', async () => {
    const host = new CompilationHost(
      async (): Promise<GovernanceIR> => governanceIRWithViolations(),
      '/test',
    );
    const app = express();
    app.use('/api/status', apiStatusRouter(host, { startedAt: Date.now() }));
    apiServer = await listenOnFree(app);

    const { status, body } = await request(apiServer, '/api/status');
    const json = JSON.parse(body) as ApiStatusResponse;
    expect(status).toBe(200);
    expect(json.compilationStatus).toBe('uncompiled');
    expect(json.lastCompiled).toBeNull();
    expect(json.fileCount).toBe(0);
    expect(json.errorCount).toBe(0);
    expect(json.warningCount).toBe(0);
    expect(json.violationState).toEqual({ kind: 'clean', blockedTools: [] });
  });
});
