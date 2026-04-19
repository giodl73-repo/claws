/**
 * L0 unit tests for AutoSnapshotManager + trigger hook + resolver.
 *
 * Covers the six behaviours the pulse enumerates:
 * 1. save snapshot
 * 2. LRU eviction at the 20-entry bound
 * 3. timestamp accuracy (returns the value that was saved)
 * 4. trigger attribution (returns the trigger that was saved)
 * 5. resolve `?at=auto:<ts>` via the resolver
 * 6. empty snapshot dir — findNearestByTimestamp returns null
 */

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '../../src/index.js';
import {
  AutoSnapshotManager,
  VersionStore,
  parseAt,
  resolveAt,
  invokeAutoSnapshotHook,
  type AutoSnapshotTrigger,
  type ResolverContext,
} from '../../src/workspace/index.js';
import type {
  AuditChainSink,
  AuditEventInput,
} from '../../src/compliance/audit-chain.js';

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

async function saveAt(
  mgr: AutoSnapshotManager,
  version: number,
  timestamp: string,
  trigger: AutoSnapshotTrigger = 'external_edit',
): Promise<void> {
  await mgr.save({
    version,
    governanceIrHash: `hash-${String(version)}`,
    fileHashes: { 'SOUL.md': `h-${String(version)}` },
    trigger,
    timestamp,
  });
}

describe('AutoSnapshotManager — L0 unit', () => {
  it('1. save stores the snapshot with all inputs retained', async () => {
    const mgr = new AutoSnapshotManager();
    const snapshot = await mgr.save({
      version: 38,
      governanceIrHash: 'ir-hash-38',
      fileHashes: { 'SOUL.md': 'abc', 'MEMORY.md': 'def' },
      trigger: 'oc_runtime',
      timestamp: '2026-04-17T12:00:00.000Z',
    });
    expect(snapshot.version).toBe(38);
    expect(snapshot.governanceIrHash).toBe('ir-hash-38');
    expect(snapshot.fileHashes).toEqual({ 'SOUL.md': 'abc', 'MEMORY.md': 'def' });
    expect(snapshot.trigger).toBe('oc_runtime');
    expect(snapshot.timestamp).toBe('2026-04-17T12:00:00.000Z');
    expect(mgr.size()).toBe(1);
  });

  it('2. LRU evicts the oldest entry at the 20-entry bound', async () => {
    const mgr = new AutoSnapshotManager();
    // Insert 21 entries with monotonic timestamps — the first (oldest)
    // must be evicted once the 21st arrives.
    for (let i = 0; i < 21; i += 1) {
      const ts = new Date(Date.UTC(2026, 3, 17, 0, i, 0)).toISOString();
      await saveAt(mgr, i, ts);
    }
    expect(mgr.size()).toBe(20);
    const versions = mgr.list().map((e) => e.version);
    expect(versions).not.toContain(0);
    expect(versions).toContain(1);
    expect(versions).toContain(20);
  });

  it('3. timestamp accuracy — findNearestByTimestamp returns the saved timestamp verbatim', async () => {
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 5, '2026-04-17T10:00:00.000Z');
    await saveAt(mgr, 6, '2026-04-17T11:00:00.000Z');
    const found = mgr.findNearestByTimestamp('2026-04-17T11:30:00.000Z');
    expect(found).not.toBeNull();
    expect(found?.version).toBe(6);
    expect(found?.timestamp).toBe('2026-04-17T11:00:00.000Z');
  });

  it('4. trigger attribution is preserved across save/list for all three trigger sources', async () => {
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 1, '2026-04-17T10:00:00.000Z', 'oc_runtime');
    await saveAt(mgr, 2, '2026-04-17T10:05:00.000Z', 'external_edit');
    await saveAt(mgr, 3, '2026-04-17T10:10:00.000Z', 'onedrive_sync');
    const triggers = mgr.list().map((e) => e.trigger);
    expect(triggers).toEqual(['oc_runtime', 'external_edit', 'onedrive_sync']);
  });

  it('5. resolveAt on ?at=auto:<ts> returns the paired VersionStore IR', async () => {
    const store = new VersionStore();
    const mgr = new AutoSnapshotManager();
    const ir = buildIR('v7');
    store.record({
      version: 7,
      compiledAt: '2026-04-17T09:00:00.000Z',
      fileHashes: { 'SOUL.md': 'h7' },
      governanceIR: ir,
    });
    await saveAt(mgr, 7, '2026-04-17T09:00:30.000Z', 'external_edit');

    const parsed = parseAt('auto:2026-04-17T10:00:00.000Z');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.parsed.mode).toBe('auto');

    const ctx: ResolverContext = {
      store,
      workspaceRoot: '/unused',
      autoSnapshots: mgr,
    };
    const result = await resolveAt(parsed.parsed, ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolved.mode).toBe('auto');
    expect(result.resolved.governanceIR).toBe(ir);
    expect(result.resolved.version).toBe(7);
  });

  it('6. empty index — findNearestByTimestamp returns null, resolver returns OUT_OF_RANGE', async () => {
    const store = new VersionStore();
    const mgr = new AutoSnapshotManager();
    expect(mgr.findNearestByTimestamp('2026-04-17T10:00:00.000Z')).toBeNull();
    expect(mgr.size()).toBe(0);

    const parsed = parseAt('auto:2026-04-17T10:00:00.000Z');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await resolveAt(parsed.parsed, {
      store,
      workspaceRoot: '/unused',
      autoSnapshots: mgr,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('AUTO_SNAPSHOT_OUT_OF_RANGE');
  });
});

