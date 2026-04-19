/**
 * L0 unit tests for the shared IR-resolution helper.
 *
 * Covers:
 * - `resolveIR` discriminator returns each of `missing | ok | stale | errored`
 *   under the expected CompilationHost states.
 * - `respondCompilationRequired` / `respondIrErrored` emit the canonical
 *   409 / 503 JSON bodies with the shared error codes.
 *
 * Routes that depend on this helper (chunk routes, governance, etc.)
 * carry their own integration tests — this file locks the contract.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { GovernanceIR } from '@bic/claws-sdk';
import type { ResolvedAt } from '@bic/claws-sdk/workspace';
import { CompilationHost } from '../../src/compilation-host.js';
import {
  COMPILATION_ERRORED_CODE,
  COMPILATION_REQUIRED_CODE,
  TIME_TRAVEL_CACHE_CONTROL,
  applyTimeTravelCache,
  resolveIR,
  resolveReadIR,
  respondCompilationRequired,
  respondIrErrored,
} from '../../src/routes/ir-resolution.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';
import express, { type Request } from 'express';

async function listenApp(app: express.Express): Promise<Server> {
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

describe('resolveIR — CompilationHost discriminator', () => {
  it('returns { status: "missing" } when nothing has been compiled', () => {
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/nope');
    const r = resolveIR(host);
    expect(r.status).toBe('missing');
  });

  it('returns { status: "ok", ir } when the cached IR is clean', async () => {
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/ok');
    await host.compile();
    const r = resolveIR(host);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') throw new Error('narrow');
    expect(r.ir.capabilities.tools.length).toBeGreaterThan(0);
  });

  it('returns { status: "stale", ir } when the cached IR carries violations', async () => {
    const host = new CompilationHost(async (): Promise<GovernanceIR> => {
      const ir = minimalGovernanceIR();
      return {
        ...ir,
        analysis: {
          ...ir.analysis,
          violations: [
            {
              ruleId: 'G-CLASS-01',
              diagnosticCode: 'G-CLASS-01',
              level: 4,
              target: 'read_file',
              message: 'demo violation',
            },
          ],
        },
      };
    }, '/stale');
    await host.compile();
    const r = resolveIR(host);
    expect(r.status).toBe('stale');
  });

  it('returns { status: "errored", haltReason } when conflicts.haltReason is set', async () => {
    const host = new CompilationHost(async (): Promise<GovernanceIR> => {
      const ir = minimalGovernanceIR();
      return {
        ...ir,
        conflicts: { ...ir.conflicts, haltReason: 'duplicate SOUL declaration' },
      };
    }, '/errored');
    await host.compile();
    const r = resolveIR(host);
    expect(r.status).toBe('errored');
    if (r.status !== 'errored') throw new Error('narrow');
    expect(r.haltReason).toBe('duplicate SOUL declaration');
  });
});

describe('respondCompilationRequired — canonical 409 body', () => {
  it(`returns 409 with code ${COMPILATION_REQUIRED_CODE} and a message that points at /compile`, async () => {
    const app = express();
    app.get('/t', (_req, res) => { respondCompilationRequired(res); });
    server = await listenApp(app);
    const { status, body } = await get(server, '/t');
    expect(status).toBe(409);
    const err = JSON.parse(body) as { error: { code: string; message: string } };
    expect(err.error.code).toBe(COMPILATION_REQUIRED_CODE);
    expect(err.error.message).toMatch(/compile/i);
  });
});

describe('respondIrErrored — canonical 503 body', () => {
  it(`returns 503 with code ${COMPILATION_ERRORED_CODE} and the halt reason in details`, async () => {
    const app = express();
    app.get('/t', (_req, res) => { respondIrErrored(res, 'kaboom'); });
    server = await listenApp(app);
    const { status, body } = await get(server, '/t');
    expect(status).toBe(503);
    const err = JSON.parse(body) as { error: { code: string; message: string; details?: { haltReason?: string } } };
    expect(err.error.code).toBe(COMPILATION_ERRORED_CODE);
    expect(err.error.details?.haltReason).toBe('kaboom');
  });
});

/**
 * `resolveReadIR` layers the time-travel contract on top of `resolveIR`.
 * When the time-travel middleware stamped `req.timeTravel`, the read
 * resolver must return the *historical* IR with `historical: true` —
 * never fall back to the live host. When the stamp is absent it must
 * degenerate to `resolveIR(host)` so unmigrated callers keep working.
 */
