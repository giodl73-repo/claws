/**
 * L1 integration tests for the CP-6 R2 Cluster I fix — wiring
 * `req.timeTravel` consumption into GET chunk/governance/IR reads.
 *
 * Before this fix, `timeTravelMiddleware` stamped `req.timeTravel` with a
 * resolved `ResolvedAt` but no read handler looked at it: partners who
 * sent `GET /api/chunks/connections?at=v1` got the live (v2) chunk back.
 *
 * These tests stand up the chunk routers side-by-side with the time-travel
 * middleware (mounted the same way `server.ts` wires it) and a
 * pre-populated {@link VersionStore}. They assert five contract points:
 *
 *  1. GET /api/chunks/connections?at=v1 returns the v1 IR's chunk, not live.
 *  2. GET /api/chunks/memory?at=snap:pre-upgrade reads from the snapshot dir.
 *  3. GET /api/chunks/memory?at=snap:missing returns 404 AT_SNAPSHOT_NOT_FOUND.
 *  4. Historical 200 responses carry `Cache-Control: immutable, max-age=31536000`.
 *  5. GET /api/chunks/memory (no ?at=) still serves the live IR — the wiring
 *     is additive and does not regress the default path.
 *
 * The middleware + store wiring here mirrors the relevant block in
 * `server.ts` so the integration shape is the one production uses.
 */

import express from 'express';
import type { Server } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR, ToolCapability } from '@bic/claws-sdk';
import type { Chunk } from '@bic/claws-sdk/workspace';
import { VersionStore } from '@bic/claws-sdk/workspace';

import { CompilationHost } from '../../src/compilation-host.js';
import { timeTravelMiddleware } from '../../src/middleware/time-travel.js';
import { chunksConnectionsRouter } from '../../src/routes/chunks-connections.js';
import { chunksMemoryRouter } from '../../src/routes/chunks-memory.js';
import { chunksGeneralRouter } from '../../src/routes/chunks-general.js';
import { governanceRouter } from '../../src/routes/governance.js';
import { TIME_TRAVEL_CACHE_CONTROL } from '../../src/routes/ir-resolution.js';

const CACHE_HEADER = 'cache-control';