describe('AutoSnapshotManager — constructor + list + clear', () => {
  it('rejects a non-positive maxEntries with a descriptive error', () => {
    expect(() => new AutoSnapshotManager({ maxEntries: 0 })).toThrow(/positive integer/);
    expect(() => new AutoSnapshotManager({ maxEntries: -3 })).toThrow(/positive integer/);
    expect(() => new AutoSnapshotManager({ maxEntries: 1.5 })).toThrow(/positive integer/);
  });

  it('rejects a negative version on save', async () => {
    const mgr = new AutoSnapshotManager();
    await expect(
      mgr.save({
        version: -1,
        governanceIrHash: 'x',
        fileHashes: {},
        trigger: 'oc_runtime',
      }),
    ).rejects.toThrow(/non-negative integer/);
  });

  it('save() defaults timestamp to the current wall clock when omitted', async () => {
    const mgr = new AutoSnapshotManager();
    const before = Date.now();
    const snap = await mgr.save({
      version: 1,
      governanceIrHash: 'h',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const when = Date.parse(snap.timestamp);
    expect(Number.isNaN(when)).toBe(false);
    expect(when).toBeGreaterThanOrEqual(before);
    expect(when).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('list() returns a snapshot copy — mutating the result does not affect the manager', async () => {
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 1, '2026-04-17T10:00:00.000Z');
    const listed = mgr.list() as { length: number }[];
    (listed as unknown[]).length = 0;
    expect(mgr.size()).toBe(1);
  });

  it('clear() drops all retained snapshots', async () => {
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 1, '2026-04-17T10:00:00.000Z');
    await saveAt(mgr, 2, '2026-04-17T10:05:00.000Z');
    expect(mgr.size()).toBe(2);
    mgr.clear();
    expect(mgr.size()).toBe(0);
    expect(mgr.list()).toEqual([]);
  });

  it('dir() joins the workspace root with the on-disk auto-snapshot directory', () => {
    expect(AutoSnapshotManager.dir('/tmp/ws')).toBe('/tmp/ws/.claws/snapshots/auto');
  });

  it('findNearestByTimestamp returns null when every entry is newer than the target', async () => {
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 1, '2026-04-17T11:00:00.000Z');
    expect(mgr.findNearestByTimestamp('2026-04-17T10:00:00.000Z')).toBeNull();
  });

  it('findNearestByTimestamp ignores unparseable stored timestamps and returns null for bad input', async () => {
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 1, '2026-04-17T10:00:00.000Z');
    expect(mgr.findNearestByTimestamp('not-a-date')).toBeNull();
  });

  it('eviction tiebreaks equal timestamps by dropping the lowest version', async () => {
    const mgr = new AutoSnapshotManager({ maxEntries: 2 });
    const ts = '2026-04-17T10:00:00.000Z';
    await saveAt(mgr, 5, ts);
    await saveAt(mgr, 7, ts);
    await saveAt(mgr, 8, '2026-04-17T10:05:00.000Z');
    const versions = mgr.list().map((e) => e.version).sort((a, b) => a - b);
    expect(versions).toEqual([7, 8]);
  });

  it('eviction tiebreak fires when a later-inserted slot has the same timestamp but a lower version', async () => {
    // slot[0] = v9 (ts=T), slot[1] = v5 (ts=T), slot[2] = v8 (ts=T+5).
    // Scan: oldestIdx=0 (v9). i=1 (v5, same ts, 5<9) → flip to 1. i=2 (v8,
    // later ts) → skip. Eviction drops slot[1] (v5). This exercises the
    // `candWhen === oldestWhen && candidate.version < oldest.version` true-
    // branch, which the v5→v7 case does not reach.
    const mgr = new AutoSnapshotManager({ maxEntries: 2 });
    const ts = '2026-04-17T10:00:00.000Z';
    await saveAt(mgr, 9, ts);
    await saveAt(mgr, 5, ts);
    await saveAt(mgr, 8, '2026-04-17T10:05:00.000Z');
    const versions = mgr.list().map((e) => e.version).sort((a, b) => a - b);
    // v5 is oldest by the tiebreak rule → evicted.
    expect(versions).toEqual([8, 9]);
  });

  it('eviction finds the oldest when a later-inserted entry has an earlier timestamp', async () => {
    // Insert in timestamp-reversed order: slot[0] is NEWER than slot[1].
    // This forces the eviction scan to follow the `candWhen < oldestWhen`
    // branch when comparing slot[1] against slot[0], shifting oldestIdx.
    const mgr = new AutoSnapshotManager({ maxEntries: 2 });
    await saveAt(mgr, 3, '2026-04-17T12:00:00.000Z');
    await saveAt(mgr, 4, '2026-04-17T10:00:00.000Z');
    await saveAt(mgr, 5, '2026-04-17T13:00:00.000Z');
    const versions = mgr.list().map((e) => e.version).sort((a, b) => a - b);
    // v4 is oldest by timestamp → evicted. v3 and v5 remain.
    expect(versions).toEqual([3, 5]);
  });
});