describe('resolveReadIR — time-travel-aware read resolver', () => {
  function stampedReq(timeTravel: ResolvedAt): Request {
    return { timeTravel } as unknown as Request;
  }
  function bareReq(): Request {
    return {} as unknown as Request;
  }
  function liveHost(ir?: GovernanceIR): CompilationHost {
    const host = new CompilationHost(async () => ir ?? minimalGovernanceIR(), '/x');
    return host;
  }

  it('returns { status: "ok", historical: true, ir } when req.timeTravel is stamped', () => {
    const historicalIR: GovernanceIR = {
      ...minimalGovernanceIR(),
      compiler: {
        compilerVersion: 'historical-tag',
        compiledAt: '2020-01-01T00:00:00.000Z',
        schemaVersion: 1,
      },
    };
    const req = stampedReq({
      mode: 'version',
      governanceIR: historicalIR,
      version: 42,
      compiledAt: '2020-01-01T00:00:00.000Z',
      raw: 'v42',
    });
    // Host has no cached IR at all — resolver must prefer the stamp,
    // not fall through to resolveIR(host) and report `missing`.
    const host = liveHost();
    const r = resolveReadIR(req, host);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') throw new Error('narrow');
    expect(r.historical).toBe(true);
    expect(r.ir.compiler.compilerVersion).toBe('historical-tag');
  });

  it('degenerates to { status: "missing", historical: false } when no stamp and no cached IR', () => {
    const host = liveHost();
    const r = resolveReadIR(bareReq(), host);
    expect(r.status).toBe('missing');
    if (r.status !== 'missing') throw new Error('narrow');
    expect(r.historical).toBe(false);
  });

  it('degenerates to { status: "ok", historical: false, ir } when no stamp and host is clean', async () => {
    const host = liveHost();
    await host.compile();
    const r = resolveReadIR(bareReq(), host);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') throw new Error('narrow');
    expect(r.historical).toBe(false);
    expect(r.ir.capabilities.tools.length).toBeGreaterThan(0);
  });

  it('degenerates to { status: "stale", historical: false } when no stamp and host has violations', async () => {
    const host = new CompilationHost(async (): Promise<GovernanceIR> => {
      const ir = minimalGovernanceIR();
      return {
        ...ir,
        analysis: {
          ...ir.analysis,
          violations: [
            {
              ruleId: 'G-CLASS-01',
              diagnosticCode: 'G-CLASS-01',
              level: 4,
              target: 'read_file',
              message: 'demo',
            },
          ],
        },
      };
    }, '/stale');
    await host.compile();
    const r = resolveReadIR(bareReq(), host);
    expect(r.status).toBe('stale');
    if (r.status !== 'stale') throw new Error('narrow');
    expect(r.historical).toBe(false);
  });

  it('degenerates to { status: "errored", historical: false, haltReason } when no stamp and host halted', async () => {
    const host = new CompilationHost(async (): Promise<GovernanceIR> => {
      const ir = minimalGovernanceIR();
      return {
        ...ir,
        conflicts: { ...ir.conflicts, haltReason: 'kaboom' },
      };
    }, '/err');
    await host.compile();
    const r = resolveReadIR(bareReq(), host);
    expect(r.status).toBe('errored');
    if (r.status !== 'errored') throw new Error('narrow');
    expect(r.historical).toBe(false);
    expect(r.haltReason).toBe('kaboom');
  });

  it('prefers the stamp even when the host has a cached IR (the whole point of `?at=`)', async () => {
    const host = liveHost();
    await host.compile(); // host now has the live IR cached
    const historicalIR: GovernanceIR = {
      ...minimalGovernanceIR(),
      compiler: {
        compilerVersion: 'v1-pin',
        compiledAt: '2021-01-01T00:00:00.000Z',
        schemaVersion: 1,
      },
    };
    const req = stampedReq({
      mode: 'version',
      governanceIR: historicalIR,
      version: 1,
      compiledAt: '2021-01-01T00:00:00.000Z',
      raw: 'v1',
    });
    const r = resolveReadIR(req, host);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') throw new Error('narrow');
    expect(r.historical).toBe(true);
    expect(r.ir.compiler.compilerVersion).toBe('v1-pin');
  });
});

describe('applyTimeTravelCache — immutable cache header helper', () => {
  it(`stamps Cache-Control: ${TIME_TRAVEL_CACHE_CONTROL} on the response`, async () => {
    const app = express();
    app.get('/t', (_req, res) => {
      applyTimeTravelCache(res);
      res.status(200).json({ ok: true });
    });
    server = await listenApp(app);
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const res = await fetch(`http://127.0.0.1:${String(addr.port)}/t`);
    expect(res.headers.get('cache-control')).toBe(TIME_TRAVEL_CACHE_CONTROL);
  });
});