function baseIR(tools: readonly ToolCapability[], compilerVersion: string): GovernanceIR {
  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
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
      compilerVersion,
      compiledAt: '2026-04-17T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

function tool(name: string, server: string, risk: ToolCapability['riskLevel']): ToolCapability {
  return {
    name,
    description: `${name} on ${server}`,
    riskLevel: risk,
    oboFlag: false,
    classification: 'filesystem',
    mcpServer: server,
  };
}

// v1 has just `list_files` on fs-v1; v3 adds `write_file` on a different server.
const IR_V1 = baseIR([tool('list_files', 'fs-v1', 'low')], 'claws-v1');
const IR_V3 = baseIR(
  [tool('list_files', 'fs-v3', 'low'), tool('write_file', 'fs-v3', 'medium')],
  'claws-v3',
);
const IR_LIVE = baseIR(
  [
    tool('list_files', 'fs-v3', 'low'),
    tool('write_file', 'fs-v3', 'medium'),
    tool('delete_file', 'fs-v3', 'critical'),
  ],
  'claws-live',
);

const SOUL = '# Soul\n\n## Purpose\n\n- exercise historical reads\n';
const IDENTITY =
  '# Identity\n\n## Knowledge Sources\n\n### Docs\n\n- public handbook url\n';

interface Harness {
  server: Server;
  port: number;
  root: string;
  store: VersionStore;
  close: () => Promise<void>;
}

async function buildHarness(liveIR: GovernanceIR): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'time-travel-read-int-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'IDENTITY.md'), IDENTITY, 'utf-8');

  const store = new VersionStore();
  const host = new CompilationHost(async () => liveIR, root);
  await host.compile();

  const app = express();
  // Mount the time-travel middleware on `/api` exactly as server.ts does
  // (respondDirectly: false so the chunk routers render the body).
  app.use(
    '/api',
    timeTravelMiddleware({
      resolver: { store, workspaceRoot: root },
      respondDirectly: false,
    }),
  );
  // Mount every chunk router under /api/chunks — mirrors server.ts's
  // prefixes.chunks composition without pulling in the full app.
  const chunks = express.Router();
  chunks.use('/', chunksConnectionsRouter(host, { workspaceRoot: root }));
  chunks.use('/', chunksMemoryRouter(host, { workspaceRoot: root }));
  chunks.use('/', chunksGeneralRouter(host, { workspaceRoot: root }));
  app.use('/api/chunks', chunks);
  app.use('/api/governance', governanceRouter(host));

  const server: Server = await new Promise((resolve) => {
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

async function writeSnapshotIR(
  root: string,
  name: string,
  ir: GovernanceIR,
): Promise<void> {
  const dir = join(root, '.claws', 'snapshots', name, 'files', '.claws', 'compiled');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'governance-ir.json'), JSON.stringify(ir), 'utf-8');
}

async function fetchJSON(
  port: number,
  path: string,
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${String(port)}${path}`);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // Non-JSON — keep as string so the test can still assert.
  }
  return { status: res.status, headers: res.headers, body };
}

let harness: Harness | undefined;

beforeEach(async () => {
  harness = await buildHarness(IR_LIVE);
});

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

describe('time-travel read wiring — CP-6 R2 Cluster I / M2r', () => {
  it('1. GET /api/chunks/connections?at=v1 returns the v1 snapshot (not live)', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h-v1' },
      governanceIR: IR_V1,
    });
    h.store.record({
      version: 3,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h-v3' },
      governanceIR: IR_V3,
    });

    // Live would have 3 tools (fs-v3 servers including delete_file);
    // v1 has only 1 tool on fs-v1.
    const live = await fetchJSON(h.port, '/api/chunks/connections');
    expect(live.status).toBe(200);
    const liveBody = live.body as { chunks: Chunk<'connections'>[] };
    const liveServers = liveBody.chunks.map((c) => c.data.server).sort();
    expect(liveServers).toEqual(['fs-v3']);
    // Sanity: live chunk contains the destructive tool, v1 must not.
    const liveTools = liveBody.chunks[0]!.data.tools.map((t) => t.tool).sort();
    expect(liveTools).toContain('delete_file');

    const historical = await fetchJSON(h.port, '/api/chunks/connections?at=v1');
    expect(historical.status).toBe(200);
    expect(historical.headers.get(CACHE_HEADER)).toBe(TIME_TRAVEL_CACHE_CONTROL);
    const histBody = historical.body as { chunks: Chunk<'connections'>[] };
    const histServers = histBody.chunks.map((c) => c.data.server).sort();
    expect(histServers).toEqual(['fs-v1']);
    const histTools = histBody.chunks[0]!.data.tools.map((t) => t.tool);
    expect(histTools).toEqual(['list_files']);
  });

  it('2. GET /api/chunks/connections?at=v3 returns the v3 snapshot', async () => {
    const h = harness!;
    h.store.record({
      version: 3,
      compiledAt: '2026-04-15T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h-v3' },
      governanceIR: IR_V3,
    });

    const res = await fetchJSON(h.port, '/api/chunks/connections?at=v3');
    expect(res.status).toBe(200);
    expect(res.headers.get(CACHE_HEADER)).toBe(TIME_TRAVEL_CACHE_CONTROL);
    expect(res.headers.get('x-governance-version')).toBe('3');
    const body = res.body as { chunks: Chunk<'connections'>[] };
    const tools = body.chunks[0]!.data.tools.map((t) => t.tool).sort();
    // v3 had list_files + write_file; no delete_file (that's live only).
    expect(tools).toEqual(['list_files', 'write_file']);
  });

  it('3. GET /api/chunks/memory?at=snap:pre-upgrade reads from the snapshot dir', async () => {
    const h = harness!;
    await writeSnapshotIR(h.root, 'pre-upgrade', IR_V1);

    const res = await fetchJSON(h.port, '/api/chunks/memory?at=snap:pre-upgrade');
    expect(res.status).toBe(200);
    expect(res.headers.get(CACHE_HEADER)).toBe(TIME_TRAVEL_CACHE_CONTROL);
    expect(res.headers.get('x-governance-version')).toBe('snap:pre-upgrade');
    // Memory chunk shape is unaffected by tool set, but the handler
    // using the historical IR proves the wiring reached the route.
    const body = res.body as { tab: string };
    expect(body.tab).toBe('memory');
  });

  it('4. GET /api/chunks/memory?at=snap:missing returns 404 AT_SNAPSHOT_NOT_FOUND', async () => {
    const h = harness!;
    const res = await fetchJSON(h.port, '/api/chunks/memory?at=snap:missing');
    expect(res.status).toBe(404);
    const err = res.body as { error: { code: string; name: string } };
    expect(err.error.code).toBe('AT_SNAPSHOT_NOT_FOUND');
    expect(err.error.name).toBe('missing');
  });

  it('5. GET /api/chunks/memory (no ?at=) still serves the live IR — no regression', async () => {
    const h = harness!;
    const res = await fetchJSON(h.port, '/api/chunks/memory');
    expect(res.status).toBe(200);
    // Default live responses must not carry the immutable cache header —
    // that would poison intermediary caches with live-mutable state.
    expect(res.headers.get(CACHE_HEADER)).not.toBe(TIME_TRAVEL_CACHE_CONTROL);
    const body = res.body as { tab: string };
    expect(body.tab).toBe('memory');
  });

  it('6. GET /api/chunks/connections/:server?at=v1 returns the v1 single-server chunk', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h-v1' },
      governanceIR: IR_V1,
    });

    const res = await fetchJSON(h.port, '/api/chunks/connections/fs-v1?at=v1');
    expect(res.status).toBe(200);
    expect(res.headers.get(CACHE_HEADER)).toBe(TIME_TRAVEL_CACHE_CONTROL);
    const chunk = res.body as Chunk<'connections'>;
    expect(chunk.data.server).toBe('fs-v1');
  });

  it('7. GET /api/chunks/connections/:server?at=v1 — server absent in historical IR → 404', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h-v1' },
      governanceIR: IR_V1,
    });

    // fs-v3 only exists in live / v3 — not in v1.
    const res = await fetchJSON(h.port, '/api/chunks/connections/fs-v3?at=v1');
    expect(res.status).toBe(404);
    const err = res.body as { error: { code: string } };
    expect(err.error.code).toBe('CONNECTIONS_SERVER_NOT_FOUND');
  });

  it('8. GET /api/chunks/general/identity?at=v1 returns historical general chunk with cache header', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'IDENTITY.md': 'h-v1' },
      governanceIR: IR_V1,
    });

    const res = await fetchJSON(h.port, '/api/chunks/general/identity?at=v1');
    expect(res.status).toBe(200);
    expect(res.headers.get(CACHE_HEADER)).toBe(TIME_TRAVEL_CACHE_CONTROL);
    const body = res.body as { tab: string };
    expect(body.tab).toBe('general');
  });

  it('9. GET /api/governance?at=v1 returns the historical compilerVersion', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'SOUL.md': 'h-v1' },
      governanceIR: IR_V1,
    });

    const live = await fetchJSON(h.port, '/api/governance');
    expect(live.status).toBe(200);
    const liveBody = live.body as { compilerVersion: string };
    expect(liveBody.compilerVersion).toBe('claws-live');

    const historical = await fetchJSON(h.port, '/api/governance?at=v1');
    expect(historical.status).toBe(200);
    expect(historical.headers.get(CACHE_HEADER)).toBe(TIME_TRAVEL_CACHE_CONTROL);
    const histBody = historical.body as { compilerVersion: string; compiledAt: string | null };
    expect(histBody.compilerVersion).toBe('claws-v1');
    // Historical reads pin `compiledAt` to the snapshot's captured value,
    // not the live host's compile timestamp.
    expect(histBody.compiledAt).toBe('2026-04-17T00:00:00.000Z');
  });

  it('10. GET /api/chunks/connections?at=v99 (out of range) returns 404 AT_VERSION_OUT_OF_RANGE', async () => {
    const h = harness!;
    h.store.record({
      version: 1,
      compiledAt: '2026-04-10T00:00:00.000Z',
      fileHashes: { 'TOOLS.md': 'h-v1' },
      governanceIR: IR_V1,
    });

    const res = await fetchJSON(h.port, '/api/chunks/connections?at=v99');
    expect(res.status).toBe(404);
    const err = res.body as { error: { code: string } };
    expect(err.error.code).toBe('AT_VERSION_OUT_OF_RANGE');
  });
});
