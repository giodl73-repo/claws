/**
 * L2 e2e tests for the time-travel API.
 *
 * 1. PATCH → version-store records the new snapshot → GET ?at=<oldVersion>
 *    returns the historical IR, not the live one.
 * 2. `claws snap save` writes a snapshot to disk → GET ?at=snap:<name>
 *    returns the snapshot's IR.
 */

import express, { type Request, type Response } from 'express';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import { VersionStore } from '@bic/claws-sdk/workspace';
import { save as saveSnapshot } from '@bic/claws-sdk/snapshot';
import {
  GOVERNANCE_VERSION_HEADER,
  timeTravelMiddleware,
} from '../../src/middleware/time-travel.js';

function buildIR(tag: string, compiledAt: string): GovernanceIR {
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
      compiledAt,
      schemaVersion: 1,
    },
  };
}

interface Harness {
  server: Server;
  port: number;
  root: string;
  store: VersionStore;
  currentVersion: () => number;
  close: () => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'time-travel-e2e-'));
  const store = new VersionStore();
  let liveVersion = 0;
  let liveIR = buildIR('initial', new Date().toISOString());
  store.record({
    version: liveVersion,
    compiledAt: liveIR.compiler.compiledAt,
    fileHashes: { 'TOOLS.md': 'hash-0' },
    governanceIR: liveIR,
  });

  const app = express();
  app.use(express.json());

  // Time-travel is ahead of the live handler. When ?at= is absent the
  // middleware delegates to the live handler below.
  const middleware = timeTravelMiddleware({ resolver: { store, workspaceRoot: root } });

  app.get('/api/oc/:file', middleware, (_req: Request, res: Response) => {
    res.status(200).json({
      live: true,
      version: liveVersion,
      governanceIR: liveIR,
    });
  });

  app.patch('/api/oc/:file', middleware, async (req: Request, res: Response) => {
    // Simulate a PATCH: advance the workspace version, produce a new IR,
    // record into the version-store. Real implementation wires this via
    // VersionManager + the compilation queue; the e2e is about middleware
    // behaviour so we drive the store directly.
    liveVersion += 1;
    const compiledAt = new Date().toISOString();
    liveIR = buildIR(`v${String(liveVersion)}`, compiledAt);
    const fileName = req.params['file'] ?? 'TOOLS.md';
    store.record({
      version: liveVersion,
      compiledAt,
      fileHashes: { [fileName]: `hash-${String(liveVersion)}` },
      governanceIR: liveIR,
    });
    res.status(200).json({ version: liveVersion });
  });

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
    currentVersion: () => liveVersion,
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

async function request(
  port: number,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${String(port)}${path}`, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // keep raw text
  }
  return { status: res.status, headers: res.headers, body };
}

describe('time-travel API — L2 e2e', () => {
  it('1. PATCH → version increments → GET ?at=<oldVersion> returns the old IR', async () => {
    const h = harness!;
    const before = await request(h.port, '/api/oc/TOOLS.md');
    const initialBody = before.body as { version: number; governanceIR: GovernanceIR };
    expect(initialBody.version).toBe(0);
    expect(initialBody.governanceIR.compiler.compilerVersion).toBe('0.0.0-initial');

    const patch1 = await request(h.port, '/api/oc/TOOLS.md', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(patch1.status).toBe(200);
    expect(h.currentVersion()).toBe(1);

    const patch2 = await request(h.port, '/api/oc/TOOLS.md', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(patch2.status).toBe(200);
    expect(h.currentVersion()).toBe(2);

    // Live read still returns the newest.
    const live = await request(h.port, '/api/oc/TOOLS.md');
    const liveBody = live.body as { version: number; governanceIR: GovernanceIR };
    expect(liveBody.version).toBe(2);
    expect(liveBody.governanceIR.compiler.compilerVersion).toBe('0.0.0-v2');

    // Historical read at v0 returns the pre-PATCH state.
    const past = await request(h.port, '/api/oc/TOOLS.md?at=v0');
    expect(past.status).toBe(200);
    expect(past.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('0');
    const pastBody = past.body as { governanceIR: GovernanceIR };
    expect(pastBody.governanceIR.compiler.compilerVersion).toBe('0.0.0-initial');
  });

  it('2. GET ?at=snap:<name> returns the state saved by claws snap', async () => {
    const h = harness!;

    // Stage a workspace — the snapshot save routine reads these files.
    await writeFile(join(h.root, 'claws.json'), '{"clawsVersion":"0.0.0"}', 'utf-8');
    const compiledDir = join(h.root, '.claws', 'compiled');
    await (async () => {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(compiledDir, { recursive: true });
    })();
    const anchorIR = buildIR('anchor-snap', '2026-04-14T00:00:00.000Z');
    await writeFile(
      join(compiledDir, 'governance-ir.json'),
      JSON.stringify(anchorIR),
      'utf-8',
    );

    const saveResult = await saveSnapshot(h.root, 'pre-upgrade');
    expect(saveResult.fileCount).toBeGreaterThan(0);
    // Verify the save wrote the IR into the snapshot tree where the
    // resolver looks for it.
    const savedIRRaw = await readFile(
      join(
        h.root,
        '.claws',
        'snapshots',
        'pre-upgrade',
        'files',
        '.claws',
        'compiled',
        'governance-ir.json',
      ),
      'utf-8',
    );
    expect(JSON.parse(savedIRRaw)).toEqual(anchorIR);

    const res = await request(h.port, '/api/oc/TOOLS.md?at=snap:pre-upgrade');
    expect(res.status).toBe(200);
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('snap:pre-upgrade');
    const body = res.body as {
      at: { mode: string; version: number | null };
      governanceIR: GovernanceIR;
    };
    expect(body.at.mode).toBe('snapshot');
    expect(body.at.version).toBeNull();
    expect(body.governanceIR.compiler.compilerVersion).toBe('0.0.0-anchor-snap');
  });
});
