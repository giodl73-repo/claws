/**
 * L1 integration tests for GET /api/diff.
 *
 * Exercises the full parse + resolve + diff pipeline through the router,
 * covering the four addressing variants the pulse requires:
 *
 * 1. diff between two version numbers
 * 2. diff with a named snapshot on one side
 * 3. diff with an ISO date
 * 4. diff with `to=current` (live cached IR)
 */

import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import { AutoSnapshotManager, VersionStore } from '@bic/claws-sdk/workspace';
import { CompilationHost } from '../../src/compilation-host.js';
import { diffRouter } from '../../src/routes/diff.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

function withTool(ir: GovernanceIR, toolName: string, riskLevel: 'low' | 'medium' | 'high' | 'critical'): GovernanceIR {
  return {
    ...ir,
    capabilities: {
      ...ir.capabilities,
      tools: [
        ...ir.capabilities.tools,
        {
          name: toolName,
          description: `${toolName} description`,
          riskLevel,
          oboFlag: false,
          classification: 'custom',
        },
      ],
    },
    compiler: {
      ...ir.compiler,
      compiledAt: new Date().toISOString(),
    },
  };
}

interface Harness {
  server: Server;
  port: number;
  root: string;
  store: VersionStore;
  host: CompilationHost;
  close: () => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'diff-integration-'));
  const store = new VersionStore();
  // Seed a compile function that always returns the current cached IR —
  // the diff route never recompiles, it only reads getCachedIR() for the
  // `current` branch. Tests call host.compile() explicitly when they
  // want `current` populated.
  let currentIR: GovernanceIR = minimalGovernanceIR();
  const host = new CompilationHost(async () => currentIR, root);
  const setCurrent = (ir: GovernanceIR): void => {
    currentIR = ir;
  };

  const app = express();
  app.use(express.json());
  app.use(
    '/api',
    diffRouter(host, {
      resolver: { store, workspaceRoot: root },
    }),
  );

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('server did not bind to TCP');
  }
  // Attach setCurrent as a side channel for tests that need to swap the
  // live IR without reinvoking the factory.
  (server as unknown as { setCurrent: typeof setCurrent }).setCurrent = setCurrent;
  return {
    server,
    port: addr.port,
    root,
    store,
    host,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function request(
  port: number,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${String(port)}${path}`);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // keep raw
  }
  return { status: res.status, body };
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

describe('GET /api/diff — L1 integration', () => {
  it('1. diff between two version numbers returns structured changes', async () => {
    const h = harness!;
    const ir1 = minimalGovernanceIR();
    const ir2 = withTool(minimalGovernanceIR(), 'send-email', 'high');
    h.store.record({
      version: 1,
      compiledAt: ir1.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': 'hash-1' },
      governanceIR: ir1,
    });
    h.store.record({
      version: 2,
      compiledAt: ir2.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': 'hash-2' },
      governanceIR: ir2,
    });

    const res = await request(h.port, '/api/diff?from=v1&to=v2');
    expect(res.status).toBe(200);
    const body = res.body as {
      from: { version: number; mode: string };
      to: { version: number; mode: string };
      diff: {
        summary: { added: number; modified: number; removed: number; total: number };
        entries: readonly { path: string; type: string }[];
      };
    };
    expect(body.from.version).toBe(1);
    expect(body.from.mode).toBe('version');
    expect(body.to.version).toBe(2);
    expect(body.diff.summary).toEqual({ added: 1, modified: 0, removed: 0, total: 1 });
    expect(body.diff.entries[0]!.path).toBe('oc://TOOLS.md/tools/send-email');
    expect(body.diff.entries[0]!.type).toBe('added');
  });

  it('2. diff from a named snapshot resolves the snapshot IR', async () => {
    const h = harness!;
    const snapshotIR = minimalGovernanceIR();
    const currentIR = withTool(minimalGovernanceIR(), 'write-file', 'critical');

    // Write snapshot IR to disk where the resolver looks for it.
    const snapDir = join(h.root, '.claws', 'snapshots', 'pre-upgrade', 'files', '.claws', 'compiled');
    await mkdir(snapDir, { recursive: true });
    await writeFile(join(snapDir, 'governance-ir.json'), JSON.stringify(snapshotIR), 'utf-8');

    h.store.record({
      version: 5,
      compiledAt: currentIR.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': 'hash-5' },
      governanceIR: currentIR,
    });

    const res = await request(h.port, '/api/diff?from=snap:pre-upgrade&to=v5');
    expect(res.status).toBe(200);
    const body = res.body as {
      from: { mode: string; version: number | null };
      to: { version: number };
      diff: {
        summary: { added: number; total: number };
      };
    };
    expect(body.from.mode).toBe('snapshot');
    expect(body.from.version).toBeNull();
    expect(body.to.version).toBe(5);
    expect(body.diff.summary.added).toBe(1);
  });

  it('3. diff with an ISO date resolves to nearest-earlier version', async () => {
    const h = harness!;
    const ir1 = minimalGovernanceIR();
    const ir2 = withTool(minimalGovernanceIR(), 'net-scan', 'medium');
    h.store.record({
      version: 10,
      compiledAt: '2026-04-10T12:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-10' },
      governanceIR: ir1,
    });
    h.store.record({
      version: 11,
      compiledAt: '2026-04-15T12:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-11' },
      governanceIR: ir2,
    });

    const res = await request(h.port, '/api/diff?from=2026-04-12&to=v11');
    expect(res.status).toBe(200);
    const body = res.body as {
      from: { mode: string; version: number };
      to: { version: number };
      diff: { summary: { added: number; total: number } };
    };
    expect(body.from.mode).toBe('time');
    // Nearest ≤ 2026-04-12 is v10.
    expect(body.from.version).toBe(10);
    expect(body.to.version).toBe(11);
    expect(body.diff.summary.added).toBe(1);
  });

  it('4. diff with from=v<N>&to=current uses the live cached IR', async () => {
    const h = harness!;
    const ir1 = minimalGovernanceIR();
    const liveIR = withTool(minimalGovernanceIR(), 'delete-file', 'critical');

    h.store.record({
      version: 20,
      compiledAt: ir1.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': 'hash-20' },
      governanceIR: ir1,
    });

    // Flip the host's compile function output and warm the cache so
    // `current` resolves to liveIR.
    (h.server as unknown as { setCurrent: (ir: GovernanceIR) => void }).setCurrent(liveIR);
    await h.host.compile();

    const res = await request(h.port, '/api/diff?from=v20&to=current');
    expect(res.status).toBe(200);
    const body = res.body as {
      from: { version: number };
      to: { mode: string; version: number | null; compiledAt: string | null };
      diff: { summary: { added: number; total: number } };
    };
    expect(body.from.version).toBe(20);
    expect(body.to.mode).toBe('current');
    expect(body.to.version).toBeNull();
    expect(body.to.compiledAt).not.toBeNull();
    expect(body.diff.summary.added).toBe(1);
  });
});

describe('GET /api/diff — error surface', () => {
  it('returns 400 DIFF_PARAM_REQUIRED when ?from= is missing', async () => {
    const h = harness!;
    const res = await request(h.port, '/api/diff?to=v1');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; param: string; message: string } };
    expect(body.error.code).toBe('DIFF_PARAM_REQUIRED');
    expect(body.error.param).toBe('from');
    expect(body.error.message).toContain('?from=');
  });

  it('returns 400 DIFF_PARAM_REQUIRED when ?to= is missing', async () => {
    const h = harness!;
    const res = await request(h.port, '/api/diff?from=v1');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; param: string } };
    expect(body.error.code).toBe('DIFF_PARAM_REQUIRED');
    expect(body.error.param).toBe('to');
  });

  it('returns 400 AT_MALFORMED when ?from= is blank', async () => {
    const h = harness!;
    // Express parses `?from=&to=v1` as from='' which triggers AT_MALFORMED.
    const res = await request(h.port, '/api/diff?from=&to=v1');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; side: string; raw: string } };
    expect(body.error.code).toBe('AT_MALFORMED');
    expect(body.error.side).toBe('from');
    expect(body.error.raw).toBe('');
  });

  it('returns 400 INVALID_AT_PARAM with no raw echo when ?to= is unparseable', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: minimalGovernanceIR(),
    });
    // `snap:.` fails the allow-list and returns INVALID_AT_PARAM (no raw echo).
    const res = await request(h.port, '/api/diff?from=v1&to=snap:.');
    expect(res.status).toBe(400);
    const body = res.body as { error: { code: string; side: string; raw: string; message: string } };
    expect(body.error.code).toBe('INVALID_AT_PARAM');
    expect(body.error.side).toBe('to');
    // K1 hardening — never echo the raw probe input back.
    expect(body.error.raw).toBe('');
    expect(body.error.message).toBe('invalid snapshot or version identifier');
  });

  it('returns 404 AT_VERSION_OUT_OF_RANGE when ?from= version is unknown', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-1' },
      governanceIR: minimalGovernanceIR(),
    });
    const res = await request(h.port, '/api/diff?from=v99&to=v1');
    expect(res.status).toBe(404);
    const body = res.body as {
      error: {
        code: string;
        side: string;
        version: number;
        available: { min: number; max: number; count: number };
      };
    };
    expect(body.error.code).toBe('AT_VERSION_OUT_OF_RANGE');
    expect(body.error.side).toBe('from');
    expect(body.error.version).toBe(99);
    expect(body.error.available.count).toBe(1);
  });

  it('returns 404 AT_VERSION_EVICTED when ?from= version aged out of the store', async () => {
    // Fresh store with maxVersions=1 so recording v2 evicts v1.
    const root = await mkdtemp(join(tmpdir(), 'diff-evict-'));
    const store = new VersionStore({ maxVersions: 1 });
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use(express.json());
    app.use('/api', diffRouter(host, { resolver: { store, workspaceRoot: root } }));
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no bind');
      store.record({
        version: 1,
        compiledAt: '2026-04-10T00:00:00.000Z',
        fileHashes: { 'TOOLS.md': 'h1' },
        governanceIR: minimalGovernanceIR(),
      });
      store.record({
        version: 2,
        compiledAt: '2026-04-11T00:00:00.000Z',
        fileHashes: { 'TOOLS.md': 'h2' },
        governanceIR: minimalGovernanceIR(),
      });
      // v1 has been evicted by the size cap.
      const res = await request(addr.port, '/api/diff?from=v1&to=v2');
      expect(res.status).toBe(404);
      const body = res.body as {
        error: { code: string; reason: string; side: string; version: number };
      };
      expect(body.error.code).toBe('AT_VERSION_EVICTED');
      expect(body.error.reason).toBe('version_evicted');
      expect(body.error.side).toBe('from');
      expect(body.error.version).toBe(1);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 404 AT_TIME_OUT_OF_RANGE when ?to= date predates the store', async () => {
    const h = harness!;
    h.store.record({
      version: 50,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-50' },
      governanceIR: minimalGovernanceIR(),
    });
    const res = await request(h.port, '/api/diff?from=v50&to=2020-01-01');
    expect(res.status).toBe(404);
    const body = res.body as {
      error: {
        code: string;
        side: string;
        timestamp: string;
        available: { min: number | null; max: number | null; count: number };
      };
    };
    expect(body.error.code).toBe('AT_TIME_OUT_OF_RANGE');
    expect(body.error.side).toBe('to');
    expect(body.error.timestamp).toBe('2020-01-01T00:00:00.000Z');
    expect(body.error.available.count).toBe(1);
  });

  it('returns 404 AT_SNAPSHOT_NOT_FOUND when ?to= names a missing snapshot', async () => {
    const h = harness!;
    h.store.record({
      version: 7,
      compiledAt: '2026-04-12T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-7' },
      governanceIR: minimalGovernanceIR(),
    });
    const res = await request(h.port, '/api/diff?from=v7&to=snap:missing-snap');
    expect(res.status).toBe(404);
    const body = res.body as { error: { code: string; side: string; name: string } };
    expect(body.error.code).toBe('AT_SNAPSHOT_NOT_FOUND');
    expect(body.error.side).toBe('to');
    expect(body.error.name).toBe('missing-snap');
  });

  it('returns 409 COMPILATION_REQUIRED when ?to=current but no IR is cached', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-1' },
      governanceIR: minimalGovernanceIR(),
    });
    // Note: buildHarness does NOT call host.compile(), so getCachedIR is undefined.
    const res = await request(h.port, '/api/diff?from=v1&to=current');
    expect(res.status).toBe(409);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('returns 409 COMPILATION_REQUIRED when ?from=current but no IR is cached', async () => {
    const h = harness!;
    h.store.record({
      version: 2,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'hash-2' },
      governanceIR: minimalGovernanceIR(),
    });
    const res = await request(h.port, '/api/diff?from=current&to=v2');
    expect(res.status).toBe(409);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe('COMPILATION_REQUIRED');
  });

  it('collapses a repeated ?from= to the first value instead of erroring', async () => {
    const h = harness!;
    const ir1 = minimalGovernanceIR();
    const ir2 = withTool(minimalGovernanceIR(), 'scan', 'medium');
    h.store.record({
      version: 1,
      compiledAt: ir1.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: ir1,
    });
    h.store.record({
      version: 2,
      compiledAt: ir2.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': 'h2' },
      governanceIR: ir2,
    });
    // Repeated query params — express parses as an array. The route
    // collapses to the first value so `from=v1&from=v2` resolves like
    // `from=v1`.
    const res = await request(h.port, '/api/diff?from=v1&from=v2&to=v2');
    expect(res.status).toBe(200);
    const body = res.body as { from: { version: number }; to: { version: number } };
    expect(body.from.version).toBe(1);
    expect(body.to.version).toBe(2);
  });

  it('returns 404 AT_AUTO_SNAPSHOT_OUT_OF_RANGE when ?from=auto:<ts> has no snapshot at-or-before', async () => {
    // Drives the AUTO_SNAPSHOT_OUT_OF_RANGE arm of the diff route's
    // resolve-error responder. Constructs a resolver with an
    // AutoSnapshotManager whose only entry is newer than the target.
    const root = await mkdtemp(join(tmpdir(), 'diff-auto-oor-'));
    const store = new VersionStore();
    const autoSnapshots = new AutoSnapshotManager();
    await autoSnapshots.save({
      version: 1,
      governanceIrHash: 'hash-1',
      fileHashes: { 'TOOLS.md': 'h1' },
      trigger: 'runtime',
      timestamp: '2026-04-14T00:00:00.000Z',
    });
    store.record({
      version: 1,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: minimalGovernanceIR(),
    });
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use(express.json());
    app.use(
      '/api',
      diffRouter(host, {
        resolver: { store, workspaceRoot: root, autoSnapshots },
      }),
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no bind');
      const res = await request(
        addr.port,
        '/api/diff?from=auto:1990-01-01&to=v1',
      );
      expect(res.status).toBe(404);
      const body = res.body as {
        error: { code: string; side: string; timestamp: string; message: string };
      };
      expect(body.error.code).toBe('AT_AUTO_SNAPSHOT_OUT_OF_RANGE');
      expect(body.error.side).toBe('from');
      expect(body.error.timestamp.startsWith('1990')).toBe(true);
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 404 AT_AUTO_SNAPSHOT_IR_MISSING when ?from=auto:<ts> names an evicted version', async () => {
    // Drives the AUTO_SNAPSHOT_IR_MISSING arm: an auto-snapshot exists
    // but the VersionStore entry it references has been evicted.
    const root = await mkdtemp(join(tmpdir(), 'diff-auto-missing-'));
    const store = new VersionStore({ maxVersions: 1 });
    const autoSnapshots = new AutoSnapshotManager();
    await autoSnapshots.save({
      version: 1,
      governanceIrHash: 'hash-1',
      fileHashes: { 'TOOLS.md': 'h1' },
      trigger: 'runtime',
      timestamp: '2026-04-14T00:00:00.000Z',
    });
    store.record({
      version: 1,
      compiledAt: '2026-04-14T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h1' },
      governanceIR: minimalGovernanceIR(),
    });
    // Evict v1 by pushing v2 — the auto-snapshot still references v1.
    store.record({
      version: 2,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h2' },
      governanceIR: minimalGovernanceIR(),
    });
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use(express.json());
    app.use(
      '/api',
      diffRouter(host, {
        resolver: { store, workspaceRoot: root, autoSnapshots },
      }),
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no bind');
      const res = await request(
        addr.port,
        '/api/diff?from=auto:2026-04-14T12:00:00.000Z&to=v2',
      );
      expect(res.status).toBe(404);
      const body = res.body as {
        error: {
          code: string;
          side: string;
          version: number;
          timestamp: string;
          message: string;
        };
      };
      expect(body.error.code).toBe('AT_AUTO_SNAPSHOT_IR_MISSING');
      expect(body.error.side).toBe('from');
      expect(body.error.version).toBe(1);
      expect(typeof body.error.timestamp).toBe('string');
    } finally {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 500 DIFF_INTERNAL_ERROR with no workspace detail when diff computation throws', async () => {
    // Craft a resolver whose snapshot reader throws — this escapes the
    // promise chain and hits the .catch() 500 branch.
    const root = await mkdtemp(join(tmpdir(), 'diff-throw-'));
    const store = new VersionStore();
    const host = new CompilationHost(async () => minimalGovernanceIR(), root);
    const app = express();
    app.use(express.json());
    app.use(
      '/api',
      diffRouter(host, {
        resolver: {
          store,
          workspaceRoot: root,
          readSnapshotIR: async () => {
            throw new Error(`boom at ${root}/secret/path`);
          },
        },
      }),
    );
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    // Silence the expected server-side console.error for the duration
    // of this test. The route writes the raw error to stderr; the
    // response MUST NOT carry workspace paths.
    const originalError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.error = () => {};
    try {
      const addr = server.address();
      if (addr === null || typeof addr === 'string') throw new Error('no bind');
      store.record({
        version: 1,
        compiledAt: '2026-04-10T00:00:00.000Z',
        fileHashes: { 'TOOLS.md': 'h1' },
        governanceIR: minimalGovernanceIR(),
      });
      const res = await request(addr.port, '/api/diff?from=snap:anything&to=v1');
      expect(res.status).toBe(500);
      const body = res.body as { error: { code: string; message: string } };
      expect(body.error.code).toBe('DIFF_INTERNAL_ERROR');
      // No workspace path, no Error.message leak.
      expect(body.error.message).toBe('Internal error while computing diff');
      expect(JSON.stringify(body)).not.toContain('secret');
      expect(JSON.stringify(body)).not.toContain(root);
    } finally {
      console.error = originalError;
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    }
  });
});
