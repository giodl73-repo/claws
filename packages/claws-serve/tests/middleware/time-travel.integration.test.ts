/**
 * L1 integration tests for the time-travel middleware.
 *
 * Covers the four middleware-level behaviours the pulse specifies:
 * 1. GET ?at=v<n> returns the cached IR with the resolved version header.
 * 2. GET ?at=<ISO date> resolves to the nearest earlier snapshot.
 * 3. GET ?at=snap:<name> reads from `.claws/snapshots/{name}/...`.
 * 4. ?at= without a value surfaces a 400 AT_MALFORMED.
 */

import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import { AutoSnapshotManager, VersionStore } from '@bic/claws-sdk/workspace';
import {
  getTimeTravelState,
  GOVERNANCE_VERSION_HEADER,
  timeTravelMiddleware,
} from '../../src/middleware/time-travel.js';

function buildIR(tag: string): GovernanceIR {
  return {
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
      compilerVersion: `0.0.0-${tag}`,
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

interface Harness {
  server: Server;
  port: number;
  root: string;
  store: VersionStore;
  close: () => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'time-travel-int-'));
  const store = new VersionStore();
  const app = express();
  app.get(
    '/api/oc/:file',
    timeTravelMiddleware({ resolver: { store, workspaceRoot: root } }),
    (_req, res) => {
      // Live fall-through — reached only when ?at= is absent.
      res.status(200).json({ live: true });
    },
  );
  app.patch(
    '/api/oc/:file',
    timeTravelMiddleware({ resolver: { store, workspaceRoot: root } }),
    (_req, res) => {
      res.status(200).json({ patched: true });
    },
  );

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('server did not bind to TCP');
  }
  return {
    server,
    port: address.port,
    root,
    store,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

let harness: Harness | undefined;

beforeEach(async () => {
  harness = await buildHarness();
});

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

async function get(
  port: number,
  path: string,
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${String(port)}${path}`);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // leave as string
  }
  return { status: res.status, headers: res.headers, body };
}

describe('timeTravelMiddleware — L1 integration', () => {
  it('1. GET ?at=v<n> returns the cached IR and the X-Governance-Version header', async () => {
    const h = harness!;
    h.store.record({
      version: 7,
      compiledAt: '2026-04-14T10:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-7' },
      governanceIR: buildIR('v7'),
    });

    const res = await get(h.port, '/api/oc/TOOLS.md?at=v7');
    expect(res.status).toBe(200);
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('7');
    const body = res.body as {
      at: { mode: string; version: number; raw: string };
      governanceIR: GovernanceIR;
    };
    expect(body.at.mode).toBe('version');
    expect(body.at.version).toBe(7);
    expect(body.governanceIR.compiler.compilerVersion).toBe('0.0.0-v7');
  });

  it('2. GET ?at=<ISO date> resolves to the nearest earlier snapshot', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: buildIR('v1'),
    });
    h.store.record({
      version: 2,
      compiledAt: '2026-04-12T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h2' },
      governanceIR: buildIR('v2'),
    });
    h.store.record({
      version: 3,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h3' },
      governanceIR: buildIR('v3'),
    });

    const res = await get(h.port, '/api/oc/TOOLS.md?at=2026-04-14');
    expect(res.status).toBe(200);
    // 2026-04-14 falls between v2 and v3 — resolver picks v2 (earlier ≤).
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('2');
    const body = res.body as {
      at: { mode: string; version: number };
      governanceIR: GovernanceIR;
    };
    expect(body.at.mode).toBe('time');
    expect(body.at.version).toBe(2);
    expect(body.governanceIR.compiler.compilerVersion).toBe('0.0.0-v2');
  });

  it('3. GET ?at=snap:<name> reads from .claws/snapshots/<name>/files/...', async () => {
    const h = harness!;
    const snapshotIR = buildIR('pre-upgrade');
    const snapDir = join(
      h.root,
      '.claws',
      'snapshots',
      'pre-upgrade',
      'files',
      '.claws',
      'compiled',
    );
    await mkdir(snapDir, { recursive: true });
    await writeFile(join(snapDir, 'governance-ir.json'), JSON.stringify(snapshotIR), 'utf-8');

    const res = await get(h.port, '/api/oc/TOOLS.md?at=snap:pre-upgrade');
    expect(res.status).toBe(200);
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('snap:pre-upgrade');
    const body = res.body as {
      at: { mode: string; version: number | null };
      governanceIR: GovernanceIR;
    };
    expect(body.at.mode).toBe('snapshot');
    expect(body.at.version).toBeNull();
    expect(body.governanceIR.compiler.compilerVersion).toBe('0.0.0-pre-upgrade');
  });

  it('4. GET ?at (no value) returns 400 AT_MALFORMED', async () => {
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('AT_MALFORMED');
    expect(typeof body.error.message).toBe('string');
  });

  it('5. (K1) GET ?at=snap:. returns 400 INVALID_AT_PARAM with no raw echo', async () => {
    // W-4 escalation: the old substring guard accepted `snap:.` (single
    // dot, no `..`). The K1 allow-list rejects it. The response body
    // must not echo the raw value — an attacker should not be able to
    // use the response to confirm which control char reached the parser.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=snap:.');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; message: string; raw: string } };
    expect(body.error.code).toBe('INVALID_AT_PARAM');
    expect(body.error.message).toBe('invalid snapshot or version identifier');
    expect(body.error.raw).toBe('');
  });

  it('5. (K1) GET ?at=snap:foo%00bar (null byte) returns 400 INVALID_AT_PARAM', async () => {
    // Null byte smuggling attempt via URL-encoded %00. The allow-list
    // regex rejects any non-printable-ASCII input before mode dispatch,
    // so the resolver never sees the null byte.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=snap:foo%00bar');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; raw: string } };
    expect(body.error.code).toBe('INVALID_AT_PARAM');
    expect(body.error.raw).toBe('');
  });

  it('5. (K1) GET ?at=v99999999999 (11 digits) returns 400 INVALID_AT_PARAM', async () => {
    // parseAt caps version digits at 10 to block overflow probes; the
    // middleware surfaces the denial as INVALID_AT_PARAM (no echo).
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=v99999999999');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; raw: string } };
    expect(body.error.code).toBe('INVALID_AT_PARAM');
    expect(body.error.raw).toBe('');
  });

  it('PATCH ?at=v1 returns 400 AT_WRITE_NOT_ALLOWED', async () => {
    // ?at= is read-only by contract (S30). Mutating verbs must be
    // rejected before the resolver runs so a misconfigured client never
    // sees historical IR confused with a successful write.
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: buildIR('v1'),
    });
    const res = await fetch(
      `http://127.0.0.1:${String(h.port)}/api/oc/TOOLS.md?at=v1`,
      { method: 'PATCH' },
    );
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('AT_WRITE_NOT_ALLOWED');
    expect(body.error.message).toContain('PATCH');
  });

  it('GET ?at=v1&at=v2 (repeated) returns 400 AT_MALFORMED', async () => {
    // Express parses repeated ?at= params as an array; the middleware
    // rejects before the resolver sees a non-scalar.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=v1&at=v2');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; message: string; raw: string } };
    expect(body.error.code).toBe('AT_MALFORMED');
    expect(body.error.message).toContain('only one');
    // raw echoes the first value (already passed the parser-level
    // allow-list check would be unsafe to echo, but structural rejection
    // before dispatch is safe — AT_MALFORMED is the "couldn't form a
    // query" error class).
    expect(body.error.raw).toBe('v1');
  });

  it('GET ?at=v99 (out-of-range) returns 404 AT_VERSION_OUT_OF_RANGE with available window', async () => {
    const h = harness!;
    h.store.record({
      version: 5,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h5' },
      governanceIR: buildIR('v5'),
    });
    const res = await get(h.port, '/api/oc/TOOLS.md?at=v99');
    expect(res.status).toBe(404);
    const body = res.body as {
      error: {
        code: string;
        version: number;
        available: { min: number | null; max: number | null; count: number };
        message: string;
      };
    };
    expect(body.error.code).toBe('AT_VERSION_OUT_OF_RANGE');
    expect(body.error.version).toBe(99);
    expect(body.error.available.max).toBe(5);
    expect(typeof body.error.message).toBe('string');
  });

  it('GET ?at=v1 (evicted) returns 404 AT_VERSION_EVICTED', async () => {
    // Force eviction: use a maxVersions=1 store, record v1 then v2 so v1
    // is evicted but still remembered as "previously seen".
    const tinyStore = new VersionStore({ maxVersions: 1 });
    tinyStore.record({
      version: 1,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: buildIR('v1'),
    });
    tinyStore.record({
      version: 2,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h2' },
      governanceIR: buildIR('v2'),
    });
    const app = express();
    const h = harness!;
    app.get(
      '/api/oc/:file',
      timeTravelMiddleware({ resolver: { store: tinyStore, workspaceRoot: h.root } }),
      (_req, res) => res.status(200).json({ live: true }),
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no port');
      const res = await get(addr.port, '/api/oc/TOOLS.md?at=v1');
      expect(res.status).toBe(404);
      const body = res.body as {
        error: { code: string; reason: string; version: number; message: string };
      };
      expect(body.error.code).toBe('AT_VERSION_EVICTED');
      expect(body.error.reason).toBe('version_evicted');
      expect(body.error.version).toBe(1);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  it('GET ?at=1990-01-01 (time before first snapshot) returns 404 AT_TIME_OUT_OF_RANGE', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: buildIR('v1'),
    });
    const res = await get(h.port, '/api/oc/TOOLS.md?at=1990-01-01');
    expect(res.status).toBe(404);
    const body = res.body as {
      error: { code: string; timestamp: string; available: unknown; message: string };
    };
    expect(body.error.code).toBe('AT_TIME_OUT_OF_RANGE');
    expect(typeof body.error.timestamp).toBe('string');
    expect(body.error.timestamp.startsWith('1990')).toBe(true);
    expect(typeof body.error.message).toBe('string');
  });

  it('GET ?at=snap:missing returns 404 AT_SNAPSHOT_NOT_FOUND', async () => {
    // No snapshot dir exists at `.claws/snapshots/missing/...` so the
    // default snapshot reader returns null → SNAPSHOT_NOT_FOUND.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=snap:missing');
    expect(res.status).toBe(404);
    const body = res.body as { error: { code: string; name: string; message: string } };
    expect(body.error.code).toBe('AT_SNAPSHOT_NOT_FOUND');
    expect(body.error.name).toBe('missing');
    expect(typeof body.error.message).toBe('string');
  });

  it('respondDirectly:false stamps req.timeTravel and delegates body to the next handler', async () => {
    // Partners that want to re-render the IR into a smaller payload opt
    // out of auto-respond by passing respondDirectly:false. The middleware
    // then only stamps state + header and calls next().
    const store = new VersionStore();
    store.record({
      version: 4,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h4' },
      governanceIR: buildIR('v4'),
    });
    const root = await mkdtemp(join(tmpdir(), 'time-travel-delegate-'));
    const app = express();
    app.get(
      '/api/oc/:file',
      timeTravelMiddleware({
        resolver: { store, workspaceRoot: root },
        respondDirectly: false,
      }),
      (req, res) => {
        const state = getTimeTravelState(req);
        res.status(200).json({
          delegated: true,
          resolvedVersion: state?.version ?? null,
          mode: state?.mode ?? 'none',
        });
      },
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no port');
      const res = await get(addr.port, '/api/oc/TOOLS.md?at=v4');
      expect(res.status).toBe(200);
      expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('4');
      const body = res.body as { delegated: boolean; resolvedVersion: number; mode: string };
      expect(body.delegated).toBe(true);
      expect(body.resolvedVersion).toBe(4);
      expect(body.mode).toBe('version');
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('routes resolver rejection through Express next(err) for the error handler', async () => {
    // The snapshot branch reads from disk. Inject a reader that throws so
    // the promise returned by resolveAt rejects — this must land in the
    // middleware's .then(rejection) arm and propagate to next(err).
    const store = new VersionStore();
    const root = await mkdtemp(join(tmpdir(), 'time-travel-reject-'));
    const boom = new Error('injected reader failure');
    const app = express();
    let caught: unknown = undefined;
    app.get(
      '/api/oc/:file',
      timeTravelMiddleware({
        resolver: {
          store,
          workspaceRoot: root,
          readSnapshotIR: () => {
            throw boom;
          },
        },
      }),
      (_req, res) => {
        res.status(200).json({ unreachable: true });
      },
    );
    app.use(
      (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        caught = err;
        res.status(500).json({ error: { code: 'INTERNAL', message: String(err) } });
      },
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no port');
      const res = await get(addr.port, '/api/oc/TOOLS.md?at=snap:anything');
      expect(res.status).toBe(500);
      expect(caught).toBe(boom);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('passes through when ?at= is absent', async () => {
    // Coverage for the early-return happy path — live fall-through.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md');
    expect(res.status).toBe(200);
    const body = res.body as { live: boolean };
    expect(body.live).toBe(true);
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBeNull();
  });

  it('getTimeTravelState returns undefined when middleware did not run', () => {
    // Direct API test: a request that never went through the middleware
    // should yield undefined (no timeTravel stamp).
    const fakeReq = { query: {} } as unknown as express.Request;
    expect(getTimeTravelState(fakeReq)).toBeUndefined();
  });

  it('GET ?at[nested]=v1 (non-string parsed object) returns 400 AT_MALFORMED', async () => {
    // Express/qs parses bracketed keys into nested objects. After the
    // Array.isArray guard, a non-string `raw` falls into the defensive
    // typeof branch and surfaces AT_MALFORMED before the resolver runs.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at[nested]=v1');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('AT_MALFORMED');
    expect(body.error.message).toContain('must be a string');
  });

  it('GET ?at=auto:<ts> returns 404 AT_AUTO_SNAPSHOT_NOT_CONFIGURED when resolver has no manager', async () => {
    // The default harness builds a resolver without `autoSnapshots`, so
    // any `?at=auto:...` request surfaces AUTO_SNAPSHOT_NOT_CONFIGURED.
    // Drives that arm of respondResolveError.
    const h = harness!;
    const res = await get(h.port, '/api/oc/TOOLS.md?at=auto:2026-04-14T00:00:00.000Z');
    expect(res.status).toBe(404);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('AT_AUTO_SNAPSHOT_NOT_CONFIGURED');
    expect(typeof body.error.message).toBe('string');
  });

  it('GET ?at=auto:<ts before first snapshot> returns 404 AT_AUTO_SNAPSHOT_OUT_OF_RANGE', async () => {
    // auto-mode: resolver has an AutoSnapshotManager but no snapshot
    // at-or-before the requested timestamp. Drives the
    // AUTO_SNAPSHOT_OUT_OF_RANGE arm of respondResolveError.
    const store = new VersionStore();
    store.record({
      version: 1,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: buildIR('v1'),
    });
    const autoSnapshots = new AutoSnapshotManager();
    await autoSnapshots.save({
      version: 1,
      governanceIrHash: 'hash-1',
      fileHashes: { 'TOOLS.md': 'h1' },
      trigger: 'runtime',
      timestamp: '2026-04-14T00:00:00.000Z',
    });
    const root = await mkdtemp(join(tmpdir(), 'time-travel-auto-oor-'));
    const app = express();
    app.get(
      '/api/oc/:file',
      timeTravelMiddleware({ resolver: { store, workspaceRoot: root, autoSnapshots } }),
      (_req, res) => res.status(200).json({ live: true }),
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no port');
      const res = await get(addr.port, '/api/oc/TOOLS.md?at=auto:1990-01-01');
      expect(res.status).toBe(404);
      const body = res.body as {
        error: { code: string; timestamp: string; message: string };
      };
      expect(body.error.code).toBe('AT_AUTO_SNAPSHOT_OUT_OF_RANGE');
      expect(body.error.timestamp.startsWith('1990')).toBe(true);
      expect(typeof body.error.message).toBe('string');
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('GET ?at=auto:<ts> returns 404 AT_AUTO_SNAPSHOT_IR_MISSING when store evicted the referenced version', async () => {
    // auto-mode found a snapshot but its VersionStore entry aged out.
    // Drives the AUTO_SNAPSHOT_IR_MISSING arm of respondResolveError.
    const store = new VersionStore({ maxVersions: 1 });
    store.record({
      version: 1,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: buildIR('v1'),
    });
    const autoSnapshots = new AutoSnapshotManager();
    await autoSnapshots.save({
      version: 1,
      governanceIrHash: 'hash-1',
      fileHashes: { 'TOOLS.md': 'h1' },
      trigger: 'runtime',
      timestamp: '2026-04-14T00:00:00.000Z',
    });
    // Evict v1 by recording v2 — the auto-snapshot still names v1.
    store.record({
      version: 2,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h2' },
      governanceIR: buildIR('v2'),
    });
    const root = await mkdtemp(join(tmpdir(), 'time-travel-auto-missing-'));
    const app = express();
    app.get(
      '/api/oc/:file',
      timeTravelMiddleware({ resolver: { store, workspaceRoot: root, autoSnapshots } }),
      (_req, res) => res.status(200).json({ live: true }),
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no port');
      const res = await get(addr.port, '/api/oc/TOOLS.md?at=auto:2026-04-14T12:00:00.000Z');
      expect(res.status).toBe(404);
      const body = res.body as {
        error: { code: string; version: number; timestamp: string; message: string };
      };
      expect(body.error.code).toBe('AT_AUTO_SNAPSHOT_IR_MISSING');
      expect(body.error.version).toBe(1);
      expect(typeof body.error.timestamp).toBe('string');
      expect(typeof body.error.message).toBe('string');
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });
});