describe('invokeAutoSnapshotHook — L0 unit', () => {
  const previousState = {
    version: 12,
    governanceIrHash: 'prev-ir-hash',
    fileHashes: { 'SOUL.md': 'prev-soul' },
  } as const;

  it('saves when the integrity check passes', async () => {
    const mgr = new AutoSnapshotManager();
    const result = await invokeAutoSnapshotHook({
      previousState,
      trigger: 'external_edit',
      integrityCheck: async () => true,
      manager: mgr,
      now: () => new Date('2026-04-17T10:00:00.000Z'),
    });
    expect(result.kind).toBe('saved');
    expect(mgr.size()).toBe(1);
    if (result.kind !== 'saved') return;
    expect(result.snapshot.version).toBe(12);
    expect(result.snapshot.trigger).toBe('external_edit');
    expect(result.snapshot.timestamp).toBe('2026-04-17T10:00:00.000Z');
  });

  it('skips when the integrity check fails (partial write) and does not mutate the manager', async () => {
    const mgr = new AutoSnapshotManager();
    const result = await invokeAutoSnapshotHook({
      previousState,
      trigger: 'onedrive_sync',
      integrityCheck: async () => false,
      manager: mgr,
    });
    expect(result.kind).toBe('skipped');
    if (result.kind !== 'skipped') return;
    expect(result.reason).toBe('unparseable');
    expect(mgr.size()).toBe(0);
  });

  it('uses the default wall clock when `now` is omitted', async () => {
    const mgr = new AutoSnapshotManager();
    const before = Date.now();
    const result = await invokeAutoSnapshotHook({
      previousState,
      trigger: 'external_edit',
      integrityCheck: async () => true,
      manager: mgr,
    });
    expect(result.kind).toBe('saved');
    if (result.kind !== 'saved') return;
    const when = Date.parse(result.snapshot.timestamp);
    expect(Number.isNaN(when)).toBe(false);
    expect(when).toBeGreaterThanOrEqual(before);
    expect(when).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

describe('parseAt / resolveAt — auto-snapshot edge cases', () => {
  it('rejects `auto:` without a timestamp as INVALID_AT_PARAM', () => {
    const parsed = parseAt('auto:');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe('INVALID_AT_PARAM');
  });

  it('rejects `auto:not-a-date` as INVALID_AT_PARAM', () => {
    const parsed = parseAt('auto:not-a-date');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe('INVALID_AT_PARAM');
  });

  it('surfaces AUTO_SNAPSHOT_NOT_CONFIGURED when the resolver has no manager', async () => {
    const store = new VersionStore();
    const parsed = parseAt('auto:2026-04-17T10:00:00.000Z');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await resolveAt(parsed.parsed, {
      store,
      workspaceRoot: '/unused',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('AUTO_SNAPSHOT_NOT_CONFIGURED');
  });

  it('surfaces AUTO_SNAPSHOT_IR_MISSING when the referenced version is out of the store', async () => {
    const store = new VersionStore({ maxVersions: 2 });
    // Push enough versions to evict version 5.
    for (let v = 5; v <= 8; v += 1) {
      store.record({
        version: v,
        compiledAt: `2026-04-17T0${String(v)}:00:00.000Z`,
        fileHashes: {},
        governanceIR: buildIR(`v${String(v)}`),
      });
    }
    const mgr = new AutoSnapshotManager();
    await saveAt(mgr, 5, '2026-04-17T05:30:00.000Z', 'oc_runtime');

    const parsed = parseAt('auto:2026-04-17T06:00:00.000Z');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = await resolveAt(parsed.parsed, {
      store,
      workspaceRoot: '/unused',
      autoSnapshots: mgr,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('AUTO_SNAPSHOT_IR_MISSING');
  });
});

describe('AutoSnapshotManager — disk persistence (save + load)', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'auto-snap-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('save() persists each snapshot to .claws/snapshots/auto/<version>.json', async () => {
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.save({
      version: 3,
      governanceIrHash: 'h3',
      fileHashes: { 'SOUL.md': 's3' },
      trigger: 'oc_runtime',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    const dir = AutoSnapshotManager.dir(root);
    const listed = await readdir(dir);
    expect(listed).toContain('3.json');
    const raw = await readFile(join(dir, '3.json'), 'utf-8');
    const parsed = JSON.parse(raw) as {
      version: number;
      trigger: string;
      governanceIrHash: string;
      fileHashes: Record<string, string>;
    };
    expect(parsed.version).toBe(3);
    expect(parsed.trigger).toBe('oc_runtime');
    expect(parsed.governanceIrHash).toBe('h3');
    expect(parsed.fileHashes).toEqual({ 'SOUL.md': 's3' });
  });

  it('eviction removes the on-disk file for the dropped snapshot', async () => {
    const mgr = new AutoSnapshotManager({ workspaceRoot: root, maxEntries: 2 });
    await mgr.save({
      version: 1,
      governanceIrHash: 'h1',
      fileHashes: {},
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    await mgr.save({
      version: 2,
      governanceIrHash: 'h2',
      fileHashes: {},
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:05:00.000Z',
    });
    await mgr.save({
      version: 3,
      governanceIrHash: 'h3',
      fileHashes: {},
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:10:00.000Z',
    });

    const dir = AutoSnapshotManager.dir(root);
    const listed = await readdir(dir);
    expect(listed.sort()).toEqual(['2.json', '3.json']);
  });

  it('load() is a no-op when the manager has no workspaceRoot', async () => {
    const mgr = new AutoSnapshotManager();
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('load() treats a missing snapshot directory as zero entries', async () => {
    // root exists (mkdtemp) but .claws/snapshots/auto does not.
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('load() rehydrates saved snapshots in oldest-first order', async () => {
    // Save via one manager, then load via a fresh manager to prove the
    // on-disk state is the source of truth.
    const writer = new AutoSnapshotManager({ workspaceRoot: root });
    await writer.save({
      version: 2,
      governanceIrHash: 'h2',
      fileHashes: { 'SOUL.md': 's2' },
      trigger: 'oc_runtime',
      timestamp: '2026-04-17T11:00:00.000Z',
    });
    await writer.save({
      version: 1,
      governanceIrHash: 'h1',
      fileHashes: { 'SOUL.md': 's1' },
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });

    const reader = new AutoSnapshotManager({ workspaceRoot: root });
    await reader.load();
    const versions = reader.list().map((e) => e.version);
    // Oldest timestamp first: v1 (10:00) before v2 (11:00).
    expect(versions).toEqual([1, 2]);
    expect(reader.list()[0]?.trigger).toBe('external_edit');
    expect(reader.list()[1]?.governanceIrHash).toBe('h2');
  });

  it('load() skips non-JSON filenames, unparseable JSON, and schema-invalid entries', async () => {
    const dir = AutoSnapshotManager.dir(root);
    await mkdir(dir, { recursive: true });
    // A well-formed entry that should survive rehydration.
    await writeFile(
      join(dir, '7.json'),
      JSON.stringify({
        version: 7,
        timestamp: '2026-04-17T10:00:00.000Z',
        governanceIrHash: 'h7',
        fileHashes: { 'SOUL.md': 's7' },
        trigger: 'onedrive_sync',
      }),
      'utf-8',
    );
    // Non-.json filename → skipped by the extension filter.
    await writeFile(join(dir, 'README.txt'), 'ignored', 'utf-8');
    // Malformed JSON → parser throws → skipped.
    await writeFile(join(dir, 'bad.json'), '{not json', 'utf-8');
    // JSON with the wrong shape → toAutoSnapshot returns null → skipped.
    await writeFile(
      join(dir, 'shape.json'),
      JSON.stringify({ version: 'not-a-number' }),
      'utf-8',
    );
    // JSON with an unrecognised trigger → skipped.
    await writeFile(
      join(dir, 'trigger.json'),
      JSON.stringify({
        version: 9,
        timestamp: '2026-04-17T10:00:00.000Z',
        governanceIrHash: 'h9',
        fileHashes: {},
        trigger: 'mystery_source',
      }),
      'utf-8',
    );

    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    const versions = mgr.list().map((e) => e.version);
    expect(versions).toEqual([7]);
  });

  it('load() evicts beyond maxEntries and drops the overflow both in-memory and on disk', async () => {
    const dir = AutoSnapshotManager.dir(root);
    await mkdir(dir, { recursive: true });
    // Write three entries to disk with increasing timestamps.
    const writeEntry = async (v: number, ts: string): Promise<void> => {
      await writeFile(
        join(dir, `${String(v)}.json`),
        JSON.stringify({
          version: v,
          timestamp: ts,
          governanceIrHash: `h${String(v)}`,
          fileHashes: {},
          trigger: 'external_edit',
        }),
        'utf-8',
      );
    };
    await writeEntry(1, '2026-04-17T10:00:00.000Z');
    await writeEntry(2, '2026-04-17T10:05:00.000Z');
    await writeEntry(3, '2026-04-17T10:10:00.000Z');

    const mgr = new AutoSnapshotManager({ workspaceRoot: root, maxEntries: 2 });
    await mgr.load();
    // Oldest (v1 @ 10:00) evicted by the post-load scan.
    expect(mgr.list().map((e) => e.version).sort()).toEqual([2, 3]);
    const remaining = (await readdir(dir)).sort();
    expect(remaining).toEqual(['2.json', '3.json']);
  });

  it('load() propagates unexpected readdir errors instead of swallowing them', async () => {
    // Force readdir to fail with ENOTDIR by making the auto-snapshot path
    // resolve to a regular file rather than a directory. We plant a file
    // exactly where the manager expects a directory, then trigger load().
    const autoDir = AutoSnapshotManager.dir(root); // .../.claws/snapshots/auto
    await mkdir(join(autoDir, '..'), { recursive: true });
    // `auto` is now a file, not a directory.
    await writeFile(autoDir, '', 'utf-8');
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await expect(mgr.load()).rejects.toMatchObject({
      code: expect.stringMatching(/^(ENOTDIR|ENOENT)$/) as unknown as string,
    });
  });
});

describe('AutoSnapshotManager — audit sink emission', () => {
  it('emit() fires once per save with AUTO_SNAPSHOT_CAPTURED and echoes trigger + workspaceRoot', async () => {
    const events: AuditEventInput[] = [];
    const sink: AuditChainSink = { emit: (e) => events.push(e) };
    const mgr = new AutoSnapshotManager({
      workspaceRoot: '/some/workspace',
      auditSink: sink,
      policyVersion: '1.2.3',
      // Persistence will fail on '/some/workspace' because the directory
      // doesn't exist, so pair this test with a concrete root below.
    });
    // Re-parent to a real temp root so the persistence half succeeds.
    const root = await mkdtemp(join(tmpdir(), 'auto-snap-sink-'));
    try {
      const mgrReal = new AutoSnapshotManager({
        workspaceRoot: root,
        auditSink: sink,
        policyVersion: '1.2.3',
      });
      await mgrReal.save({
        version: 1,
        governanceIrHash: 'h1',
        fileHashes: {},
        trigger: 'oc_runtime',
        timestamp: '2026-04-17T10:00:00.000Z',
      });
      expect(events).toHaveLength(1);
      const emitted = events[0]!;
      expect(emitted.eventType).toBe('AUTO_SNAPSHOT_CAPTURED');
      expect(emitted.actor).toBe('system');
      expect(emitted.target).toBe(root);
      expect(emitted.action).toBe('capture');
      expect(emitted.outcome).toBe('oc_runtime');
      expect(emitted.ruleId).toBe('AUTO_SNAPSHOT');
      expect(emitted.severity).toBe(2);
      expect(emitted.policyVersion).toBe('1.2.3');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
    // The `mgr` handle is unused but exercises the constructor branch that
    // stores the workspaceRoot without forcing persistence here.
    expect(mgr.size()).toBe(0);
  });

  it('emit() target falls back to "workspace" when no workspaceRoot is configured', async () => {
    const events: AuditEventInput[] = [];
    const sink: AuditChainSink = { emit: (e) => events.push(e) };
    const mgr = new AutoSnapshotManager({ auditSink: sink });
    await mgr.save({
      version: 0,
      governanceIrHash: 'h0',
      fileHashes: {},
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe('workspace');
    // Default policyVersion is 'unknown' when the option is omitted.
    expect(events[0]?.policyVersion).toBe('unknown');
  });
});

describe('AutoSnapshotManager — toAutoSnapshot rejection matrix (via load)', () => {
  let root: string;
  let dir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'auto-snap-reject-'));
    dir = AutoSnapshotManager.dir(root);
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function writeRaw(name: string, body: unknown): Promise<void> {
    await writeFile(join(dir, name), JSON.stringify(body), 'utf-8');
  }

  it('rejects null JSON bodies', async () => {
    await writeRaw('a.json', null);
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects non-object JSON bodies', async () => {
    await writeRaw('a.json', 42);
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries with a non-integer version', async () => {
    await writeRaw('a.json', {
      version: 1.5,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries with a negative version', async () => {
    await writeRaw('a.json', {
      version: -1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries with a non-string timestamp', async () => {
    await writeRaw('a.json', {
      version: 1,
      timestamp: 12345,
      governanceIrHash: 'h',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries with a non-string governanceIrHash', async () => {
    await writeRaw('a.json', {
      version: 1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: null,
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries with a non-string trigger', async () => {
    await writeRaw('a.json', {
      version: 1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h',
      fileHashes: {},
      trigger: 7,
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries where fileHashes is null', async () => {
    await writeRaw('a.json', {
      version: 1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h',
      fileHashes: null,
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries where fileHashes is not an object', async () => {
    await writeRaw('a.json', {
      version: 1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h',
      fileHashes: 'not-an-object',
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('rejects entries where a fileHashes value is not a string', async () => {
    await writeRaw('a.json', {
      version: 1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h',
      fileHashes: { 'SOUL.md': 42 },
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(0);
  });

  it('accepts all three recognised trigger strings', async () => {
    await writeRaw('1.json', {
      version: 1,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h1',
      fileHashes: {},
      trigger: 'oc_runtime',
    });
    await writeRaw('2.json', {
      version: 2,
      timestamp: '2026-04-17T10:05:00.000Z',
      governanceIrHash: 'h2',
      fileHashes: {},
      trigger: 'external_edit',
    });
    await writeRaw('3.json', {
      version: 3,
      timestamp: '2026-04-17T10:10:00.000Z',
      governanceIrHash: 'h3',
      fileHashes: {},
      trigger: 'onedrive_sync',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(3);
  });

  it('load() uses version as a tiebreak when two entries share a timestamp', async () => {
    const ts = '2026-04-17T10:00:00.000Z';
    await writeRaw('5.json', {
      version: 5,
      timestamp: ts,
      governanceIrHash: 'h5',
      fileHashes: {},
      trigger: 'external_edit',
    });
    await writeRaw('2.json', {
      version: 2,
      timestamp: ts,
      governanceIrHash: 'h2',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    // Same timestamp → lower version first in load order.
    expect(mgr.list().map((e) => e.version)).toEqual([2, 5]);
  });

  it('findNearestByTimestamp skips entries whose stored timestamp is unparseable', async () => {
    // Plant a valid-timestamp entry alongside one with a NaN timestamp on disk,
    // rehydrate via load(), then query. The NaN entry must be ignored by the
    // scan and the valid entry returned.
    await writeRaw('3.json', {
      version: 3,
      timestamp: '2026-04-17T10:00:00.000Z',
      governanceIrHash: 'h3',
      fileHashes: {},
      trigger: 'external_edit',
    });
    await writeRaw('4.json', {
      version: 4,
      timestamp: 'not-a-date',
      governanceIrHash: 'h4',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    expect(mgr.size()).toBe(2);
    const found = mgr.findNearestByTimestamp('2026-04-17T12:00:00.000Z');
    expect(found?.version).toBe(3);
  });

  it('findNearestByTimestamp keeps the earlier-scanned best when a later entry has an equal or larger delta', async () => {
    // Save two entries where the later-scanned one is *older* (larger delta)
    // than the first. The best must stay pinned to the first.
    const mgr = new AutoSnapshotManager();
    await mgr.save({
      version: 1,
      governanceIrHash: 'h1',
      fileHashes: {},
      trigger: 'external_edit',
      timestamp: '2026-04-17T11:00:00.000Z',
    });
    await mgr.save({
      version: 2,
      governanceIrHash: 'h2',
      fileHashes: {},
      trigger: 'external_edit',
      timestamp: '2026-04-17T10:00:00.000Z',
    });
    const found = mgr.findNearestByTimestamp('2026-04-17T11:30:00.000Z');
    // v1 @ 11:00 is closer to 11:30 than v2 @ 10:00.
    expect(found?.version).toBe(1);
  });

  it('load() falls back to version ordering when timestamps are unparseable', async () => {
    await writeRaw('9.json', {
      version: 9,
      timestamp: 'not-a-date-a',
      governanceIrHash: 'h9',
      fileHashes: {},
      trigger: 'external_edit',
    });
    await writeRaw('4.json', {
      version: 4,
      timestamp: 'not-a-date-b',
      governanceIrHash: 'h4',
      fileHashes: {},
      trigger: 'external_edit',
    });
    const mgr = new AutoSnapshotManager({ workspaceRoot: root });
    await mgr.load();
    // Both timestamps unparseable → sort falls through to version compare.
    expect(mgr.list().map((e) => e.version)).toEqual([4, 9]);
  });
});
