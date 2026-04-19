/**
 * L1 integration tests for the auto-snapshot trigger pipeline wired
 * through the time-travel middleware.
 *
 * The hook is an SDK entry point — the serve layer integrates by
 * driving `invokeAutoSnapshotHook` from its file watcher and exposing
 * the resulting auto-snapshots through the time-travel resolver.
 * These tests exercise that end-to-end path with a real Express app,
 * stand-in file-watcher events, and real HTTP traffic.
 *
 * Covers the four pulse behaviours:
 * 1. external edit triggers a snapshot with trigger=external_edit
 * 2. OC runtime write triggers a snapshot with trigger=oc_runtime
 * 3. OneDrive sync triggers a snapshot with trigger=onedrive_sync
 * 4. rapid successive edits do not exceed the bounded window
 */

import express from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import {
  AutoSnapshotManager,
  VersionStore,
  invokeAutoSnapshotHook,
  type AutoSnapshotTrigger,
} from '@bic/claws-sdk/workspace';
import {
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
  autoSnapshots: AutoSnapshotManager;
  close: () => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'auto-snapshot-int-'));
  const store = new VersionStore();
  const autoSnapshots = new AutoSnapshotManager();
  const app = express();
  app.get(
    '/api/oc/:file',
    timeTravelMiddleware({
      resolver: { store, workspaceRoot: root, autoSnapshots },
    }),
    (_req, res) => {
      res.status(200).json({ live: true });
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
    autoSnapshots,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

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

async function simulateWatcherEvent(
  h: Harness,
  opts: {
    version: number;
    compiledAt: string;
    trigger: AutoSnapshotTrigger;
    parseable?: boolean;
    snapshotAt?: string;
    tag?: string;
  },
): Promise<void> {
  const ir = buildIR(opts.tag ?? `v${String(opts.version)}`);
  h.store.record({
    version: opts.version,
    compiledAt: opts.compiledAt,
    fileHashes: { 'SOUL.md': `hash-${String(opts.version)}` },
    governanceIR: ir,
  });
  await invokeAutoSnapshotHook({
    previousState: {
      version: opts.version,
      governanceIrHash: `ir-hash-${String(opts.version)}`,
      fileHashes: { 'SOUL.md': `hash-${String(opts.version)}` },
    },
    trigger: opts.trigger,
    integrityCheck: async () => opts.parseable !== false,
    manager: h.autoSnapshots,
    now: () => new Date(opts.snapshotAt ?? opts.compiledAt),
  });
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

describe('auto-snapshot pipeline — L1 integration', () => {
  it('1. external edit triggers a snapshot and the IR is served at ?at=auto:<ts>', async () => {
    const h = harness!;
    await simulateWatcherEvent(h, {
      version: 10,
      compiledAt: '2026-04-17T10:00:00.000Z',
      trigger: 'external_edit',
      snapshotAt: '2026-04-17T10:00:10.000Z',
      tag: 'ext',
    });
    expect(h.autoSnapshots.size()).toBe(1);
    expect(h.autoSnapshots.list()[0]!.trigger).toBe('external_edit');

    const res = await get(
      h.port,
      '/api/oc/SOUL.md?at=auto:2026-04-17T10:05:00.000Z',
    );
    expect(res.status).toBe(200);
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('10');
    const body = res.body as {
      at: { mode: string; version: number };
      governanceIR: GovernanceIR;
    };
    expect(body.at.mode).toBe('auto');
    expect(body.at.version).toBe(10);
    expect(body.governanceIR.compiler.compilerVersion).toBe('0.0.0-ext');
  });

  it('2. OC runtime write triggers a snapshot attributed to oc_runtime', async () => {
    const h = harness!;
    await simulateWatcherEvent(h, {
      version: 11,
      compiledAt: '2026-04-17T11:00:00.000Z',
      trigger: 'oc_runtime',
      tag: 'ocr',
    });
    const entries = h.autoSnapshots.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.trigger).toBe('oc_runtime');
    expect(entries[0]!.version).toBe(11);

    const res = await get(
      h.port,
      '/api/oc/SOUL.md?at=auto:2026-04-17T12:00:00.000Z',
    );
    expect(res.status).toBe(200);
    const body = res.body as { at: { mode: string; version: number } };
    expect(body.at.version).toBe(11);
  });

  it('3. OneDrive sync triggers a snapshot attributed to onedrive_sync', async () => {
    const h = harness!;
    await simulateWatcherEvent(h, {
      version: 12,
      compiledAt: '2026-04-17T12:30:00.000Z',
      trigger: 'onedrive_sync',
      tag: 'od',
    });
    expect(h.autoSnapshots.list()[0]!.trigger).toBe('onedrive_sync');

    const res = await get(
      h.port,
      '/api/oc/SOUL.md?at=auto:2026-04-17T13:00:00.000Z',
    );
    expect(res.status).toBe(200);
    const body = res.body as { at: { mode: string; version: number } };
    expect(body.at.version).toBe(12);
  });

  it('4. rapid successive edits never exceed the 20-entry bound', async () => {
    const h = harness!;
    // Fire 25 watcher events in quick succession — the manager should
    // cap at 20 entries with the oldest 5 evicted.
    for (let i = 0; i < 25; i += 1) {
      const ts = new Date(
        Date.UTC(2026, 3, 17, 10, Math.floor(i / 60), i % 60),
      ).toISOString();
      await simulateWatcherEvent(h, {
        version: 100 + i,
        compiledAt: ts,
        trigger: 'external_edit',
        snapshotAt: ts,
      });
    }
    expect(h.autoSnapshots.size()).toBe(20);
    const versions = h.autoSnapshots.list().map((e) => e.version);
    expect(versions).not.toContain(100);
    expect(versions).not.toContain(104);
    expect(versions).toContain(105);
    expect(versions).toContain(124);

    // The newest auto-snapshot resolves through the HTTP layer too.
    const res = await get(
      h.port,
      '/api/oc/SOUL.md?at=auto:2026-04-17T12:00:00.000Z',
    );
    expect(res.status).toBe(200);
    const body = res.body as { at: { mode: string; version: number } };
    expect(body.at.version).toBe(124);
  });
});
